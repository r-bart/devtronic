import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, unlinkSync, lstatSync, readdirSync, rmdirSync, chmodSync } from 'node:fs';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { UpdateOptions, Manifest, ProjectConfig } from '../types.js';
import { analyzeProject } from '../analyzers/index.js';
import {
  readManifest,
  writeManifest,
  fileExists,
  readFile,
  writeFile,
  getAllFilesRecursive,
  calculateChecksum,
  createManifestEntry,
  ensureDir,
} from '../utils/files.js';
import { ensureInteractive } from '../utils/tty.js';
import { generateAgentsMdFromConfig } from '../generators/rules.js';
import { generateArchitectureRules } from '../generators/architectureRules.js';
import { DYNAMIC_RULE_FILES } from './init.js';
import { getRuleContentForIDE } from '../utils/rules.js';
import { REMOVED_FILES, type RemovalInfo } from '../data/removals.js';
import {
  generatePlugin,
  PLUGIN_NAME,
  MARKETPLACE_NAME,
  PLUGIN_DIR,
} from '../generators/plugin.js';
import { registerPlugin } from '../utils/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// When bundled, __dirname is /packages/cli/dist, so templates is ../templates
// When running from src, __dirname is /packages/cli/src/commands, so templates is ../../templates
const TEMPLATES_DIR = existsSync(resolve(__dirname, '../templates'))
  ? resolve(__dirname, '../templates')
  : resolve(__dirname, '../../templates');

