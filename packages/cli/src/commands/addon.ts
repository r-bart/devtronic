import { resolve, join, dirname } from 'node:path';
import { existsSync, unlinkSync, rmSync } from 'node:fs';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { AddonName, AddonOptions } from '../types.js';
import { ADDONS } from '../types.js';
import {
  readManifest,
  writeManifest,
  readFile,
  writeFile,
  getAllFilesRecursive,
  ensureDir,
  calculateChecksum,
  createManifestEntry,
} from '../utils/files.js';
import { introTitle, symbols } from '../utils/ui.js';
import { getCliVersion } from '../utils/version.js';
import { generatePluginJson, generateMarketplaceJson, PLUGIN_DIR } from '../generators/plugin.js';
import { TEMPLATES_DIR } from './init.js';
import { getAddonSourceDir, getAvailableAddons, getAddonManifest } from '../addons/registry.js';
import { readAddonConfig, writeAddonToConfig, removeAddonFromConfig } from '../utils/addonConfig.js';
import { generateAddonFiles, removeAddonFiles, syncAddonFiles, detectModifiedAddonFiles } from '../generators/addonFiles.js';

/**
 * Returns true if the addon uses the file-based system.
 * orchestration → plugin mode (legacy)
 * design-best-practices, auto-devtronic → file-based mode
 */
function isFileBasedAddon(addonName: AddonName): boolean {
  return addonName !== 'orchestration';
}

export async function addonCommand(
  action: 'add' | 'remove' | 'enable' | 'disable',
  addonName: string,
  options: AddonOptions
): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle(`Addon ${action}`));

  // Validate addon name
  const validAddons = Object.keys(ADDONS) as AddonName[];
  if (!validAddons.includes(addonName as AddonName)) {
    p.cancel(`Unknown addon: ${addonName}\n\nValid addons: ${validAddons.join(', ')}`);
    process.exit(1);
  }

  const typedName = addonName as AddonName;

  // Map deprecated actions (enable/disable) to canonical names (add/remove)
  const canonicalAction: 'add' | 'remove' =
    action === 'enable' ? 'add' : action === 'disable' ? 'remove' : action;
  if (action === 'enable' || action === 'disable') {
    const canonical = action === 'enable' ? 'add' : 'remove';
    p.log.warn(
      `"addon ${action}" is deprecated. Use "addon ${canonical}" instead.`
    );
  }

  // File-based addons (design-best-practices) use the new system
  if (isFileBasedAddon(typedName)) {
    if (canonicalAction === 'add') {
      await addFileBasedAddon(targetDir, typedName, options);
    } else {
      await removeFileBasedAddon(targetDir, typedName, options);
    }
    return;
  }

  // Plugin-based addons (orchestration) use the legacy system
  const manifest = readManifest(targetDir);
  if (!manifest) {
    p.log.warn('No devtronic installation found.');
    p.log.info('Run `npx devtronic init` first.');
    p.outro('');
    return;
  }

  if (manifest.installMode !== 'plugin' && manifest.installMode !== 'marketplace') {
    p.log.warn('The orchestration addon requires Claude Code in plugin or marketplace mode.');
    p.log.info('Run `npx devtronic init` with Claude Code selected.');
    p.outro('');
    return;
  }

  const addon = ADDONS[typedName];
  const currentAddons: AddonName[] = manifest.projectConfig?.enabledAddons ?? [];

  if (canonicalAction === 'add') {
    await addAddon(targetDir, manifest, addon.name, currentAddons);
  } else {
    await removeAddon(targetDir, manifest, addon.name, currentAddons);
  }
}

