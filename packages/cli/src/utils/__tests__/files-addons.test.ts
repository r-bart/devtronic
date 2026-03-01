import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getSubdirectories } from '../files.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'files-addon-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('getSubdirectories', () => {
  it('returns immediate child directories', () => {
    mkdirSync(join(tempDir, 'alpha'));
    mkdirSync(join(tempDir, 'beta'));
    mkdirSync(join(tempDir, 'gamma'));
    writeFileSync(join(tempDir, 'file.txt'), 'not a directory');

    const result = getSubdirectories(tempDir);
    expect(result).toHaveLength(3);
    expect(result).toContain('alpha');
    expect(result).toContain('beta');
    expect(result).toContain('gamma');
  });

  it('does not include files', () => {
    writeFileSync(join(tempDir, 'file.txt'), 'hello');
    mkdirSync(join(tempDir, 'dir'));

    const result = getSubdirectories(tempDir);
    expect(result).toEqual(['dir']);
  });

  it('returns empty array for non-existent directory', () => {
    const result = getSubdirectories(join(tempDir, 'does-not-exist'));
    expect(result).toEqual([]);
  });

  it('returns empty array for empty directory', () => {
    const result = getSubdirectories(tempDir);
    expect(result).toEqual([]);
  });

  it('does not recurse into nested directories', () => {
    mkdirSync(join(tempDir, 'parent', 'child'), { recursive: true });

    const result = getSubdirectories(tempDir);
    expect(result).toEqual(['parent']);
  });
});