export async function updateCommand(options: UpdateOptions): Promise<void> {
  if (!options.check && !options.dryRun) {
    ensureInteractive('update');
  }

  const targetDir = resolve('.');

  p.intro(chalk.bgCyan.black(' devtronic Update '));

  // Check for existing manifest
  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.cancel('No installation found. Run `npx devtronic init` first.');
    process.exit(1);
  }

  const currentVersion = getCliVersion();
  const installedVersion = manifest.version;

  p.log.info(`Installed version: ${installedVersion}`);
  p.log.info(`Current version: ${currentVersion}`);

  // Analyze current project to detect stack changes
  const analysis = analyzeProject(targetDir);
  const stackChanges = detectStackChanges(manifest.projectConfig, analysis);

  if (stackChanges.length > 0) {
    p.note(
      stackChanges.map((c) => `  ${chalk.yellow('⚠')} ${c}`).join('\n'),
      'Stack Changes Detected'
    );

    if (!options.check) {
      const regenerate = await p.confirm({
        message: 'Regenerate rules with updated stack?',
        initialValue: true,
      });

      if (!p.isCancel(regenerate) && regenerate) {
        await regenerateWithNewStack(targetDir, manifest, analysis, options.dryRun);
        return;
      }
    }
  }

  // Detect standalone Claude Code installation that should migrate to plugin
  const shouldMigrate =
    manifest.selectedIDEs.includes('claude-code') &&
    !manifest.installMode &&
    hasStandaloneSkills(manifest);

  if (shouldMigrate) {
    p.note(
      'Claude Code skills/agents detected as standalone.\n' +
        'The new version uses plugin mode (namespace devtronic:).',
      'Migration Available'
    );

    if (!options.check) {
      const migrate = await p.confirm({
        message: 'Migrate to plugin mode? (standalone → devtronic plugin)',
        initialValue: true,
      });

      if (!p.isCancel(migrate) && migrate) {
        await migrateToPlugin(targetDir, manifest, analysis, options.dryRun);
        return;
      }
    }
  }

  if (options.check) {
    if (installedVersion === currentVersion && stackChanges.length === 0 && !shouldMigrate) {
      p.log.success('Already up to date!');
    } else if (shouldMigrate) {
      p.log.info('Plugin migration available: standalone → devtronic plugin');
    } else if (installedVersion !== currentVersion) {
      p.log.info(`Update available: ${installedVersion} → ${currentVersion}`);
    }
    p.outro('Check complete');
    return;
  }

  // Check for modified files
  const modifiedFiles: string[] = [];
  const outdatedFiles: string[] = [];

  for (const [relativePath, fileInfo] of Object.entries(manifest.files)) {
    const filePath = join(targetDir, relativePath);

    if (!fileExists(filePath)) {
      continue;
    }

    const currentContent = readFile(filePath);
    const currentChecksum = calculateChecksum(currentContent);

    if (currentChecksum !== fileInfo.originalChecksum) {
      modifiedFiles.push(relativePath);
    }
  }

  // Check which template files have updates
  for (const ide of manifest.selectedIDEs) {
    const templateDir = join(TEMPLATES_DIR, ide);
    if (!existsSync(templateDir)) continue;

    const files = getAllFilesRecursive(templateDir);
    for (const file of files) {
      const templatePath = join(templateDir, file);
      const templateContent = readFile(templatePath);
      const templateChecksum = calculateChecksum(templateContent);

      const fileInfo = manifest.files[file];
      if (fileInfo && fileInfo.checksum !== templateChecksum) {
        outdatedFiles.push(file);
      }
    }
  }

  // Detect removed files (in manifest but not in any template)
  const removedFromTemplate: Array<{ path: string; info?: RemovalInfo }> = [];

  for (const [relativePath, fileInfo] of Object.entries(manifest.files)) {
    // Skip files already marked as ignored
    if (fileInfo.ignored) continue;

    let foundInAnyTemplate = false;

    for (const ide of manifest.selectedIDEs) {
      const templateDir = join(TEMPLATES_DIR, ide);
      if (existsSync(join(templateDir, relativePath))) {
        foundInAnyTemplate = true;
        break;
      }
    }

    if (!foundInAnyTemplate) {
      const localPath = join(targetDir, relativePath);
      if (fileExists(localPath)) {
        removedFromTemplate.push({
          path: relativePath,
          info: REMOVED_FILES[relativePath],
        });
      }
    }
  }

  if (modifiedFiles.length > 0) {
    p.note(
      modifiedFiles.map((f) => `  ${chalk.yellow('●')} ${f}`).join('\n'),
      'Locally Modified Files (will be preserved)'
    );
  }

  if (outdatedFiles.length === 0 && removedFromTemplate.length === 0) {
    p.log.success('All files are up to date!');
    p.outro('No updates needed');
    return;
  }

  // Show files that will be updated
  const filesToUpdate = outdatedFiles.filter((f) => !modifiedFiles.includes(f));

  if (filesToUpdate.length > 0) {
    p.note(
      filesToUpdate.map((f) => `  ${chalk.blue('↑')} ${f}`).join('\n'),
      'Files to Update'
    );
  }

  const conflictFiles = outdatedFiles.filter((f) => modifiedFiles.includes(f));
  if (conflictFiles.length > 0) {
    p.note(
      conflictFiles.map((f) => `  ${chalk.red('⚠')} ${f}`).join('\n'),
      'Conflicts (modified locally + template updated)'
    );
  }

  // Handle removed files
  let filesToDelete: string[] = [];
  let filesToIgnore: string[] = [];

  if (removedFromTemplate.length > 0) {
    const removalDetails = removedFromTemplate
      .map((r) => {
        const icon = chalk.red('✗');
        const reason = r.info?.reason ? chalk.dim(` - ${r.info.reason}`) : '';
        return `  ${icon} ${r.path}${reason}`;
      })
      .join('\n');

    p.note(removalDetails, 'Files Removed in This Version');

    if (!options.dryRun) {
      const action = await p.select({
        message: 'What do you want to do with removed files?',
        options: [
          {
            value: 'delete',
            label: 'Delete them (recommended)',
            hint: 'Clean up obsolete files',
          },
          { value: 'keep', label: 'Keep them', hint: 'Files will be ignored in future updates' },
          { value: 'review', label: 'Review each file', hint: 'Decide file by file' },
        ],
      });

      if (p.isCancel(action)) {
        p.cancel('Update cancelled');
        process.exit(0);
      }

      if (action === 'delete') {
        filesToDelete = removedFromTemplate.map((r) => r.path);
      } else if (action === 'keep') {
        filesToIgnore = removedFromTemplate.map((r) => r.path);
      } else if (action === 'review') {
        for (const removed of removedFromTemplate) {
          const alternative = removed.info?.alternative
            ? chalk.dim(`\n  Alternative: ${removed.info.alternative}`)
            : '';

          const fileAction = await p.select({
            message: `${removed.path}${alternative}`,
            options: [
              { value: 'delete', label: 'Delete' },
              { value: 'keep', label: 'Keep (ignore in future)' },
            ],
          });

          if (p.isCancel(fileAction)) {
            p.cancel('Update cancelled');
            process.exit(0);
          }

          if (fileAction === 'delete') {
            filesToDelete.push(removed.path);
          } else {
            filesToIgnore.push(removed.path);
          }
        }
      }
    }
  }

  if (options.dryRun) {
    p.outro('Dry run complete - no changes made');
    return;
  }

  // Confirm update
  const hasUpdates = filesToUpdate.length > 0;
  const hasDeletions = filesToDelete.length > 0;
  const hasIgnores = filesToIgnore.length > 0;

  if (!hasUpdates && !hasDeletions && !hasIgnores) {
    p.log.success('No changes to apply');
    p.outro('Update complete');
    return;
  }

  const actionParts: string[] = [];
  if (hasUpdates) actionParts.push(`update ${filesToUpdate.length} files`);
  if (hasDeletions) actionParts.push(`delete ${filesToDelete.length} files`);
  if (hasIgnores) actionParts.push(`ignore ${filesToIgnore.length} files`);

  const proceed = await p.confirm({
    message: `Proceed to ${actionParts.join(', ')}?`,
    initialValue: true,
  });

  if (p.isCancel(proceed) || !proceed) {
    p.cancel('Update cancelled');
    process.exit(0);
  }

  // Apply updates
  const spinner = p.spinner();
  spinner.start('Applying updates...');

  const updatedManifest: Manifest = {
    ...manifest,
    version: currentVersion,
    implantedAt: new Date().toISOString().split('T')[0],
  };

  for (const ide of manifest.selectedIDEs) {
    const templateDir = join(TEMPLATES_DIR, ide);
    if (!existsSync(templateDir)) continue;

    const isPluginMode = ide === 'claude-code' && manifest.installMode === 'plugin';

    const files = getAllFilesRecursive(templateDir);
    for (const file of files) {
      // Skip modified files
      if (modifiedFiles.includes(file)) {
        continue;
      }

      // Skip skills and agents if plugin mode — they're in the plugin
      if (isPluginMode && (file.startsWith('.claude/skills/') || file.startsWith('.claude/agents/'))) {
        continue;
      }

      const templatePath = join(templateDir, file);
      const destPath = join(targetDir, file);
      const templateContent = readFile(templatePath);

      ensureDir(dirname(destPath));
      writeFile(destPath, templateContent);
      updatedManifest.files[file] = createManifestEntry(templateContent);
    }
  }

  // Update plugin files if in plugin mode
  if (manifest.installMode === 'plugin' && manifest.pluginPath) {
    // Save user-modified plugin files before generatePlugin overwrites them
    const userModifiedPluginFiles = new Map<string, string>();
    for (const [relPath, fileInfo] of Object.entries(updatedManifest.files)) {
      const filePath = join(targetDir, relPath);
      if (!fileExists(filePath)) continue;
      const diskContent = readFile(filePath);
      const diskChecksum = calculateChecksum(diskContent);
      if (diskChecksum !== fileInfo.originalChecksum) {
        userModifiedPluginFiles.set(relPath, diskContent);
      }
    }

    const config = manifest.projectConfig || buildDefaultConfig(analysis);
    const pluginResult = generatePlugin(
      targetDir,
      TEMPLATES_DIR,
      currentVersion,
      config,
      analysis.packageManager
    );

    // Make scripts executable
    for (const script of ['checkpoint.sh', 'stop-guard.sh']) {
      const scriptPath = join(targetDir, pluginResult.pluginPath, 'scripts', script);
      if (existsSync(scriptPath)) {
        chmodSync(scriptPath, 0o755);
      }
    }

    // Restore user-modified files that generatePlugin overwrote
    for (const [relPath, content] of userModifiedPluginFiles) {
      writeFile(join(targetDir, relPath), content);
    }

    // Only update manifest for unmodified plugin files
    for (const [relPath, newEntry] of Object.entries(pluginResult.files)) {
      if (userModifiedPluginFiles.has(relPath)) {
        continue; // User modified — keep their version
      }
      updatedManifest.files[relPath] = newEntry;
    }

    updatedManifest.pluginPath = pluginResult.pluginPath;
  }

  // Handle file deletions
  for (const filePath of filesToDelete) {
    const localPath = join(targetDir, filePath);
    if (fileExists(localPath)) {
      unlinkSync(localPath);
    }
    delete updatedManifest.files[filePath];
  }

  // Mark files as ignored
  for (const filePath of filesToIgnore) {
    if (updatedManifest.files[filePath]) {
      updatedManifest.files[filePath].ignored = true;
    }
  }

  // CLAUDE.md: migrate symlink → real file (one-time)
  const claudeMdPath = join(targetDir, 'CLAUDE.md');
  if (fileExists(claudeMdPath)) {
    const stat = lstatSync(claudeMdPath);
    if (stat.isSymbolicLink()) {
      const content = readFile(claudeMdPath);
      unlinkSync(claudeMdPath);
      writeFile(claudeMdPath, content);
      updatedManifest.files['CLAUDE.md'] = createManifestEntry(content);
      p.log.info('Migrated CLAUDE.md from symlink to independent file.');
    }
  }

  // Write updated manifest
  writeManifest(targetDir, updatedManifest);

  spinner.stop('Updates applied');

  p.outro(chalk.green(`Updated to version ${currentVersion}`));
}

