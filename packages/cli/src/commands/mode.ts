import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { DevtronicMode } from '../types.js';
import { readAddonConfig, writeMode } from '../utils/addonConfig.js';
import { introTitle } from '../utils/ui.js';

export async function modeCommand(
  action: 'afk' | 'hitl' | 'show',
  options: { path?: string }
): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('Mode'));

  if (action === 'show') {
    const configPath = join(targetDir, '.claude', 'devtronic.json');
    const hasConfig = existsSync(configPath);
    const config = readAddonConfig(targetDir);
    const currentMode = config.mode;
    const isDefault = !hasConfig || currentMode === undefined;
    const displayMode = currentMode ?? 'hitl';

    p.log.info(
      `Mode: ${chalk.cyan(displayMode)}${isDefault ? chalk.dim(' (default)') : ''}`
    );
    p.log.info(`Config: ${chalk.dim('.claude/devtronic.json')}`);
    p.outro('');
    return;
  }

  const newMode = action as DevtronicMode;
  writeMode(targetDir, newMode);

  const description =
    newMode === 'afk'
      ? 'Fully autonomous — no human gates'
      : 'Human-in-the-loop — pauses for approval at key stages';

  p.log.success(`Mode set to ${chalk.cyan(newMode)}`);
  p.log.info(chalk.dim(description));
  p.outro(
    `Change back anytime with ${chalk.cyan(`npx devtronic mode ${newMode === 'afk' ? 'hitl' : 'afk'}`)}`
  );
}
