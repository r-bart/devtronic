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

export async function addonCommand(
  action: 'add' | 'remove',
  addonName: string,
  options: AddonOptions
): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle(`Addon ${action}`));

  // 1. Read manifest
  const manifest = readManifest(targetDir);
  if (!manifest) {
    p.log.warn('No devtronic installation found.');
    p.log.info('Run `npx devtronic init` first.');
    p.outro('');
    return;
  }

  // 2. Must be in plugin mode
  if (manifest.installMode !== 'plugin' || !manifest.pluginPath) {
    p.log.warn('Addons require Claude Code in plugin mode.');
    p.log.info('Run `npx devtronic init` with Claude Code selected.');
    p.outro('');
    return;
  }

  // 3. Validate addon name
  const validAddons = Object.keys(ADDONS) as AddonName[];
  if (!validAddons.includes(addonName as AddonName)) {
    p.cancel(`Unknown addon: ${addonName}\n\nValid addons: ${validAddons.join(', ')}`);
    process.exit(1);
  }

  const addon = ADDONS[addonName as AddonName];
  const currentAddons: AddonName[] = manifest.projectConfig?.enabledAddons ?? [];

  if (action === 'add') {
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

  const addon = ADDONS[addonName];
  const pluginRoot = manifest.pluginPath!;
  const skillsSourceDir = join(TEMPLATES_DIR, 'claude-code', '.claude', 'skills');

  p.note(
    [
      `  ${chalk.dim('Name:')}        ${addon.label}`,
      `  ${chalk.dim('Description:')} ${addon.description}`,
      `  ${chalk.dim('Skills:')}      ${addon.skills.map((s) => chalk.cyan(`/devtronic:${s}`)).join(', ')}`,
      `  ${chalk.dim('Subagents:')}   ${addon.agents.length ? addon.agents.join(', ') : chalk.dim('—')}`,
    ].join('\n'),
    'Adding addon'
  );

  const confirmed = await p.confirm({ message: 'Add this addon?' });
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
    addon.skills.map((s) => `  ${chalk.cyan(`/devtronic:${s}`)}`).join('\n'),
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

  const addon = ADDONS[addonName];
  const pluginRoot = manifest.pluginPath!;

  p.note(
    [
      `  ${chalk.dim('Name:')}        ${addon.label}`,
      `  ${chalk.dim('Description:')} ${addon.description}`,
      `  ${chalk.dim('Skills:')}      ${addon.skills.map((s) => chalk.dim(`/devtronic:${s}`)).join(', ')}`,
      `  ${chalk.dim('Subagents:')}   ${addon.agents.length ? addon.agents.join(', ') : chalk.dim('—')}`,
    ].join('\n'),
    'Removing addon'
  );

  const confirmed = await p.confirm({ message: 'Remove this addon?' });
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
    addon.skills.map((s) => `  ${chalk.dim(`/devtronic:${s}`)}`).join('\n'),
    'Skills removed'
  );

  p.outro('Done. Restart Claude Code to apply the changes.');
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