/**
 * Detects changes in the project stack compared to the saved configuration
 */
function detectStackChanges(
  savedConfig: ProjectConfig | undefined,
  analysis: ReturnType<typeof analyzeProject>
): string[] {
  if (!savedConfig) return [];

  const changes: string[] = [];

  // Check state management changes
  const newStateLibs = analysis.stack.stateManagement.filter(
    (lib) => !savedConfig.stateManagement.includes(lib)
  );
  const removedStateLibs = savedConfig.stateManagement.filter(
    (lib) => !analysis.stack.stateManagement.includes(lib)
  );

  if (newStateLibs.length > 0) {
    changes.push(`Added state management: ${newStateLibs.join(', ')}`);
  }
  if (removedStateLibs.length > 0) {
    changes.push(`Removed state management: ${removedStateLibs.join(', ')}`);
  }

  // Check data fetching changes
  const newDataLibs = analysis.stack.dataFetching.filter(
    (lib) => !savedConfig.dataFetching.includes(lib)
  );
  const removedDataLibs = savedConfig.dataFetching.filter(
    (lib) => !analysis.stack.dataFetching.includes(lib)
  );

  if (newDataLibs.length > 0) {
    changes.push(`Added data fetching: ${newDataLibs.join(', ')}`);
  }
  if (removedDataLibs.length > 0) {
    changes.push(`Removed data fetching: ${removedDataLibs.join(', ')}`);
  }

  // Check ORM changes
  const newOrmLibs = analysis.stack.orm.filter((lib) => !savedConfig.orm.includes(lib));
  const removedOrmLibs = savedConfig.orm.filter((lib) => !analysis.stack.orm.includes(lib));

  if (newOrmLibs.length > 0) {
    changes.push(`Added ORM: ${newOrmLibs.join(', ')}`);
  }
  if (removedOrmLibs.length > 0) {
    changes.push(`Removed ORM: ${removedOrmLibs.join(', ')}`);
  }

  // Check testing changes
  const newTestLibs = analysis.stack.testing.filter((lib) => !savedConfig.testing.includes(lib));
  const removedTestLibs = savedConfig.testing.filter(
    (lib) => !analysis.stack.testing.includes(lib)
  );

  if (newTestLibs.length > 0) {
    changes.push(`Added testing: ${newTestLibs.join(', ')}`);
  }
  if (removedTestLibs.length > 0) {
    changes.push(`Removed testing: ${removedTestLibs.join(', ')}`);
  }

  // Check UI changes
  const newUILibs = analysis.stack.ui.filter((lib) => !savedConfig.ui.includes(lib));
  const removedUILibs = savedConfig.ui.filter((lib) => !analysis.stack.ui.includes(lib));

  if (newUILibs.length > 0) {
    changes.push(`Added UI: ${newUILibs.join(', ')}`);
  }
  if (removedUILibs.length > 0) {
    changes.push(`Removed UI: ${removedUILibs.join(', ')}`);
  }

  // Check validation changes
  const newValidationLibs = analysis.stack.validation.filter(
    (lib) => !savedConfig.validation.includes(lib)
  );
  const removedValidationLibs = savedConfig.validation.filter(
    (lib) => !analysis.stack.validation.includes(lib)
  );

  if (newValidationLibs.length > 0) {
    changes.push(`Added validation: ${newValidationLibs.join(', ')}`);
  }
  if (removedValidationLibs.length > 0) {
    changes.push(`Removed validation: ${removedValidationLibs.join(', ')}`);
  }

  return changes;
}

