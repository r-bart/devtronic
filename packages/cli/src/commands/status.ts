import { resolve, join } from 'node:path';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import {
  readManifest,
  fileExists,
  readFile,
  calculateChecksum,
} from '../utils/files.js';

export async function statusCommand(): Promise<void> {
  const targetDir = resolve('.');

  p.intro(chalk.bgCyan.black(' devtronic Status '));

  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.log.warn('No installation found in this directory.');
    p.log.info('Run `npx devtronic init` to set up.');
    p.outro('');
    return;
  }

  // Basic info
  p.note(
    [
      `${chalk.bold('Version:')}     ${manifest.version}`,
      `${chalk.bold('Installed:')}   ${manifest.implantedAt}`,
      `${chalk.bold('IDEs:')}        ${manifest.selectedIDEs.join(', ')}`,
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
    `${chalk.green('●')} ${okFiles.length} unchanged`,
    `${chalk.yellow('●')} ${modifiedFiles.length} modified`,
    `${chalk.red('●')} ${missingFiles.length} missing`,
  ];
  p.note(summaryLines.join('\n'), 'File Status');

  // Show modified files
  if (modifiedFiles.length > 0) {
    p.note(
      modifiedFiles.map((f) => `  ${chalk.yellow('●')} ${f.path}`).join('\n'),
      'Modified Files'
    );
  }

  // Show missing files
  if (missingFiles.length > 0) {
    p.note(
      missingFiles.map((f) => `  ${chalk.red('●')} ${f.path}`).join('\n'),
      'Missing Files'
    );
  }

  p.outro('');
}
