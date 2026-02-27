#!/usr/bin/env node

import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { statusCommand } from './commands/status.js';
import { diffCommand } from './commands/diff.js';
import { addCommand } from './commands/add.js';
import { regenerateCommand } from './commands/regenerate.js';
import { infoCommand } from './commands/info.js';
import { listCommand } from './commands/list.js';
import { configCommand, configSetCommand, configResetCommand } from './commands/config.js';
import { doctorCommand } from './commands/doctor.js';
import { PRESETS } from './types.js';
import { introTitle, showLogo } from './utils/ui.js';
import { getCliVersion } from './utils/version.js';

const cliVersion = getCliVersion();
const program = new Command();

program
  .name('devtronic')
  .description('CLI for deploying devtronic template to your projects')
  .version(cliVersion)
  .action(() => {
    // Show branded banner when invoked with no command
    showLogo();
    console.log(chalk.dim(`  Agentic development toolkit v${cliVersion}`));
    console.log();
    console.log(`  ${chalk.dim('$')} ${chalk.white('devtronic init')} ${chalk.dim('[path]')}              ${chalk.dim('Initialize in a project')}`);
    console.log(`  ${chalk.dim('$')} ${chalk.white('devtronic info')}                      ${chalk.dim('Version & config summary')}`);
    console.log(`  ${chalk.dim('$')} ${chalk.white('devtronic doctor')}                    ${chalk.dim('Health diagnostics')}`);
    console.log(`  ${chalk.dim('$')} ${chalk.white('devtronic status')}                    ${chalk.dim('File status overview')}`);
    console.log();
    console.log(`  ${chalk.dim('$')} ${chalk.white('devtronic help')}                      ${chalk.dim('Show all commands')}`);
    console.log();
  });

program
  .command('init')
  .description('Initialize devtronic in your project')
  .argument('[path]', 'Target directory (default: current directory)')
  .option('--ide <ides>', 'Comma-separated list of IDEs to configure')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('--preview', 'Show what would be generated without making changes')
  .option(
    '--preset <name>',
    `Use a preset configuration (${Object.keys(PRESETS).join(', ')})`
  )
  .action(async (path, options) => {
    await initCommand({
      path,
      ide: options.ide,
      yes: options.yes,
      preview: options.preview,
      preset: options.preset,
    });
  });

program
  .command('update')
  .description('Update to the latest template version')
  .option('--check', 'Only check for updates without applying')
  .option('--dry-run', 'Show what would be updated without making changes')
  .action(async (options) => {
    await updateCommand({ check: options.check, dryRun: options.dryRun });
  });

program
  .command('add')
  .description('Add configuration for an additional IDE')
  .argument('[ide]', 'IDE to add (claude-code, cursor, antigravity, github-copilot)')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (ide, options) => {
    await addCommand(ide, { path: options.path, yes: options.yes });
  });

program
  .command('regenerate')
  .description('Regenerate specific files (CLAUDE.md, AGENTS.md, architecture rules)')
  .argument('[target]', 'What to regenerate (CLAUDE.md, AGENTS.md, rules)')
  .option('--claude', 'Regenerate CLAUDE.md (overwrites self-improvements)')
  .option('--rules', 'Regenerate architecture rules for all configured IDEs')
  .option('--agents', 'Regenerate AGENTS.md')
  .option('--all', 'Regenerate everything')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (target, options) => {
    await regenerateCommand(target, {
      path: options.path,
      claude: options.claude,
      rules: options.rules,
      agents: options.agents,
      all: options.all,
    });
  });

program
  .command('status')
  .description('Show installation status and modified files')
  .action(async () => {
    await statusCommand();
  });

program
  .command('diff')
  .description('Show differences between local files and template')
  .action(async () => {
    await diffCommand();
  });

program
  .command('info')
  .description('Show version, configuration, and installation summary')
  .action(async () => {
    await infoCommand();
  });

program
  .command('list')
  .description('List installed skills and agents')
  .argument('[filter]', 'Filter by type (skills, agents)')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (filter, options) => {
    await listCommand(filter, { path: options.path });
  });

const configCmd = program
  .command('config')
  .description('View or manage project configuration')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (options) => {
    await configCommand({ path: options.path });
  });

configCmd
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Configuration key')
  .argument('<value>', 'New value (comma-separated for arrays)')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (key, value, options) => {
    await configSetCommand(key, value, { path: options.path });
  });

configCmd
  .command('reset')
  .description('Re-detect configuration from project')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (options) => {
    await configResetCommand({ path: options.path });
  });

program
  .command('doctor')
  .description('Run health checks on your devtronic installation')
  .option('--fix', 'Auto-fix fixable issues')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (options) => {
    await doctorCommand({ fix: options.fix, path: options.path });
  });

// Presets command
program
  .command('presets')
  .description('List available configuration presets')
  .action(() => {
    p.intro(introTitle('Presets'));

    const lines = Object.entries(PRESETS).map(([name, preset]) => {
      const parts = [`  ${chalk.bold(name)}`];
      parts.push(`    ${preset.description}`);
      if (preset.config.architecture) {
        parts.push(`    Architecture: ${chalk.cyan(preset.config.architecture)}`);
      }
      if (preset.config.layers) {
        parts.push(`    Layers: ${chalk.cyan(preset.config.layers.join(', '))}`);
      }
      return parts.join('\n');
    });

    p.note(lines.join('\n\n'), 'Available Presets');
    p.outro(`Usage: ${chalk.cyan('npx devtronic init --preset <name>')}`);
  });

program.parseAsync().catch((err) => {
  console.error(`\nError: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
