import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import {
  getAllFilesRecursive,
  ensureDir,
  fileExists,
  readManifest,
  writeManifest,
  readFile,
  writeFile,
  copyDir,
  calculateChecksum,
  isFileModified,
  createManifestEntry,
  MANIFEST_DIR,
  MANIFEST_FILE,
} from '../files.js';
import type { Manifest } from '../../types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'agentic-files-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('getAllFilesRecursive', () => {
  it('returns files in a flat directory', () => {
    writeFileSync(join(tempDir, 'a.md'), 'content a');
    writeFileSync(join(tempDir, 'b.md'), 'content b');

    const files = getAllFilesRecursive(tempDir);

    expect(files).toHaveLength(2);
    expect(files).toContain('a.md');
    expect(files).toContain('b.md');
  });

  it('returns files in nested directories with correct relative paths', () => {
    const subDir = join(tempDir, 'skill-name');
    mkdirSync(subDir);
    writeFileSync(join(subDir, 'SKILL.md'), 'content');

    const files = getAllFilesRecursive(tempDir);

    expect(files).toHaveLength(1);
    expect(files).toContain(join('skill-name', 'SKILL.md'));
  });

  it('returns all files in directory with supporting files (scaffold pattern)', () => {
    const scaffoldDir = join(tempDir, 'scaffold');
    mkdirSync(scaffoldDir);
    writeFileSync(join(scaffoldDir, 'SKILL.md'), 'main skill');
    writeFileSync(join(scaffoldDir, 'structures.md'), 'structures');
    writeFileSync(join(scaffoldDir, 'examples.md'), 'examples');

    const files = getAllFilesRecursive(tempDir);

    expect(files).toHaveLength(3);
    expect(files).toContain(join('scaffold', 'SKILL.md'));
    expect(files).toContain(join('scaffold', 'structures.md'));
    expect(files).toContain(join('scaffold', 'examples.md'));
  });

  it('returns empty array for empty directory', () => {
    const emptyDir = join(tempDir, 'empty');
    mkdirSync(emptyDir);

    const files = getAllFilesRecursive(emptyDir);

    expect(files).toEqual([]);
  });

  it('returns empty array for non-existent directory', () => {
    const files = getAllFilesRecursive(join(tempDir, 'does-not-exist'));

    expect(files).toEqual([]);
  });

  it('handles deeply nested structures', () => {
    const deep = join(tempDir, 'a', 'b', 'c');
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(deep, 'file.md'), 'deep');

    const files = getAllFilesRecursive(tempDir);

    expect(files).toHaveLength(1);
    expect(files).toContain(join('a', 'b', 'c', 'file.md'));
  });

  it('uses custom baseDir for relative paths', () => {
    const subDir = join(tempDir, 'sub');
    mkdirSync(subDir);
    writeFileSync(join(subDir, 'file.md'), 'content');

    const files = getAllFilesRecursive(subDir, tempDir);

    expect(files).toContain(join('sub', 'file.md'));
  });
});

describe('ensureDir', () => {
  it('creates directory if it does not exist', () => {
    const newDir = join(tempDir, 'new-dir');

    expect(fileExists(newDir)).toBe(false);
    ensureDir(newDir);
    expect(fileExists(newDir)).toBe(true);
  });

  it('does nothing if directory already exists', () => {
    const existingDir = join(tempDir, 'existing');
    mkdirSync(existingDir);

    // Should not throw
    ensureDir(existingDir);
    expect(fileExists(existingDir)).toBe(true);
  });

  it('creates nested directories recursively', () => {
    const nestedDir = join(tempDir, 'a', 'b', 'c');

    ensureDir(nestedDir);
    expect(fileExists(nestedDir)).toBe(true);
  });
});