async function addAddon(
  targetDir: string,
  manifest: NonNullable<ReturnType<typeof readManifest>>,
  addonName: AddonName,
  currentAddons: AddonName[]
): Promise<void> {
  if (currentAddons.includes(addonName)) {
    p.log.warn(`Addon "${addonName}" is already enabled.`);
    p.outro('');
    return;
  }

  // Marketplace mode: orchestration skills are already in the marketplace repo
  if (manifest.installMode === 'marketplace') {
    const addon = ADDONS[addonName];
    p.note(
      [
        `  ${chalk.dim('Name:')}        ${addon.label}`,
        `  ${chalk.dim('Description:')} ${addon.description}`,
        `  ${chalk.dim('Skills:')}      ${addon.skills.map((s) => chalk.cyan(`/${s}`)).join(', ')}`,
      ].join('\n'),
      'Enabling addon'
    );

    if (!manifest.projectConfig) {
      manifest.projectConfig = { architecture: 'flat', layers: [], stateManagement: [], dataFetching: [], orm: [], testing: [], ui: [], validation: [], framework: 'unknown', qualityCommand: '' };
    }
    manifest.projectConfig.enabledAddons = [...currentAddons, addonName];
    writeManifest(targetDir, manifest);

    p.log.success(`${addon.label} enabled`);
    p.note(
      'Orchestration skills are included in the marketplace plugin.\nAlready available as /devtronic:briefing, /devtronic:recap, /devtronic:handoff.',
      'Info'
    );
    p.outro('');
    return;
  }

  const addon = ADDONS[addonName];
  const pluginRoot = manifest.pluginPath!;
  const skillsSourceDir = join(TEMPLATES_DIR, 'claude-code', '.claude', 'skills');

  p.note(
    [
      `  ${chalk.dim('Name:')}        ${addon.label}`,
      `  ${chalk.dim('Description:')} ${addon.description}`,
      `  ${chalk.dim('Skills:')}      ${addon.skills.map((s) => chalk.cyan(`/${s}`)).join(', ')}`,
      `  ${chalk.dim('Subagents:')}   ${addon.agents.length ? addon.agents.join(', ') : chalk.dim('—')}`,
    ].join('\n'),
    'Adding addon'
  );

  const confirmed = await p.confirm({ message: `Add ${addonName}?` });
  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Addon installation cancelled.');
    process.exit(0);
  }

  const spinner = p.spinner();
  spinner.start(`Adding ${addon.label}...`);

  const addedFiles: string[] = [];

  // Copy each skill directory for this addon
  for (const skillDir of addon.skills) {
    const sourceDir = join(skillsSourceDir, skillDir);
    if (!existsSync(sourceDir)) {
      spinner.stop(`Template not found for skill: ${skillDir}`);
      p.log.warn(`Skipping ${skillDir} — template not found.`);
      continue;
    }

    const templateFiles = getAllFilesRecursive(sourceDir);
    for (const file of templateFiles) {
      const content = readFile(join(sourceDir, file));
      const destRelPath = join(pluginRoot, 'skills', skillDir, file);
      const destAbsPath = join(targetDir, destRelPath);
      ensureDir(dirname(destAbsPath));
      writeFile(destAbsPath, content);
      manifest.files[destRelPath] = createManifestEntry(content);
      addedFiles.push(destRelPath);
    }
  }

  // Update plugin.json and marketplace.json with new skill count
  const newAddons = [...currentAddons, addonName];
  const addonSkillCount = newAddons.flatMap((a) => ADDONS[a]?.skills ?? []).length;
  updateDescriptors(targetDir, manifest, pluginRoot, addonSkillCount);

  // Persist addon in config
  if (!manifest.projectConfig) {
    manifest.projectConfig = { architecture: 'flat', layers: [], stateManagement: [], dataFetching: [], orm: [], testing: [], ui: [], validation: [], framework: 'unknown', qualityCommand: '' };
  }
  manifest.projectConfig.enabledAddons = newAddons;
  writeManifest(targetDir, manifest);

  spinner.stop(`${symbols.pass} ${addon.label} added`);

  p.note(
    addon.skills.map((s) => `  ${chalk.cyan(`/${s}`)}`).join('\n'),
    'New skills available'
  );

  p.outro('Done. Restart Claude Code to load the new skills.');
}

