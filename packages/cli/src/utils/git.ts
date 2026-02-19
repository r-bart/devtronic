import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function hasGitRepo(targetDir: string): boolean {
  return existsSync(join(targetDir, '.git'));
}