describe('readManifest', () => {
  it('returns null when no manifest exists', () => {
    expect(readManifest(tempDir)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    const manifestDir = join(tempDir, MANIFEST_DIR);
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(join(manifestDir, MANIFEST_FILE), 'not json');

    expect(readManifest(tempDir)).toBeNull();
  });

  it('reads a complete manifest', () => {
    const manifest = {
      version: '1.7.0',
      implantedAt: '2026-01-01',
      selectedIDEs: ['claude-code'],
      projectConfig: { architecture: 'clean' },
      files: { 'a.md': { checksum: 'abc', modified: false, originalChecksum: 'abc' } },
    };
    const manifestDir = join(tempDir, MANIFEST_DIR);
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(join(manifestDir, MANIFEST_FILE), JSON.stringify(manifest));

    const result = readManifest(tempDir);

    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.7.0');
    expect(result!.implantedAt).toBe('2026-01-01');
    expect(result!.selectedIDEs).toEqual(['claude-code']);
    expect(result!.files['a.md'].checksum).toBe('abc');
  });

  it('normalizes legacy manifest missing version and implantedAt', () => {
    const legacy = {
      selectedIDEs: ['cursor'],
      files: {},
    };
    const manifestDir = join(tempDir, MANIFEST_DIR);
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(join(manifestDir, MANIFEST_FILE), JSON.stringify(legacy));

    const result = readManifest(tempDir);

    expect(result).not.toBeNull();
    expect(result!.version).toBe('unknown');
    expect(result!.implantedAt).toBe('unknown');
    expect(result!.selectedIDEs).toEqual(['cursor']);
  });

  it('normalizes completely empty manifest object', () => {
    const manifestDir = join(tempDir, MANIFEST_DIR);
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(join(manifestDir, MANIFEST_FILE), '{}');

    const result = readManifest(tempDir);

    expect(result).not.toBeNull();
    expect(result!.version).toBe('unknown');
    expect(result!.implantedAt).toBe('unknown');
    expect(result!.selectedIDEs).toEqual([]);
    expect(result!.projectConfig).toBeUndefined();
    expect(result!.files).toEqual({});
  });
});

describe('writeFile', () => {
  it('writes content to a file', () => {
    const filePath = join(tempDir, 'test.txt');

    writeFile(filePath, 'hello world');

    expect(readFileSync(filePath, 'utf-8')).toBe('hello world');
  });

  it('creates parent directories if they do not exist', () => {
    const filePath = join(tempDir, 'deep', 'nested', 'file.txt');

    writeFile(filePath, 'content');

    expect(readFileSync(filePath, 'utf-8')).toBe('content');
  });

  it('overwrites existing file', () => {
    const filePath = join(tempDir, 'overwrite.txt');
    writeFileSync(filePath, 'old');

    writeFile(filePath, 'new');

    expect(readFileSync(filePath, 'utf-8')).toBe('new');
  });
});

describe('copyDir', () => {
  it('copies a directory recursively', () => {
    const srcDir = join(tempDir, 'src');
    const destDir = join(tempDir, 'dest');
    mkdirSync(srcDir);
    writeFileSync(join(srcDir, 'a.txt'), 'aaa');

    copyDir(srcDir, destDir);

    expect(fileExists(join(destDir, 'a.txt'))).toBe(true);
    expect(readFile(join(destDir, 'a.txt'))).toBe('aaa');
  });
});

describe('calculateChecksum', () => {
  it('returns consistent MD5 hash for same content', () => {
    const hash1 = calculateChecksum('hello');
    const hash2 = calculateChecksum('hello');
    expect(hash1).toBe(hash2);
  });

  it('returns different hash for different content', () => {
    const hash1 = calculateChecksum('hello');
    const hash2 = calculateChecksum('world');
    expect(hash1).not.toBe(hash2);
  });

  it('returns a 32-character hex string', () => {
    const hash = calculateChecksum('test');
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe('writeManifest', () => {
  it('writes manifest JSON to .ai-template/manifest.json', () => {
    const manifest: Manifest = {
      version: '1.0.0',
      implantedAt: '2026-01-01',
      selectedIDEs: ['claude-code'],
      files: {},
    };

    writeManifest(tempDir, manifest);

    const manifestPath = join(tempDir, MANIFEST_DIR, MANIFEST_FILE);
    expect(fileExists(manifestPath)).toBe(true);
    const written = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(written.version).toBe('1.0.0');
    expect(written.selectedIDEs).toEqual(['claude-code']);
  });

  it('creates .ai-template directory if missing', () => {
    const manifest: Manifest = {
      version: '1.0.0',
      implantedAt: '2026-01-01',
      selectedIDEs: [],
      files: {},
    };

    writeManifest(tempDir, manifest);

    expect(fileExists(join(tempDir, MANIFEST_DIR))).toBe(true);
  });
});

describe('isFileModified', () => {
  it('returns false when file is not in manifest', () => {
    const manifest: Manifest = {
      version: '1.0.0',
      implantedAt: '2026-01-01',
      selectedIDEs: [],
      files: {},
    };

    expect(isFileModified(tempDir, 'missing.txt', manifest)).toBe(false);
  });

  it('returns true when file has been deleted from disk', () => {
    const manifest: Manifest = {
      version: '1.0.0',
      implantedAt: '2026-01-01',
      selectedIDEs: [],
      files: {
        'deleted.txt': { checksum: 'abc', modified: false, originalChecksum: 'abc' },
      },
    };

    expect(isFileModified(tempDir, 'deleted.txt', manifest)).toBe(true);
  });

  it('returns false when file content matches original checksum', () => {
    const content = 'original content';
    const checksum = calculateChecksum(content);
    writeFileSync(join(tempDir, 'same.txt'), content);

    const manifest: Manifest = {
      version: '1.0.0',
      implantedAt: '2026-01-01',
      selectedIDEs: [],
      files: {
        'same.txt': { checksum, modified: false, originalChecksum: checksum },
      },
    };

    expect(isFileModified(tempDir, 'same.txt', manifest)).toBe(false);
  });

  it('returns true when file content differs from original checksum', () => {
    writeFileSync(join(tempDir, 'changed.txt'), 'new content');

    const manifest: Manifest = {
      version: '1.0.0',
      implantedAt: '2026-01-01',
      selectedIDEs: [],
      files: {
        'changed.txt': {
          checksum: 'oldchecksum',
          modified: false,
          originalChecksum: 'oldchecksum',
        },
      },
    };

    expect(isFileModified(tempDir, 'changed.txt', manifest)).toBe(true);
  });
});

describe('createManifestEntry', () => {
  it('creates entry with matching checksum and originalChecksum', () => {
    const entry = createManifestEntry('test content');

    expect(entry.checksum).toBe(entry.originalChecksum);
    expect(entry.modified).toBe(false);
  });

  it('generates correct MD5 checksum', () => {
    const content = 'hello world';
    const entry = createManifestEntry(content);

    expect(entry.checksum).toBe(calculateChecksum(content));
  });
});