async function removeAddon(
  targetDir: string,
  manifest: NonNullable<ReturnType<typeof readManifest>>,
  addonName: AddonName,
  currentAddons: AddonName[]
): Promise<void> {
  if (!currentAddons.includes(addonName)) {
    p.log.warn(`Addon "${addonName}" is not currently enabled.`);
    p.outro('');
    return;
  }

  // Marketplace mode: just remove from enabledAddons, no local files to delete
  if (manifest.installMode === 'marketplace') {
    const addon = ADDONS[addonName];
    manifest.projectConfig!.enabledAddons = currentAddons.filter((a) => a !== addonName);
    writeManifest(targetDir, manifest);
    p.log.success(`${addon.label} disabled`);
    p.outro('');
    return;
  }

  const addon = ADDONS[addonName];
  const pluginRoot = manifest.pluginPath!;

  p.note(
    [
      `  ${chalk.dim('Name:')}        ${addon.label}`,
      `  ${chalk.dim('Description:')} ${addon.description}`,
      `  ${chalk.dim('Skills:')}      ${addon.skills.map((s) => chalk.dim(`/${s}`)).join(', ')}`,
      `  ${chalk.dim('Subagents:')}   ${addon.agents.length ? addon.agents.join(', ') : chalk.dim('—')}`,
    ].join('\n'),
    'Removing addon'
  );

  const confirmed = await p.confirm({ message: `Remove ${addonName}?` });
  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Addon removal cancelled.');
    process.exit(0);
  }

  // Check for user-modified files before removing
  const modifiedFiles: string[] = [];
  for (const skillDir of addon.skills) {
    const skillRelBase = join(pluginRoot, 'skills', skillDir);
    for (const [filePath, fileInfo] of Object.entries(manifest.files)) {
      if (!filePath.startsWith(skillRelBase)) continue;
      const absPath = join(targetDir, filePath);
      if (!existsSync(absPath)) continue;
      const current = calculateChecksum(readFile(absPath));
      if (current !== fileInfo.originalChecksum) {
        modifiedFiles.push(filePath);
      }
    }
  }

  if (modifiedFiles.length > 0) {
    p.log.warn('The following files have been modified:');
    for (const f of modifiedFiles) {
      p.log.message(`  ${chalk.yellow(f)}`);
    }
    const confirm = await p.confirm({
      message: 'Remove them anyway? (changes will be lost)',
    });
    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Addon removal cancelled.');
      process.exit(0);
    }
  }

  const spinner = p.spinner();
  spinner.start(`Removing ${addon.label}...`);

  // Delete skill directories and remove from manifest
  for (const skillDir of addon.skills) {
    const skillRelBase = join(pluginRoot, 'skills', skillDir);
    const skillAbsDir = join(targetDir, skillRelBase);

    // Remove from manifest
    for (const filePath of Object.keys(manifest.files)) {
      if (filePath.startsWith(skillRelBase)) {
        const absPath = join(targetDir, filePath);
        if (existsSync(absPath)) unlinkSync(absPath);
        delete manifest.files[filePath];
      }
    }

    // Remove empty skill directory
    if (existsSync(skillAbsDir)) {
      try { rmSync(skillAbsDir, { recursive: true }); } catch { /* ignore */ }
    }
  }

  // Update plugin.json and marketplace.json with new skill count
  const newAddons = currentAddons.filter((a) => a !== addonName);
  const addonSkillCount = newAddons.flatMap((a) => ADDONS[a as AddonName]?.skills ?? []).length;
  updateDescriptors(targetDir, manifest, pluginRoot, addonSkillCount);

  // Persist updated config
  manifest.projectConfig!.enabledAddons = newAddons;
  writeManifest(targetDir, manifest);

  spinner.stop(`${symbols.pass} ${addon.label} removed`);

  p.note(
    addon.skills.map((s) => `  ${chalk.dim(`/${s}`)}`).join('\n'),
    'Skills removed'
  );

  p.outro('Done. Restart Claude Code to apply the changes.');
}

// ─── File-Based Addon System ────────────────────────────────────────────────

