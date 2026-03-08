import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { ProjectConfig, RegenerateOptions } from '../types.js';
import { analyzeProject } from '../analyzers/index.js';
import { promptForProjectConfig } from '../prompts/analysis.js';
import {
  fileExists,
  writeFile,
  ensureDir,
  readManifest,
  writeManifest,
  createManifestEntry,
} from '../utils/files.js';
import { ensureInteractive } from '../utils/tty.js';
import { generateAgentsMdFromConfig, generateClaudeMd } from '../generators/rules.js';
import { generateArchitectureRules } from '../generators/architectureRules.js';
import { DYNAMIC_RULE_FILES } from './init.js';
import { getCliVersion } from '../utils/version.js';
import { getRuleContentForIDE } from '../utils/rules.js';
import { introTitle, symbols } from '../utils/ui.js';

const __filename = fileURLToPath(import.meta.url);
const __regen_dirname = dirname(__filename);
const TEMPLATES_DIR = existsSync(resolve(__regen_dirname, '../templates'))
  ? resolve(__regen_dirname, '../templates')
  : resolve(__regen_dirname, '../../templates');

export async function regenerateCommand(
  target: string | undefined,
  options: RegenerateOptions
): Promise<void> {
  ensureInteractive('regenerate');

  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('Regenerate'));

  // Check for existing manifest
  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.cancel('No installation found. Run `npx devtronic init` first.');
    process.exit(1);
  }

  // Determine what to regenerate
  let regenerateAgentsMd = false;
  let regenerateClaudeMd = false;
  let regenerateRules = false;
  let regeneratePlugin = false;

  if (target === 'CLAUDE.md' || target === 'claude') {
    regenerateClaudeMd = true;
  } else if (target === 'AGENTS.md' || target === 'agents') {
    regenerateAgentsMd = true;
  } else if (options.claude) {
    regenerateClaudeMd = true;
  } else if (options.rules) {
    regenerateRules = true;
  } else if (options.agents || target === 'agents-md') {
    regenerateAgentsMd = true;
  } else if (options.plugin) {
    regeneratePlugin = true;
  } else if (options.all) {
    regenerateAgentsMd = true;
    regenerateClaudeMd = true;
    regenerateRules = true;
    regeneratePlugin = true;
  } else if (target) {
    // Check if target is a specific rule file
    if (target.includes('architecture') || target.includes('rules')) {
      regenerateRules = true;
    } else {
      p.cancel(
        `Unknown target: ${target}\n\nValid options:\n` +
          `  CLAUDE.md       Regenerate CLAUDE.md (overwrites self-improvements)\n` +
          `  AGENTS.md       Regenerate AGENTS.md\n` +
          `  --rules         Regenerate architecture rules for all IDEs\n` +
          `  --plugin        Regenerate Claude Code plugin (skills, agents, hooks)\n` +
          `  --all           Regenerate everything`
      );
      process.exit(1);
    }
  } else {
    // Interactive selection
    const selection = await p.multiselect({
      message: 'What do you want to regenerate?',
      options: [
        {
          value: 'claude',
          label: 'CLAUDE.md',
          hint: 'WARNING: overwrites self-improvements',
        },
        { value: 'agents', label: 'AGENTS.md', hint: 'Universal AI context' },
        { value: 'rules', label: 'Architecture rules', hint: 'For all configured IDEs' },
        { value: 'plugin', label: 'Plugin', hint: 'Skills, agents, hooks (Claude Code only)' },
      ],
      required: true,
    });

    if (p.isCancel(selection)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    regenerateClaudeMd = (selection as string[]).includes('claude');
    regenerateAgentsMd = (selection as string[]).includes('agents');
    regenerateRules = (selection as string[]).includes('rules');
    regeneratePlugin = (selection as string[]).includes('plugin');
  }

  if (!regenerateAgentsMd && !regenerateRules && !regenerateClaudeMd && !regeneratePlugin) {
    p.log.warn('Nothing selected to regenerate.');
    p.outro('No changes made');
    return;
  }

  // Warn before overwriting CLAUDE.md self-improvements
  if (regenerateClaudeMd) {
    const claudeMdPath = join(targetDir, 'CLAUDE.md');
    if (fileExists(claudeMdPath)) {
      p.log.warn(
        'Regenerating CLAUDE.md will overwrite any self-improvements (Gotchas section).'
      );
      const confirm = await p.confirm({
        message: 'Are you sure you want to regenerate CLAUDE.md?',
        initialValue: false,
      });

      if (p.isCancel(confirm) || !confirm) {
        regenerateClaudeMd = false;
        p.log.info('Skipping CLAUDE.md regeneration.');

        // If nothing else to do, exit
        if (!regenerateAgentsMd && !regenerateRules && !regeneratePlugin) {
          p.outro('No changes made');
          return;
        }
      }
    }
  }

  // Re-analyze project to get current state
  const spinner = p.spinner();
  spinner.start('Re-analyzing project...');

  const analysis = analyzeProject(targetDir);

  spinner.stop('Project analyzed');

  // Get new project configuration
  p.log.info('The project will be re-analyzed. Confirm the configuration:');

  const projectConfigResult = await promptForProjectConfig(analysis, false);
  if (p.isCancel(projectConfigResult)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }
  const projectConfig = projectConfigResult;

  // Build full config preserving enabledAddons from existing manifest
  const fullProjectConfig: ProjectConfig = {
    ...projectConfig,
    enabledAddons: manifest.projectConfig?.enabledAddons,
  };

  // Regenerate files
  spinner.start('Regenerating files...');

  const regeneratedFiles: string[] = [];

  // Regenerate CLAUDE.md
  if (regenerateClaudeMd) {
    const claudeMdPath = join(targetDir, 'CLAUDE.md');
    const claudeMdContent = generateClaudeMd(
      fullProjectConfig,
      analysis.scripts,
      analysis.packageManager
    );

    writeFile(claudeMdPath, claudeMdContent);
    regeneratedFiles.push('CLAUDE.md');
    manifest.files['CLAUDE.md'] = createManifestEntry(claudeMdContent);
  }

  // Regenerate AGENTS.md
  if (regenerateAgentsMd) {
    const agentsMdPath = join(targetDir, 'AGENTS.md');
    const agentsMdContent = generateAgentsMdFromConfig(
      fullProjectConfig,
      analysis.scripts,
      analysis.packageManager
    );

    writeFile(agentsMdPath, agentsMdContent);
    regeneratedFiles.push('AGENTS.md');
    manifest.files['AGENTS.md'] = createManifestEntry(agentsMdContent);
  }

  // Regenerate architecture rules (skip when 'none')
  if (regenerateRules) {
    const generatedRules = generateArchitectureRules(fullProjectConfig);

    if (generatedRules) {
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
    } else {
      p.log.info('Architecture is set to "none" — skipping rule generation.');
    }
  }

  // Regenerate plugin (skills, agents, hooks)
  if (regeneratePlugin) {
    if (manifest.installMode === 'marketplace') {
      p.log.info('Plugin content is managed by the GitHub marketplace.');
      p.log.info('Skills, agents, and hooks update automatically when a new CLI version is released.');
      p.log.info(`Use ${chalk.cyan('--rules')} or ${chalk.cyan('--all')} (without --plugin) to regenerate local files.`);
    } else if (!manifest.selectedIDEs.includes('claude-code') || manifest.installMode !== 'plugin') {
      p.log.warn('Plugin regeneration only applies to Claude Code in plugin mode. Skipping.');
    } else {
      const { generatePlugin } = await import('../generators/plugin.js');
      const pluginResult = generatePlugin(
        targetDir,
        TEMPLATES_DIR,
        getCliVersion(),
        fullProjectConfig,
        analysis.packageManager
      );
      Object.assign(manifest.files, pluginResult.files);
      regeneratedFiles.push('plugin (skills, agents, hooks)');
    }
  }

  // Update manifest with full config
  manifest.projectConfig = fullProjectConfig;
  manifest.version = getCliVersion();
  writeManifest(targetDir, manifest);

  spinner.stop('Regeneration complete');

  // Summary
  p.note(
    regeneratedFiles.map((f) => `  ${symbols.star} ${f}`).join('\n'),
    'Regenerated'
  );

  const summaryLines = [`  Architecture: ${chalk.cyan(projectConfig.architecture)}`];
  if (projectConfig.layers.length > 0) {
    summaryLines.push(`  Layers:       ${chalk.cyan(projectConfig.layers.join(', '))}`);
  }
  if (projectConfig.stateManagement.length > 0) {
    summaryLines.push(`  State:        ${chalk.cyan(projectConfig.stateManagement.join(', '))}`);
  }
  if (projectConfig.orm.length > 0) {
    summaryLines.push(`  ORM:          ${chalk.cyan(projectConfig.orm.join(', '))}`);
  }
  p.note(summaryLines.join('\n'), 'Configuration');

  p.outro(chalk.green('Regeneration complete!'));
}
