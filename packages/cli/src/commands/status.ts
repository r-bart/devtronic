import { resolve, join } from 'node:path';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import {
  readManifest,
  fileExists,
  readFile,
  calculateChecksum,
} from '../utils/files.js';
import { introTitle, formatKV, symbols } from '../utils/ui.js';
import { getCliVersion, getLatestVersion, compareSemver } from '../utils/version.js';
import { readAddonConfig, readMode } from '../utils/addonConfig.js';
import { getAvailableAddons } from '../addons/registry.js';

export async function statusCommand(options: { path?: string } = {}): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('Status'));

  const manifest = readManifest(targetDir);

  // Start non-blocking version check early
  const latestPromise = getLatestVersion('devtronic');

  if (!manifest) {
    p.log.warn('No installation found in this directory.');
    p.log.info('Run `npx devtronic init` to set up.');
    p.outro('');
    return;
  }

  // Execution mode
  const mode = readMode(targetDir);
  const addonConfig = readAddonConfig(targetDir);
  const allAddons = getAvailableAddons();

  p.note(
    [
      `${formatKV('Mode:', chalk.cyan(mode))}`,
      `${formatKV('Config:', chalk.dim('.claude/devtronic.json'))}`,
    ].join('\n'),
    'Execution Mode'
  );

  const addonLines = allAddons.map((addon) => {
    const isEnabled = !!addonConfig.installed[addon.name];
    const statusStr = isEnabled ? chalk.green('enabled') : chalk.dim('disabled');
    return `  ${chalk.bold((addon.name + ':').padEnd(28))} ${statusStr}`;
  });
  p.note(addonLines.join('\n'), 'Addons');

  // Basic info
  p.note(
    [
      formatKV('Version:', manifest.version),
      formatKV('Installed:', manifest.implantedAt),
      formatKV('IDEs:', manifest.selectedIDEs.join(', ')),
    ].join('\n'),
    'Installation Info'
  );

  // Check file status
  const fileStatuses: { path: string; status: 'ok' | 'modified' | 'missing' }[] = [];

  for (const [relativePath, fileInfo] of Object.entries(manifest.files)) {
    const filePath = join(targetDir, relativePath);

    if (!fileExists(filePath)) {
      fileStatuses.push({ path: relativePath, status: 'missing' });
      continue;
    }

    const currentContent = readFile(filePath);
    const currentChecksum = calculateChecksum(currentContent);

    if (currentChecksum !== fileInfo.originalChecksum) {
      fileStatuses.push({ path: relativePath, status: 'modified' });
    } else {
      fileStatuses.push({ path: relativePath, status: 'ok' });
    }
  }

  const okFiles = fileStatuses.filter((f) => f.status === 'ok');
  const modifiedFiles = fileStatuses.filter((f) => f.status === 'modified');
  const missingFiles = fileStatuses.filter((f) => f.status === 'missing');

  // Summary
  const summaryLines = [
    `${symbols.pass} ${okFiles.length} unchanged`,
    `${symbols.warn} ${modifiedFiles.length} modified`,
    `${symbols.fail} ${missingFiles.length} missing`,
  ];
  p.note(summaryLines.join('\n'), 'File Status');

  // Show modified files
  if (modifiedFiles.length > 0) {
    p.note(
      modifiedFiles.map((f) => `  ${symbols.warn} ${f.path}`).join('\n'),
      'Modified Files'
    );
  }

  // Show missing files
  if (missingFiles.length > 0) {
    p.note(
      missingFiles.map((f) => `  ${symbols.fail} ${f.path}`).join('\n'),
      'Missing Files'
    );
  }

  // Check for newer version
  const currentVersion = getCliVersion();
  const latest = await latestPromise;
  if (latest && compareSemver(currentVersion, latest) < 0) {
    p.log.warn(
      `Update available: ${currentVersion} ${chalk.dim('→')} ${chalk.cyan(latest)}\n  Run ${chalk.cyan('npx devtronic@latest init')} to upgrade.`
    );
  }

  p.outro('');
}