async function addFileBasedAddon(
  targetDir: string,
  addonName: AddonName,
  _options: AddonOptions // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {
  const addon = ADDONS[addonName];
  const config = readAddonConfig(targetDir);

  // Already installed?
  if (config.installed[addonName]) {
    p.log.warn(`Addon "${addonName}" is already installed.`);
    p.outro('');
    return;
  }

  p.note(
    [
      `  ${chalk.dim('Name:')}        ${addon.label}`,
      `  ${chalk.dim('Description:')} ${addon.description}`,
      `  ${chalk.dim('Skills:')}      ${addon.skills.map((s) => chalk.cyan(`/${s}`)).join(', ')}`,
      addon.agents.length
        ? `  ${chalk.dim('Agents:')}      ${addon.agents.map((a) => chalk.cyan(a)).join(', ')}`
        : `  ${chalk.dim('Agents:')}      ${chalk.dim('—')}`,
    ].join('\n'),
    'Adding addon'
  );

  const confirmed = await p.confirm({ message: `Add ${addonName}?` });
  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Addon installation cancelled.');
    process.exit(0);
  }

  const spinner = p.spinner();
  spinner.start(`Adding ${addon.label}...`);

  const addonSourceDir = getAddonSourceDir(addonName);
  const result = generateAddonFiles(targetDir, addonSourceDir, config.agents);

  // Track in config
  const addonMeta = getAddonManifest(addonName);
  const fileList: string[] = [
    ...(addonMeta.files.skills ?? []).map((s: string) => `skills/${s}`),
    ...(addonMeta.files.agents ?? []).map((a: string) => `agents/${a}.md`),
    ...(addonMeta.files.rules ?? []).map((r: string) => `rules/${r}`),
  ];

  writeAddonToConfig(targetDir, addonName, {
    version: addonMeta.version,
    files: fileList,
    checksums: result.checksums ?? {},
  });

  spinner.stop(`${symbols.pass} ${addon.label} added (${result.written} files written)`);

  p.note(
    addon.skills.map((s) => `  ${chalk.cyan(`/${s}`)}`).join('\n'),
    'New skills available'
  );

  p.outro('Done. Skills are now available in your agent directories.');
}

async function removeFileBasedAddon(
  targetDir: string,
  addonName: AddonName,
  _options: AddonOptions // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {
  const addon = ADDONS[addonName];
  const config = readAddonConfig(targetDir);

  if (!config.installed[addonName]) {
    p.log.warn(`Addon "${addonName}" is not currently installed.`);
    p.outro('');
    return;
  }

  // Check for customized files
  const modified = detectModifiedAddonFiles(targetDir, addonName);
  if (modified.length > 0) {
    p.log.warn('The following files have been customized:');
    for (const f of modified) {
      p.log.message(`  ${chalk.yellow(f)}`);
    }
    const confirm = await p.confirm({
      message: 'Remove them anyway? (customizations will be lost)',
    });
    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Addon removal cancelled.');
      process.exit(0);
    }
  }

  const spinner = p.spinner();
  spinner.start(`Removing ${addon.label}...`);

  removeAddonFiles(targetDir, addonName, config.agents);
  removeAddonFromConfig(targetDir, addonName);

  spinner.stop(`${symbols.pass} ${addon.label} removed`);

  p.note(
    addon.skills.map((s) => `  ${chalk.dim(`/${s}`)}`).join('\n'),
    'Skills removed'
  );

  p.outro('Done.');
}

// ─── List & Sync Commands ───────────────────────────────────────────────────

export interface AddonListItem {
  name: string;
  label: string;
  description: string;
  installed: boolean;
  agents?: string[];
}

export function getAddonListInfo(targetDir: string): AddonListItem[] {
  const config = readAddonConfig(targetDir);
  const manifest = readManifest(targetDir);
  const manifestAddons = manifest?.projectConfig?.enabledAddons ?? [];

  return getAvailableAddons().map((addon) => ({
    name: addon.name,
    label: addon.label,
    description: addon.description,
    installed: !!config.installed[addon.name] || manifestAddons.includes(addon.name as AddonName),
    agents: config.installed[addon.name] ? config.agents : undefined,
  }));
}

