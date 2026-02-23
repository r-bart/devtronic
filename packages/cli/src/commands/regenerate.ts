import { resolve, join, dirname } from 'node:path';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { RegenerateOptions } from '../types.js';
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
import { DYNAMIC_RULE_FILES, getCliVersion } from './init.js';
import { getRuleContentForIDE } from '../utils/rules.js';

export async function regenerateCommand(
  target: string | undefined,
  options: RegenerateOptions
): Promise<void> {
  ensureInteractive('regenerate');

  const targetDir = resolve(options.path || '.');

  p.intro(chalk.bgCyan.black(' rbartronic - Regenerate '));

  // Check for existing manifest
  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.cancel('No installation found. Run `npx rbartronic init` first.');
    process.exit(1);
  }

  // Determine what to regenerate
  let regenerateAgentsMd = false;
  let regenerateClaudeMd = false;
  let regenerateRules = false;

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
  } else if (options.all) {
    regenerateAgentsMd = true;
    regenerateClaudeMd = true;
    regenerateRules = true;
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
  }

  if (!regenerateAgentsMd && !regenerateRules && !regenerateClaudeMd) {
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
        if (!regenerateAgentsMd && !regenerateRules) {
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

  // Regenerate files
  spinner.start('Regenerating files...');

  const regeneratedFiles: string[] = [];

  // Regenerate CLAUDE.md
  if (regenerateClaudeMd) {
    const claudeMdPath = join(targetDir, 'CLAUDE.md');
    const claudeMdContent = generateClaudeMd(
      projectConfig,
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
      projectConfig,
      analysis.scripts,
      analysis.packageManager
    );

    writeFile(agentsMdPath, agentsMdContent);
    regeneratedFiles.push('AGENTS.md');
    manifest.files['AGENTS.md'] = createManifestEntry(agentsMdContent);
  }

  // Regenerate architecture rules
  if (regenerateRules) {
    const generatedRules = generateArchitectureRules(projectConfig);

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
  }

  // Update manifest with new config
  manifest.projectConfig = projectConfig;
  manifest.version = getCliVersion();
  writeManifest(targetDir, manifest);

  spinner.stop('Regeneration complete');

  // Summary
  p.note(
    regeneratedFiles.map((f) => `  ${chalk.magenta('★')} ${f}`).join('\n'),
    'Regenerated'
  );

  p.outro(chalk.green('Regeneration complete!'));

  console.log('');
  console.log(chalk.bold('Summary:'));
  console.log(`  Architecture: ${chalk.cyan(projectConfig.architecture)}`);
  if (projectConfig.layers.length > 0) {
    console.log(`  Layers: ${chalk.cyan(projectConfig.layers.join(', '))}`);
  }
  if (projectConfig.stateManagement.length > 0) {
    console.log(`  State: ${chalk.cyan(projectConfig.stateManagement.join(', '))}`);
  }
  if (projectConfig.orm.length > 0) {
    console.log(`  ORM: ${chalk.cyan(projectConfig.orm.join(', '))}`);
  }
}
