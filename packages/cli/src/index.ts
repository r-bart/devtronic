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
import { uninstallCommand } from './commands/uninstall.js';
import { addonCommand, addonListCommand, addonSyncCommand } from './commands/addon.js';
import { PRESETS } from './types.js';
import { introTitle, showLogo } from './utils/ui.js';
import { getCliVersion } from './utils/version.js';

const cliVersion = getCliVersion();
const program = new Command();

program
  .name('devtronic')
  .description('AI-assisted development toolkit')
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
    console.log(`  ${chalk.dim('$')} ${chalk.white('devtronic help --all')}                ${chalk.dim('Full reference with all options')}`);
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
  .option('--addon <name>', 'Enable an addon (e.g., orchestration)')
  .action(async (path, options) => {
    await initCommand({
      path,
      ide: options.ide,
      yes: options.yes,
      preview: options.preview,
      preset: options.preset,
      addon: options.addon,
    });
  });

program
  .command('update')
  .description('Update to the latest template version')
  .option('--check', 'Only check for updates without applying')
  .option('--dry-run', 'Show what would be updated without making changes')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (options) => {
    await updateCommand({ path: options.path, check: options.check, dryRun: options.dryRun });
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
  .option('--plugin', 'Regenerate the Claude Code plugin (skills, agents, hooks)')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (target, options) => {
    await regenerateCommand(target, {
      path: options.path,
      claude: options.claude,
      rules: options.rules,
      agents: options.agents,
      all: options.all,
      plugin: options.plugin,
    });
  });

program
  .command('status')
  .description('Show installation status and modified files')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (options) => {
    await statusCommand({ path: options.path });
  });

program
  .command('diff')
  .description('Show differences between local files and template')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (options) => {
    await diffCommand({ path: options.path });
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

program
  .command('uninstall')
  .description('Remove devtronic from your project')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (options) => {
    await uninstallCommand({ path: options.path });
  });

// Extended help — devtronic help --all
program
  .command('help')
  .description('Show help (use --all for full reference)')
  .option('-a, --all', 'Show all commands with their options')
  .action((options) => {
    if (!options.all) {
      program.outputHelp();
      return;
    }

    showLogo();
    console.log(chalk.dim(`  Agentic development toolkit v${cliVersion}\n`));

    const sections: Array<{ title: string; usage: string; desc: string; opts?: string[] }> = [
      {
        title: 'Setup',
        usage: 'init [path]',
        desc: 'Initialize devtronic in your project',
        opts: [
          '--ide <ides>        Comma-separated list of IDEs',
          '-y, --yes           Skip prompts and use defaults',
          '--preview            Show what would be generated',
          '--preset <name>      Use a preset (nextjs-clean, react-clean, monorepo, feature-based, minimal)',
          '--addon <name>       Enable an addon (e.g., orchestration)',
        ],
      },
      {
        title: '',
        usage: 'uninstall',
        desc: 'Remove devtronic from your project',
        opts: ['--path <path>        Target directory'],
      },
      {
        title: 'Addons',
        usage: 'addon add <name>',
        desc: 'Add an optional skill pack (e.g., orchestration, design-best-practices)',
        opts: ['--path <path>        Target directory'],
      },
      {
        title: '',
        usage: 'addon remove <name>',
        desc: 'Remove an addon skill pack',
        opts: ['--path <path>        Target directory'],
      },
      {
        title: '',
        usage: 'addon list',
        desc: 'List available and installed addons',
        opts: ['--path <path>        Target directory'],
      },
      {
        title: '',
        usage: 'addon sync',
        desc: 'Regenerate addon files for current agent configuration',
        opts: ['--path <path>        Target directory'],
      },
      {
        title: 'Maintenance',
        usage: 'update',
        desc: 'Update to the latest template version',
        opts: [
          '--check              Only check for updates',
          '--dry-run             Show what would change',
          '--path <path>        Target directory',
        ],
      },
      {
        title: '',
        usage: 'regenerate [target]',
        desc: 'Regenerate CLAUDE.md, AGENTS.md, rules, or plugin',
        opts: [
          '--claude             Regenerate CLAUDE.md',
          '--agents             Regenerate AGENTS.md',
          '--rules              Regenerate architecture rules',
          '--plugin             Regenerate Claude Code plugin',
          '--all                Regenerate everything',
          '--path <path>        Target directory',
        ],
      },
      {
        title: '',
        usage: 'add [ide]',
        desc: 'Add configuration for an additional IDE',
        opts: [
          '-y, --yes           Skip prompts',
          '--path <path>        Target directory',
        ],
      },
      {
        title: 'Configuration',
        usage: 'config',
        desc: 'View current project configuration',
        opts: ['--path <path>        Target directory'],
      },
      {
        title: '',
        usage: 'config set <key> <value>',
        desc: 'Set a configuration value (comma-separated for arrays)',
      },
      {
        title: '',
        usage: 'config reset',
        desc: 'Re-detect configuration from project',
      },
      {
        title: '',
        usage: 'presets',
        desc: 'List available configuration presets',
      },
      {
        title: 'Diagnostics',
        usage: 'status',
        desc: 'Show installation status and modified files',
        opts: ['--path <path>        Target directory'],
      },
      {
        title: '',
        usage: 'diff',
        desc: 'Show differences between local files and template',
        opts: ['--path <path>        Target directory'],
      },
      {
        title: '',
        usage: 'info',
        desc: 'Version, configuration, and installation summary',
      },
      {
        title: '',
        usage: 'doctor',
        desc: 'Run health checks on your installation',
        opts: [
          '--fix                Auto-fix fixable issues',
          '--path <path>        Target directory',
        ],
      },
      {
        title: '',
        usage: 'list [skills|agents]',
        desc: 'List installed skills and agents',
        opts: ['--path <path>        Target directory'],
      },
    ];

    for (const section of sections) {
      if (section.title) {
        console.log(`  ${chalk.bold.underline(section.title)}\n`);
      }
      console.log(`  ${chalk.white('devtronic ' + section.usage)}`);
      console.log(`  ${chalk.dim(section.desc)}`);
      if (section.opts) {
        for (const opt of section.opts) {
          console.log(`    ${chalk.yellow(opt)}`);
        }
      }
      console.log();
    }
  });

const addonCmd = program
  .command('addon')
  .description('Manage addons (add or remove optional skill packs)');

addonCmd
  .command('add')
  .description('Add an addon to the devtronic plugin')
  .argument('<name>', 'Addon name (e.g., orchestration)')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (name, options) => {
    await addonCommand('add', name, { path: options.path });
  });

addonCmd
  .command('remove')
  .description('Remove an addon from the devtronic plugin')
  .argument('<name>', 'Addon name (e.g., orchestration)')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (name, options) => {
    await addonCommand('remove', name, { path: options.path });
  });

addonCmd
  .command('list')
  .description('List available and installed addons')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (options) => {
    await addonListCommand({ path: options.path });
  });

addonCmd
  .command('sync')
  .description('Regenerate addon files for current agent configuration')
  .option('--path <path>', 'Target directory (default: current directory)')
  .action(async (options) => {
    await addonSyncCommand({ path: options.path });
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
