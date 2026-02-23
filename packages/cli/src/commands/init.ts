import { existsSync, readFileSync, chmodSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type {
  IDE,
  InitOptions,
  Manifest,
  ConflictResolution,
  ProjectConfig,
} from '../types.js';
import { PRESETS } from '../types.js';
import { analyzeProject } from '../analyzers/index.js';
import { getExistingConfigsList } from '../analyzers/existingConfigs.js';
import {
  promptForIDEs,
  promptForConflictResolution,
  promptForThoughtsDir,
  promptForAgentsMd,
} from '../prompts/init.js';
import { promptForProjectConfig } from '../prompts/analysis.js';
import {
  fileExists,
  readFile,
  writeFile,
  ensureDir,
  getAllFilesRecursive,
  writeManifest,
  createManifestEntry,
  readManifest,
} from '../utils/files.js';
import { getMergeStrategy, mergeFile } from '../utils/merge.js';
import { ensureInteractive } from '../utils/tty.js';
import { generateAgentsMdFromConfig, generateClaudeMd } from '../generators/rules.js';
import { generateArchitectureRules } from '../generators/architectureRules.js';
import { getRuleContentForIDE } from '../utils/rules.js';
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

const IDE_TEMPLATE_MAP: Record<IDE, string> = {
  'claude-code': 'claude-code',
  cursor: 'cursor',
  antigravity: 'antigravity',
  'github-copilot': 'github-copilot',
};

// Files that should be generated dynamically instead of copied from templates
const DYNAMIC_RULE_FILES: Record<IDE, string[]> = {
  'claude-code': ['.claude/rules/architecture.md'],
  cursor: ['.cursor/rules/architecture.mdc'],
  antigravity: ['.agent/rules/architecture.md'],
  'github-copilot': [], // Copilot uses single file, handled separately
};

const THOUGHTS_DIRS = [
  'thoughts/specs',
  'thoughts/research',
  'thoughts/plans',
  'thoughts/checkpoints',
  'thoughts/notes',
  'thoughts/debug',
  'thoughts/audit',
  'thoughts/archive/backlog',
];

export async function initCommand(options: InitOptions): Promise<void> {
  if (!options.yes && !options.preview) {
    ensureInteractive('init');
  }

  const targetDir = resolve(options.path || '.');

  p.intro(chalk.bgCyan.black(' rbartronic '));

  // Validate target directory
  if (!existsSync(targetDir)) {
    p.cancel(`Directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  // Check for existing manifest
  const existingManifest = readManifest(targetDir);
  if (existingManifest && !options.preview) {
    p.note(
      `Version ${existingManifest.version} installed on ${existingManifest.implantedAt}`,
      'Already Configured'
    );

    if (!options.yes) {
      const proceed = await p.confirm({
        message: 'Re-run initialization?',
        initialValue: false,
      });

      if (p.isCancel(proceed) || !proceed) {
        p.cancel('Initialization cancelled');
        process.exit(0);
      }
    }
  }

  // Analyze project
  const spinner = p.spinner();
  spinner.start('Analyzing project...');

  const analysis = analyzeProject(targetDir);

  spinner.stop('Project analyzed');

  // Get project configuration (from preset, interactive, or defaults)
  let projectConfig: ProjectConfig;

  if (options.preset) {
    // Use preset configuration
    const preset = PRESETS[options.preset];
    if (!preset) {
      p.cancel(`Unknown preset: ${options.preset}`);
      process.exit(1);
    }

    p.log.info(`Using preset: ${chalk.cyan(preset.description)}`);

    projectConfig = buildProjectConfigFromPreset(preset.config, analysis);
  } else {
    // Get confirmed project configuration (interactive or use defaults)
    const projectConfigResult = await promptForProjectConfig(analysis, !!options.yes);
    if (p.isCancel(projectConfigResult)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }
    projectConfig = projectConfigResult;
  }

  // Select IDEs
  let selectedIDEs: IDE[];

  if (options.ide) {
    // Parse from CLI option
    selectedIDEs = options.ide.split(',').map((s) => s.trim()) as IDE[];
    p.log.info(`IDEs from CLI: ${selectedIDEs.join(', ')}`);
  } else if (options.yes) {
    // Default to claude-code in non-interactive mode
    selectedIDEs = ['claude-code'];
    p.log.info(`IDEs: claude-code (default)`);
  } else {
    const ideSelection = await promptForIDEs(analysis.existingConfigs);
    if (p.isCancel(ideSelection)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }
    selectedIDEs = ideSelection;
  }

  // Preview mode - show what would be generated
  if (options.preview) {
    await showPreview(targetDir, selectedIDEs, projectConfig, analysis);
    return;
  }

  // Determine conflict resolution for each IDE with existing config
  const existingIDEs = getExistingConfigsList(analysis.existingConfigs);
  const conflictResolutions: Map<IDE, ConflictResolution> = new Map();

  for (const ide of selectedIDEs) {
    if (existingIDEs.includes(ide)) {
      if (options.yes) {
        // Default to merge in non-interactive mode
        conflictResolutions.set(ide, 'merge');
      } else {
        const resolution = await promptForConflictResolution(ide);
        if (p.isCancel(resolution)) {
          p.cancel('Operation cancelled');
          process.exit(0);
        }
        conflictResolutions.set(ide, resolution);
      }
    }
  }

  // Ask about AGENTS.md
  const hasAgentsMd = fileExists(join(targetDir, 'AGENTS.md'));
  let createAgentsMd = !hasAgentsMd;

  if (!hasAgentsMd && !options.yes) {
    const agentsMdResponse = await promptForAgentsMd();
    if (p.isCancel(agentsMdResponse)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }
    createAgentsMd = agentsMdResponse;
  }

  // Ask about thoughts directory
  const hasThoughtsDir = existsSync(join(targetDir, 'thoughts'));
  let createThoughtsDir = !hasThoughtsDir;

  if (!hasThoughtsDir && !options.yes) {
    const thoughtsDirResponse = await promptForThoughtsDir();
    if (p.isCancel(thoughtsDirResponse)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }
    createThoughtsDir = thoughtsDirResponse;
  }

  // Apply configuration
  spinner.start('Generating personalized configuration...');

  try {
  // Generate dynamic rules based on confirmed config
  const generatedRules = generateArchitectureRules(projectConfig);

  const manifest: Manifest = {
    version: getCliVersion(),
    implantedAt: new Date().toISOString().split('T')[0],
    selectedIDEs,
    projectConfig,
    files: {},
  };

  const appliedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const mergedFiles: string[] = [];
  const generatedFiles: string[] = [];

  // Plugin mode: when claude-code is selected, generate a plugin instead
  // of copying skills/agents as standalone files into .claude/
  const usePluginMode = selectedIDEs.includes('claude-code');

  if (usePluginMode) {
    const pluginResult = generatePlugin(
      targetDir,
      TEMPLATES_DIR,
      getCliVersion(),
      projectConfig,
      analysis.packageManager
    );

    // Make scripts executable
    for (const script of ['checkpoint.sh', 'stop-guard.sh']) {
      const scriptPath = join(targetDir, pluginResult.pluginPath, 'scripts', script);
      if (existsSync(scriptPath)) {
        chmodSync(scriptPath, 0o755);
      }
    }

    // Register plugin in .claude/settings.json
    registerPlugin(targetDir, PLUGIN_NAME, MARKETPLACE_NAME, PLUGIN_DIR);

    // Add plugin files to manifest
    Object.assign(manifest.files, pluginResult.files);
    manifest.installMode = 'plugin';
    manifest.pluginPath = pluginResult.pluginPath;

    generatedFiles.push(`Plugin ${PLUGIN_NAME} (16 skills, 7 agents, 5 hooks)`);
  }

  // Copy IDE templates (except dynamic rule files)
  for (const ide of selectedIDEs) {
    const templateName = IDE_TEMPLATE_MAP[ide];
    const templateDir = join(TEMPLATES_DIR, templateName);

    if (!existsSync(templateDir)) {
      p.log.warn(`Template not found: ${templateName}`);
      continue;
    }

    const resolution = conflictResolutions.get(ide) || 'overwrite';
    const files = getAllFilesRecursive(templateDir);
    const dynamicFiles = DYNAMIC_RULE_FILES[ide] || [];

    for (const file of files) {
      // Skip dynamic rule files - we'll generate them
      if (dynamicFiles.includes(file)) {
        continue;
      }

      // In plugin mode, skills and agents are in the plugin — skip standalone copies
      if (
        usePluginMode &&
        ide === 'claude-code' &&
        (file.startsWith('.claude/skills/') || file.startsWith('.claude/agents/'))
      ) {
        continue;
      }

      const sourcePath = join(templateDir, file);
      const destPath = join(targetDir, file);

      const sourceContent = readFile(sourcePath);

      if (fileExists(destPath)) {
        const existingContent = readFile(destPath);

        if (resolution === 'keep') {
          skippedFiles.push(file);
          continue;
        }

        if (resolution === 'merge') {
          const strategy = getMergeStrategy(file);
          const mergedContent = mergeFile(existingContent, sourceContent, strategy);
          writeFile(destPath, mergedContent);
          mergedFiles.push(file);
          manifest.files[file] = createManifestEntry(mergedContent);
          continue;
        }
      }

      // Overwrite or create new
      ensureDir(dirname(destPath));
      writeFile(destPath, sourceContent);
      appliedFiles.push(file);
      manifest.files[file] = createManifestEntry(sourceContent);
    }

    // Generate dynamic architecture rules for this IDE
    const ruleContent = getRuleContentForIDE(ide, generatedRules);
    if (ruleContent) {
      const rulePath = dynamicFiles[0]; // Each IDE has one architecture rule file
      if (rulePath) {
        const destPath = join(targetDir, rulePath);
        const resolution = conflictResolutions.get(ide) || 'overwrite';

        if (fileExists(destPath) && resolution === 'keep') {
          skippedFiles.push(rulePath);
        } else if (fileExists(destPath) && resolution === 'merge') {
          const existingContent = readFile(destPath);
          const strategy = getMergeStrategy(rulePath);
          const mergedContent = mergeFile(existingContent, ruleContent, strategy);
          writeFile(destPath, mergedContent);
          mergedFiles.push(rulePath);
          manifest.files[rulePath] = createManifestEntry(mergedContent);
        } else {
          ensureDir(dirname(destPath));
          writeFile(destPath, ruleContent);
          generatedFiles.push(`${rulePath} (personalized)`);
          manifest.files[rulePath] = createManifestEntry(ruleContent);
        }
      }
    }
  }

  // Create CLAUDE.md (always for claude-code IDE)
  if (selectedIDEs.includes('claude-code')) {
    const claudeMdPath = join(targetDir, 'CLAUDE.md');
    if (!fileExists(claudeMdPath)) {
      const claudeMdContent = generateClaudeMd(
        projectConfig,
        analysis.scripts,
        analysis.packageManager
      );
      writeFile(claudeMdPath, claudeMdContent);
      generatedFiles.push('CLAUDE.md (personalized)');
      manifest.files['CLAUDE.md'] = createManifestEntry(claudeMdContent);
    } else {
      p.log.info('CLAUDE.md already exists — preserving your customizations.');
    }
  }

  // Create AGENTS.md (optional, independent)
  if (createAgentsMd) {
    const agentsMdPath = join(targetDir, 'AGENTS.md');
    const agentsMdContent = generateAgentsMdFromConfig(
      projectConfig,
      analysis.scripts,
      analysis.packageManager
    );
    writeFile(agentsMdPath, agentsMdContent);
    generatedFiles.push('AGENTS.md (personalized)');
    manifest.files['AGENTS.md'] = createManifestEntry(agentsMdContent);
  }

  // Create thoughts directory
  if (createThoughtsDir) {
    for (const dir of THOUGHTS_DIRS) {
      ensureDir(join(targetDir, dir));
    }
    appliedFiles.push('thoughts/ structure');
  }

  // Write manifest
  writeManifest(targetDir, manifest);

  spinner.stop('Configuration applied');

  // Summary
  if (generatedFiles.length > 0) {
    p.note(
      generatedFiles.map((f) => `  ${chalk.magenta('★')} ${f}`).join('\n'),
      'Generated (personalized)'
    );
  }

  if (appliedFiles.length > 0) {
    p.note(
      appliedFiles.map((f) => `  ${chalk.green('✓')} ${f}`).join('\n'),
      'Created/Updated'
    );
  }

  if (mergedFiles.length > 0) {
    p.note(
      mergedFiles.map((f) => `  ${chalk.blue('⚡')} ${f}`).join('\n'),
      'Merged'
    );
  }

  if (skippedFiles.length > 0) {
    p.note(
      skippedFiles.map((f) => `  ${chalk.yellow('⏭')} ${f}`).join('\n'),
      'Skipped (existing)'
    );
  }

  p.outro(chalk.green('Setup complete!'));

  // Show plugin details if applicable
  if (usePluginMode) {
    console.log('');
    console.log(chalk.bold('Plugin installed:'));
    console.log(`  Name: ${chalk.cyan(PLUGIN_NAME)} at ${PLUGIN_DIR}/${PLUGIN_NAME}/`);
    console.log(`  Skills: /rbartronic:brief, /rbartronic:spec, /rbartronic:research, ...`);
    console.log(`  Hooks: SessionStart, PostToolUse, Stop, SubagentStop, PreCompact`);
  }

  // Show next steps
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log('  1. Review the generated CLAUDE.md and rules');
  console.log('  2. Customize further as needed for your project');
  console.log('  3. Add to .gitignore:');
  console.log(chalk.dim('     thoughts/checkpoints/'));
  console.log(chalk.dim('     .claude/settings.local.json'));
  console.log(chalk.dim('     CLAUDE.local.md'));
  console.log(chalk.dim('     .ai-template/'));
  console.log('');
  console.log(`To update later: ${chalk.cyan('npx rbartronic update')}`);
  } catch (err) {
    spinner.stop('Configuration failed');
    const message = err instanceof Error ? err.message : String(err);
    p.log.error(message);
    p.cancel('Installation aborted due to an error. Check permissions and try again.');
    process.exit(1);
  }
}

/**
 * Shows a preview of what would be generated without making changes
 */
async function showPreview(
  targetDir: string,
  selectedIDEs: IDE[],
  projectConfig: ProjectConfig,
  analysis: ReturnType<typeof analyzeProject>
): Promise<void> {
  console.log('');
  console.log(chalk.bold.underline('Preview: What would be generated'));
  console.log('');

  // Show detected configuration
  console.log(chalk.bold('Configuration:'));
  console.log(`  Architecture: ${chalk.cyan(projectConfig.architecture)}`);
  if (projectConfig.layers.length > 0) {
    console.log(`  Layers: ${chalk.cyan(projectConfig.layers.join(', '))}`);
  }
  if (projectConfig.stateManagement.length > 0) {
    console.log(`  State: ${chalk.cyan(projectConfig.stateManagement.join(', '))}`);
  }
  if (projectConfig.dataFetching.length > 0) {
    console.log(`  Data: ${chalk.cyan(projectConfig.dataFetching.join(', '))}`);
  }
  if (projectConfig.orm.length > 0) {
    console.log(`  ORM: ${chalk.cyan(projectConfig.orm.join(', '))}`);
  }
  console.log('');

  // Show files that would be generated
  console.log(chalk.bold('Files to generate:'));
  console.log('');

  // CLAUDE.md preview
  const claudeMdContent = generateClaudeMd(
    projectConfig,
    analysis.scripts,
    analysis.packageManager
  );
  const claudeMdLines = claudeMdContent.split('\n').length;
  console.log(`  ${chalk.magenta('★')} CLAUDE.md ${chalk.dim(`(${claudeMdLines} lines)`)}`);
  console.log(chalk.dim('     └── Primary Claude Code context (self-improving)'));

  // AGENTS.md preview
  const agentsMdContent = generateAgentsMdFromConfig(
    projectConfig,
    analysis.scripts,
    analysis.packageManager
  );
  const agentsMdLines = agentsMdContent.split('\n').length;
  console.log(`  ${chalk.magenta('★')} AGENTS.md ${chalk.dim(`(${agentsMdLines} lines)`)}`);
  console.log(chalk.dim('     └── Universal AI context (no Claude-specific content)'));

  // Plugin preview for Claude Code
  if (selectedIDEs.includes('claude-code')) {
    console.log(`  ${chalk.magenta('★')} Plugin ${chalk.cyan(PLUGIN_NAME)} ${chalk.dim('(16 skills, 7 agents, 5 hooks)')}`);
    console.log(chalk.dim(`     └── .claude-plugins/${PLUGIN_NAME}/`));
    console.log(chalk.dim('     └── Skills: /rbartronic:brief, /rbartronic:spec, /rbartronic:research, ...'));
    console.log(chalk.dim('     └── Hooks: SessionStart, PostToolUse, Stop, SubagentStop, PreCompact'));
  }

  // Architecture rules preview
  const generatedRules = generateArchitectureRules(projectConfig);

  for (const ide of selectedIDEs) {
    const ruleContent = getRuleContentForIDE(ide, generatedRules);
    const ruleLines = ruleContent ? ruleContent.split('\n').length : 0;
    const rulePath = DYNAMIC_RULE_FILES[ide]?.[0];

    if (rulePath && ruleContent) {
      console.log(`  ${chalk.magenta('★')} ${rulePath} ${chalk.dim(`(${ruleLines} lines)`)}`);
    }

    // Show template files (for non-plugin IDEs, or only rules for claude-code)
    const templateDir = join(TEMPLATES_DIR, IDE_TEMPLATE_MAP[ide]);
    if (existsSync(templateDir)) {
      const files = getAllFilesRecursive(templateDir);
      let templateFiles = files.filter((f) => !DYNAMIC_RULE_FILES[ide]?.includes(f));

      // In plugin mode, skills and agents are in the plugin — don't list as standalone templates
      if (ide === 'claude-code') {
        templateFiles = templateFiles.filter(
          (f) => !f.startsWith('.claude/skills/') && !f.startsWith('.claude/agents/')
        );
      }

      if (templateFiles.length > 0) {
        console.log(`  ${chalk.green('✓')} ${ide} templates ${chalk.dim(`(${templateFiles.length} files)`)}`);
        // Show first 3 files
        templateFiles.slice(0, 3).forEach((f) => {
          console.log(chalk.dim(`     └── ${f}`));
        });
        if (templateFiles.length > 3) {
          console.log(chalk.dim(`     └── ... and ${templateFiles.length - 3} more`));
        }
      }
    }
  }

  // Thoughts directory
  console.log(`  ${chalk.green('✓')} thoughts/ ${chalk.dim(`(${THOUGHTS_DIRS.length} directories)`)}`);
  console.log(chalk.dim(`     └── ${THOUGHTS_DIRS.map((d) => d.replace('thoughts/', '')).join(', ')}`));

  console.log('');

  // Show architecture rules preview content
  console.log(chalk.bold('Architecture Rules Preview:'));
  console.log(chalk.dim('─'.repeat(50)));

  const previewContent = generatedRules.claudeCode
    .split('\n')
    .slice(0, 25)
    .map((line) => chalk.dim(line))
    .join('\n');
  console.log(previewContent);
  console.log(chalk.dim('...'));
  console.log(chalk.dim('─'.repeat(50)));

  console.log('');
  console.log(chalk.yellow('This is a preview. No files were created.'));
  console.log(`Run without ${chalk.cyan('--preview')} to apply changes.`);

  p.outro('Preview complete');
}

/**
 * Builds a ProjectConfig by merging preset config with detected values
 */
function buildProjectConfigFromPreset(
  presetConfig: Partial<ProjectConfig>,
  analysis: ReturnType<typeof analyzeProject>
): ProjectConfig {
  // Build quality command from scripts
  const qualityParts: string[] = [];
  const pm = analysis.packageManager || 'npm';
  const run = pm === 'npm' ? 'npm run' : pm;

  if (analysis.scripts.typecheck) qualityParts.push(`${run} typecheck`);
  if (analysis.scripts.lint) qualityParts.push(`${run} lint`);
  if (analysis.scripts.test) qualityParts.push(`${run} test`);

  const qualityCommand =
    qualityParts.length > 0 ? qualityParts.join(' && ') : `${run} typecheck && ${run} lint`;

  return {
    architecture: presetConfig.architecture || analysis.architecture.pattern,
    layers: presetConfig.layers || analysis.architecture.layers,
    stateManagement: presetConfig.stateManagement || analysis.stack.stateManagement,
    dataFetching: presetConfig.dataFetching || analysis.stack.dataFetching,
    orm: presetConfig.orm || analysis.stack.orm,
    testing: presetConfig.testing || analysis.stack.testing,
    ui: presetConfig.ui || analysis.stack.ui,
    validation: presetConfig.validation || analysis.stack.validation,
    framework: presetConfig.framework || analysis.framework.name,
    qualityCommand,
  };
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

// Re-export for use by other commands
export { TEMPLATES_DIR, IDE_TEMPLATE_MAP, DYNAMIC_RULE_FILES, THOUGHTS_DIRS, getCliVersion };