/**
 * Regenerates configuration with the new detected stack
 */
async function regenerateWithNewStack(
  targetDir: string,
  manifest: Manifest,
  analysis: ReturnType<typeof analyzeProject>,
  dryRun?: boolean
): Promise<void> {
  // Build updated config from analysis
  const pm = analysis.packageManager || 'npm';
  const run = pm === 'npm' ? 'npm run' : pm;

  const qualityParts: string[] = [];
  if (analysis.scripts.typecheck) qualityParts.push(`${run} typecheck`);
  if (analysis.scripts.lint) qualityParts.push(`${run} lint`);
  if (analysis.scripts.test) qualityParts.push(`${run} test`);

  const newConfig: ProjectConfig = {
    architecture: manifest.projectConfig?.architecture || analysis.architecture.pattern,
    layers: manifest.projectConfig?.layers || analysis.architecture.layers,
    stateManagement: analysis.stack.stateManagement,
    dataFetching: analysis.stack.dataFetching,
    orm: analysis.stack.orm,
    testing: analysis.stack.testing,
    ui: analysis.stack.ui,
    validation: analysis.stack.validation,
    framework: analysis.framework.name,
    qualityCommand:
      qualityParts.length > 0 ? qualityParts.join(' && ') : `${run} typecheck && ${run} lint`,
  };

  // Show what will change
  console.log('');
  console.log(chalk.bold('New configuration:'));
  console.log(`  State: ${chalk.cyan(newConfig.stateManagement.join(', ') || 'none')}`);
  console.log(`  Data: ${chalk.cyan(newConfig.dataFetching.join(', ') || 'none')}`);
  console.log(`  ORM: ${chalk.cyan(newConfig.orm.join(', ') || 'none')}`);
  console.log(`  Testing: ${chalk.cyan(newConfig.testing.join(', ') || 'none')}`);
  console.log('');

  if (dryRun) {
    p.log.info('Dry run - no changes made');
    p.outro('Dry run complete');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Regenerating with new stack...');

  const regeneratedFiles: string[] = [];

  // Regenerate AGENTS.md
  const agentsMdPath = join(targetDir, 'AGENTS.md');
  if (fileExists(agentsMdPath)) {
    const agentsMdContent = generateAgentsMdFromConfig(
      newConfig,
      analysis.scripts,
      analysis.packageManager
    );
    writeFile(agentsMdPath, agentsMdContent);
    regeneratedFiles.push('AGENTS.md');
    manifest.files['AGENTS.md'] = createManifestEntry(agentsMdContent);
  }

  // CLAUDE.md: migrate symlink → real file (one-time)
  const claudeMdPath = join(targetDir, 'CLAUDE.md');
  if (fileExists(claudeMdPath)) {
    const stat = lstatSync(claudeMdPath);
    if (stat.isSymbolicLink()) {
      const content = readFile(claudeMdPath);
      unlinkSync(claudeMdPath);
      writeFile(claudeMdPath, content);
      manifest.files['CLAUDE.md'] = createManifestEntry(content);
      p.log.info('Migrated CLAUDE.md from symlink to independent file.');
    }
  }

  // Regenerate architecture rules
  const generatedRules = generateArchitectureRules(newConfig);

  for (const ide of manifest.selectedIDEs) {
    const ruleContent = getRuleContentForIDE(ide, generatedRules);
    const rulePath = DYNAMIC_RULE_FILES[ide]?.[0];

    if (ruleContent && rulePath) {
      const destPath = join(targetDir, rulePath);
      ensureDir(dirname(destPath));
      writeFile(destPath, ruleContent);
      regeneratedFiles.push(rulePath);
      manifest.files[rulePath] = createManifestEntry(ruleContent);
    }
  }

  // Regenerate plugin files if in plugin mode (hooks depend on config/PM)
  if (manifest.installMode === 'plugin' && manifest.pluginPath) {
    // Save user-modified plugin files before generatePlugin overwrites them
    const userModifiedPluginFiles = new Map<string, string>();
    for (const [relPath, fileInfo] of Object.entries(manifest.files)) {
      const filePath = join(targetDir, relPath);
      if (!fileExists(filePath)) continue;
      const diskContent = readFile(filePath);
      const diskChecksum = calculateChecksum(diskContent);
      if (diskChecksum !== fileInfo.originalChecksum) {
        userModifiedPluginFiles.set(relPath, diskContent);
      }
    }

    const pluginResult = generatePlugin(
      targetDir,
      TEMPLATES_DIR,
      getCliVersion(),
      newConfig,
      analysis.packageManager
    );

    for (const script of ['checkpoint.sh', 'stop-guard.sh']) {
      const scriptPath = join(targetDir, pluginResult.pluginPath, 'scripts', script);
      if (existsSync(scriptPath)) {
        chmodSync(scriptPath, 0o755);
      }
    }

    // Restore user-modified files that generatePlugin overwrote
    for (const [relPath, content] of userModifiedPluginFiles) {
      writeFile(join(targetDir, relPath), content);
    }

    // Only update manifest for unmodified plugin files
    for (const [relPath, newEntry] of Object.entries(pluginResult.files)) {
      if (userModifiedPluginFiles.has(relPath)) {
        continue; // User modified — keep their version
      }
      manifest.files[relPath] = newEntry;
    }
    regeneratedFiles.push('Plugin hooks & scripts (devtronic)');
  }

  // Update manifest
  manifest.projectConfig = newConfig;
  manifest.version = getCliVersion();
  manifest.implantedAt = new Date().toISOString().split('T')[0];
  writeManifest(targetDir, manifest);

  spinner.stop('Regeneration complete');

  p.note(
    regeneratedFiles.map((f) => `  ${chalk.magenta('★')} ${f}`).join('\n'),
    'Regenerated'
  );

  p.outro(chalk.green('Updated with new stack!'));
}

function getCliVersion(): string {
  try {
    const packageJsonPath = resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/**
 * Checks if the manifest contains standalone skills/agents in .claude/
 */
export function hasStandaloneSkills(manifest: Manifest): boolean {
  return Object.keys(manifest.files).some(
    (f) => f.startsWith('.claude/skills/') || f.startsWith('.claude/agents/')
  );
}

/**
 * Migrates a standalone Claude Code installation to plugin mode.
 * - Generates devtronic plugin in .claude-plugins/
 * - Registers plugin in .claude/settings.json
 * - Removes unmodified standalone skills/agents
 * - Preserves user-modified files
 */
async function migrateToPlugin(
  targetDir: string,
  manifest: Manifest,
  analysis: ReturnType<typeof analyzeProject>,
  dryRun?: boolean
): Promise<void> {
  if (dryRun) {
    p.log.info('Would migrate standalone skills/agents to devtronic plugin.');
    p.outro('Dry run complete — no changes made');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Migrating to plugin mode...');

  const config = manifest.projectConfig || buildDefaultConfig(analysis);

  // 1. Generate plugin
  const pluginResult = generatePlugin(
    targetDir,
    TEMPLATES_DIR,
    getCliVersion(),
    config,
    analysis.packageManager
  );

  // Make scripts executable
  for (const script of ['checkpoint.sh', 'stop-guard.sh']) {
    const scriptPath = join(targetDir, pluginResult.pluginPath, 'scripts', script);
    if (existsSync(scriptPath)) {
      chmodSync(scriptPath, 0o755);
    }
  }

  // 2. Register plugin in .claude/settings.json
  registerPlugin(targetDir, PLUGIN_NAME, MARKETPLACE_NAME, PLUGIN_DIR);

  // 3. Remove standalone skills/agents (only unmodified ones)
  const removed: string[] = [];
  const preserved: string[] = [];

  for (const [path, fileInfo] of Object.entries(manifest.files)) {
    if (!path.startsWith('.claude/skills/') && !path.startsWith('.claude/agents/')) continue;
    const filePath = join(targetDir, path);
    if (!fileExists(filePath)) continue;

    const current = calculateChecksum(readFile(filePath));
    if (current === fileInfo.originalChecksum) {
      unlinkSync(filePath);
      delete manifest.files[path];
      removed.push(path);
    } else {
      preserved.push(path);
    }
  }

  // 4. Clean empty directories
  cleanEmptyDirs(join(targetDir, '.claude', 'skills'));
  cleanEmptyDirs(join(targetDir, '.claude', 'agents'));

  // 5. Update manifest
  Object.assign(manifest.files, pluginResult.files);
  manifest.installMode = 'plugin';
  manifest.pluginPath = pluginResult.pluginPath;
  manifest.version = getCliVersion();
  manifest.implantedAt = new Date().toISOString().split('T')[0];
  writeManifest(targetDir, manifest);

  spinner.stop('Migration complete');

  // 6. Output summary
  if (removed.length > 0) {
    p.note(
      removed.map((f) => `  ${chalk.red('✗')} ${f}`).join('\n'),
      'Standalone files removed'
    );
  }
  if (preserved.length > 0) {
    p.note(
      preserved.map((f) => `  ${chalk.yellow('●')} ${f} (modified — preserved)`).join('\n'),
      'User-modified files preserved'
    );
  }
  p.note(
    `  Plugin: ${chalk.cyan('devtronic')} at .claude-plugins/devtronic/\n` +
      `  Skills: /devtronic:brief, /devtronic:spec, ...\n` +
      `  Hooks: 5 workflow hooks enabled`,
    'Plugin Generated'
  );

  p.outro(chalk.green('Migrated to plugin mode!'));
}

/**
 * Builds a default ProjectConfig from analysis when manifest.projectConfig is missing.
 */
export function buildDefaultConfig(analysis: ReturnType<typeof analyzeProject>): ProjectConfig {
  const pm = analysis.packageManager || 'npm';
  const run = pm === 'npm' ? 'npm run' : pm;

  const qualityParts: string[] = [];
  if (analysis.scripts.typecheck) qualityParts.push(`${run} typecheck`);
  if (analysis.scripts.lint) qualityParts.push(`${run} lint`);
  if (analysis.scripts.test) qualityParts.push(`${run} test`);

  return {
    architecture: analysis.architecture.pattern,
    layers: analysis.architecture.layers,
    stateManagement: analysis.stack.stateManagement,
    dataFetching: analysis.stack.dataFetching,
    orm: analysis.stack.orm,
    testing: analysis.stack.testing,
    ui: analysis.stack.ui,
    validation: analysis.stack.validation,
    framework: analysis.framework.name,
    qualityCommand:
      qualityParts.length > 0 ? qualityParts.join(' && ') : `${run} typecheck && ${run} lint`,
  };
}

/**
 * Recursively removes empty directories from leaf to root.
 */
export function cleanEmptyDirs(dirPath: string): void {
  if (!existsSync(dirPath)) return;

  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    if (existsSync(fullPath) && lstatSync(fullPath).isDirectory()) {
      cleanEmptyDirs(fullPath);
    }
  }

  // Re-read after recursive cleanup
  const remaining = readdirSync(dirPath);
  if (remaining.length === 0) {
    rmdirSync(dirPath);
  }
}