export async function addonListCommand(options: AddonOptions): Promise<void> {
  const targetDir = resolve(options.path || '.');
  p.intro(introTitle('Addon List'));

  const items = getAddonListInfo(targetDir);

  const lines = items.map((item) => {
    const status = item.installed ? chalk.green('✓ installed') : chalk.dim('available');
    const agents = item.agents ? chalk.dim(` → ${item.agents.join(', ')}`) : '';
    return `  ${chalk.bold(item.name)} ${status}${agents}\n    ${chalk.dim(item.description)}`;
  });

  p.note(lines.join('\n\n'), 'Addons');
  p.outro(`Use ${chalk.cyan('devtronic addon add <name>')} to install.`);
}

export async function addonSyncCommand(options: AddonOptions): Promise<void> {
  const targetDir = resolve(options.path || '.');
  p.intro(introTitle('Addon Sync'));

  const config = readAddonConfig(targetDir);

  // Auto-register file-based addons that are in the legacy manifest but not in config
  const manifest = readManifest(targetDir);
  const manifestAddons = manifest?.projectConfig?.enabledAddons ?? [];
  for (const name of manifestAddons) {
    if (!config.installed[name] && isFileBasedAddon(name)) {
      const addonMeta = getAddonManifest(name);
      const fileList: string[] = [
        ...(addonMeta.files.skills ?? []).map((s: string) => `skills/${s}`),
        ...(addonMeta.files.agents ?? []).map((a: string) => `agents/${a}.md`),
        ...(addonMeta.files.rules ?? []).map((r: string) => `rules/${r}`),
      ];
      writeAddonToConfig(targetDir, name, {
        version: addonMeta.version,
        files: fileList,
      });
    }
  }

  // Re-read config after potential migration writes
  const freshConfig = readAddonConfig(targetDir);
  const installedNames = Object.keys(freshConfig.installed);

  if (installedNames.length === 0) {
    p.log.info('No addons installed. Nothing to sync.');
    p.outro('');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Syncing addon files...');

  let totalWritten = 0;
  let totalConflicts: string[] = [];

  for (const name of installedNames) {
    // Skip plugin-based addons — they use a different file management system
    if (!isFileBasedAddon(name as AddonName)) continue;
    const addonSourceDir = getAddonSourceDir(name as AddonName);
    const result = syncAddonFiles(targetDir, addonSourceDir, freshConfig.agents);
    totalWritten += result.written + (result.updated ?? 0);
    totalConflicts = totalConflicts.concat(result.conflicts);
  }

  spinner.stop(`${symbols.pass} Sync complete (${totalWritten} files updated)`);

  if (totalConflicts.length > 0) {
    p.log.warn('Customized files were preserved:');
    for (const f of totalConflicts) {
      p.log.message(`  ${chalk.yellow(f)}`);
    }
  }

  p.outro('Done.');
}

/**
 * Regenerates plugin.json and marketplace.json with the updated skill count.
 * These are the only descriptor files that embed skill counts.
 */
function updateDescriptors(
  targetDir: string,
  manifest: NonNullable<ReturnType<typeof readManifest>>,
  pluginRoot: string,
  addonSkillCount: number
): void {
  const cliVersion = getCliVersion();

  const pluginJsonContent = generatePluginJson(cliVersion, addonSkillCount);
  const pluginJsonRelPath = join(pluginRoot, '.claude-plugin', 'plugin.json');
  writeFile(join(targetDir, pluginJsonRelPath), pluginJsonContent);
  manifest.files[pluginJsonRelPath] = createManifestEntry(pluginJsonContent);

  const marketplaceContent = generateMarketplaceJson(addonSkillCount);
  const marketplaceRelPath = join(PLUGIN_DIR, '.claude-plugin', 'marketplace.json');
  writeFile(join(targetDir, marketplaceRelPath), marketplaceContent);
  manifest.files[marketplaceRelPath] = createManifestEntry(marketplaceContent);
}
