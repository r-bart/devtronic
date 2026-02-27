import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import {
  readManifest,
  fileExists,
  readFile,
  calculateChecksum,
  getAllFilesRecursive,
} from '../utils/files.js';
import { introTitle, symbols } from '../utils/ui.js';
import { TEMPLATES_DIR, IDE_TEMPLATE_MAP } from './init.js';

export async function diffCommand(): Promise<void> {
  const targetDir = resolve('.');

  p.intro(introTitle('Diff'));

  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.log.warn('No installation found in this directory.');
    p.log.info('Run `npx devtronic init` to set up.');
    p.outro('');
    return;
  }

  interface DiffEntry {
    path: string;
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    localModified?: boolean;
  }

  const diffs: DiffEntry[] = [];

  // Check all installed IDEs
  for (const ide of manifest.selectedIDEs) {
    const templateDir = join(TEMPLATES_DIR, IDE_TEMPLATE_MAP[ide]);
    if (!existsSync(templateDir)) continue;

    const templateFiles = getAllFilesRecursive(templateDir);

    for (const file of templateFiles) {
      const templatePath = join(templateDir, file);
      const localPath = join(targetDir, file);
      const templateContent = readFile(templatePath);
      const templateChecksum = calculateChecksum(templateContent);

      const manifestEntry = manifest.files[file];

      if (!fileExists(localPath)) {
        // File was removed locally
        diffs.push({ path: file, type: 'removed' });
      } else {
        const localContent = readFile(localPath);
        const localChecksum = calculateChecksum(localContent);

        const localModified = manifestEntry
          ? localChecksum !== manifestEntry.originalChecksum
          : false;

        if (manifestEntry && manifestEntry.checksum !== templateChecksum) {
          // Template has changed
          diffs.push({ path: file, type: 'modified', localModified });
        } else if (!manifestEntry) {
          // New file in template
          diffs.push({ path: file, type: 'added' });
        }
        // else: unchanged
      }
    }
  }

  if (diffs.length === 0) {
    p.log.success('No differences with template.');
    p.outro('');
    return;
  }

  // Group by type
  const added = diffs.filter((d) => d.type === 'added');
  const removed = diffs.filter((d) => d.type === 'removed');
  const modified = diffs.filter((d) => d.type === 'modified');

  if (added.length > 0) {
    p.note(
      added.map((d) => `  ${chalk.green('+')} ${d.path}`).join('\n'),
      'New in Template'
    );
  }

  if (removed.length > 0) {
    p.note(
      removed.map((d) => `  ${chalk.red('-')} ${d.path}`).join('\n'),
      'Removed Locally'
    );
  }

  if (modified.length > 0) {
    p.note(
      modified
        .map((d) => {
          const marker = d.localModified ? symbols.warn : symbols.updated;
          const suffix = d.localModified ? ' (also modified locally)' : '';
          return `  ${marker} ${d.path}${chalk.dim(suffix)}`;
        })
        .join('\n'),
      'Template Updated'
    );
  }

  p.log.info(`Run ${chalk.cyan('npx devtronic update')} to apply changes.`);

  p.outro('');
}
