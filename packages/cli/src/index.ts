#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { statusCommand } from './commands/status.js';
import { diffCommand } from './commands/diff.js';
import { addCommand } from './commands/add.js';
import { regenerateCommand } from './commands/regenerate.js';
import { PRESETS } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const packageJsonPath = resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const program = new Command();

program
  .name('devtronic')
  .description('CLI for deploying devtronic template to your projects')
  .version(getVersion());

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

// Add presets command to list available presets
program
  .command('presets')
  .description('List available configuration presets')
  .action(() => {
    console.log('\nAvailable presets:\n');
    for (const [name, preset] of Object.entries(PRESETS)) {
      console.log(`  ${name}`);
      console.log(`    ${preset.description}`);
      if (preset.config.architecture) {
        console.log(`    Architecture: ${preset.config.architecture}`);
      }
      if (preset.config.layers) {
        console.log(`    Layers: ${preset.config.layers.join(', ')}`);
      }
      console.log('');
    }
    console.log('Usage: npx devtronic init --preset <name>\n');
  });

program.parseAsync().catch((err) => {
  console.error(`\nError: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
