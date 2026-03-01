import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { ConfigOptions, ProjectConfig } from '../types.js';
import { ADDONS } from '../types.js';
import { readManifest, writeManifest } from '../utils/files.js';
import { introTitle, formatKV } from '../utils/ui.js';
import { analyzeProject } from '../analyzers/index.js';

/** Keys that accept comma-separated array values */
const ARRAY_KEYS: Array<keyof ProjectConfig> = [
  'layers',
  'stateManagement',
  'dataFetching',
  'orm',
  'testing',
  'ui',
  'validation',
  'enabledAddons',
];

/** All valid config keys */
const VALID_KEYS: Array<keyof ProjectConfig> = [
  'architecture',
  'framework',
  'qualityCommand',
  ...ARRAY_KEYS,
];

export async function configCommand(options: ConfigOptions): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('Config'));

  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.cancel('No installation found. Run `npx devtronic init` first.');
    process.exit(1);
  }

  if (!manifest.projectConfig) {
    p.cancel('No project configuration found. Run `npx devtronic init` or `npx devtronic update` first.');
    process.exit(1);
  }

  const config = manifest.projectConfig;

  const none = chalk.dim('none');
  const lines = [
    formatKV('IDEs:', manifest.selectedIDEs.join(', ')),
    formatKV('Mode:', manifest.installMode || 'standalone'),
    formatKV('Architecture:', config.architecture || none),
    formatKV('Framework:', config.framework || none),
    formatKV('Layers:', config.layers?.join(', ') || none),
    formatKV('State:', config.stateManagement?.join(', ') || none),
    formatKV('Data:', config.dataFetching?.join(', ') || none),
    formatKV('ORM:', config.orm?.join(', ') || none),
    formatKV('Testing:', config.testing?.join(', ') || none),
    formatKV('UI:', config.ui?.join(', ') || none),
    formatKV('Validation:', config.validation?.join(', ') || none),
    formatKV('Quality:', config.qualityCommand || none),
    formatKV('Addons:', config.enabledAddons?.join(', ') || none),
  ];

  p.note(lines.join('\n'), 'Current Configuration');

  p.outro('');
}

export async function configSetCommand(
  key: string,
  value: string,
  options: ConfigOptions
): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('Config Set'));

  const manifest = readManifest(targetDir);

  if (!manifest || !manifest.projectConfig) {
    p.cancel('No installation found. Run `npx devtronic init` first.');
    process.exit(1);
  }

  if (!VALID_KEYS.includes(key as keyof ProjectConfig)) {
    p.cancel(
      `Unknown config key: ${key}\n\nValid keys: ${VALID_KEYS.join(', ')}`
    );
    process.exit(1);
  }

  const configKey = key as keyof ProjectConfig;

  const previousArch = manifest.projectConfig.architecture;

  if (ARRAY_KEYS.includes(configKey as typeof ARRAY_KEYS[number])) {
    // Array value — accept comma-separated
    const arrayValue = value.split(',').map((v) => v.trim()).filter(Boolean);

    // Validate addon names
    if (configKey === 'enabledAddons') {
      const validAddons = Object.keys(ADDONS);
      const invalid = arrayValue.filter((v) => !validAddons.includes(v));
      if (invalid.length > 0) {
        p.cancel(
          `Unknown addon(s): ${invalid.join(', ')}\n\nValid addons: ${validAddons.join(', ')}`
        );
        process.exit(1);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manifest.projectConfig as any)[configKey] = arrayValue;
    p.log.success(`${chalk.bold(key)} set to ${chalk.cyan(arrayValue.join(', '))}`);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manifest.projectConfig as any)[configKey] = value;
    p.log.success(`${chalk.bold(key)} set to ${chalk.cyan(value)}`);
  }

  writeManifest(targetDir, manifest);

  // Hint about regenerating plugin when addons change
  if (configKey === 'enabledAddons') {
    p.log.info(
      `Run ${chalk.cyan('devtronic regenerate --plugin')} to apply addon changes to the plugin.`
    );
  }

  // Hint about regenerating rules when architecture changes
  if (configKey === 'architecture' && value !== previousArch) {
    if (value === 'none') {
      p.log.info(`Architecture rules will be skipped on next ${chalk.cyan('devtronic regenerate --rules')}.`);
    } else if (previousArch === 'none') {
      p.log.info(`Run ${chalk.cyan('devtronic regenerate --rules')} to generate architecture rules.`);
    } else {
      p.log.info(`Run ${chalk.cyan('devtronic regenerate --rules')} to update rules for the new architecture.`);
    }
  }

  p.outro(chalk.green('Configuration updated'));
}

export async function configResetCommand(options: ConfigOptions): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('Config Reset'));

  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.cancel('No installation found. Run `npx devtronic init` first.');
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start('Re-analyzing project...');

  const analysis = analyzeProject(targetDir);

  spinner.stop('Project analyzed');

  const pm = analysis.packageManager || 'npm';
  const run = pm === 'npm' ? 'npm run' : pm;

  const qualityParts: string[] = [];
  if (analysis.scripts.typecheck) qualityParts.push(`${run} typecheck`);
  if (analysis.scripts.lint) qualityParts.push(`${run} lint`);
  if (analysis.scripts.test) qualityParts.push(`${run} test`);

  manifest.projectConfig = {
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
    enabledAddons: manifest.projectConfig?.enabledAddons,
  };

  writeManifest(targetDir, manifest);

  const config = manifest.projectConfig;
  const none = chalk.dim('none');
  const resetLines = [
    formatKV('Architecture:', config.architecture || none),
    formatKV('Framework:', config.framework || none),
    formatKV('Layers:', config.layers?.join(', ') || none),
    formatKV('State:', config.stateManagement?.join(', ') || none),
    formatKV('Data:', config.dataFetching?.join(', ') || none),
    formatKV('ORM:', config.orm?.join(', ') || none),
    formatKV('Testing:', config.testing?.join(', ') || none),
    formatKV('UI:', config.ui?.join(', ') || none),
    formatKV('Validation:', config.validation?.join(', ') || none),
    formatKV('Quality:', config.qualityCommand || none),
    formatKV('Addons:', config.enabledAddons?.join(', ') || none),
  ];

  p.note(resetLines.join('\n'), 'Re-detected Configuration');

  p.outro(chalk.green('Configuration reset from project analysis'));
}
