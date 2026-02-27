import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  chmodSync,
  statSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkManifestValid,
  checkManifestFiles,
  checkScriptPermissions,
  checkQualityScripts,
  checkThoughtsDir,
} from '../doctor.js';
import type { Manifest } from '../../types.js';

function baseManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    version: '1.0.0',
    implantedAt: '2026-02-27',
    selectedIDEs: ['claude-code'],
    projectConfig: {
      architecture: 'clean',
      layers: ['domain'],
      stateManagement: [],
      dataFetching: [],
      orm: [],
      testing: [],
      ui: [],
      validation: [],
      framework: 'nextjs',
      qualityCommand: 'npm run typecheck',
    },
    files: {},
    ...overrides,
  };
}

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'doctor-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('checkManifestValid', () => {
  it('returns pass for valid manifest with IDEs and files', () => {
    const manifest = baseManifest({
      files: { 'AGENTS.md': { checksum: 'abc', originalChecksum: 'abc', modified: false } },
    });
    const result = checkManifestValid(manifest);
    expect(result.status).toBe('pass');
    expect(result.message).toContain('v1.0.0');
  });

  it('returns fail for null manifest', () => {
    const result = checkManifestValid(null);
    expect(result.status).toBe('fail');
  });

  it('returns warn when IDEs are missing', () => {
    const manifest = baseManifest({
      selectedIDEs: [],
      files: { 'AGENTS.md': { checksum: 'abc', originalChecksum: 'abc', modified: false } },
    });
    const result = checkManifestValid(manifest);
    expect(result.status).toBe('warn');
    expect(result.message).toContain('IDEs');
  });

  it('returns warn when files are empty', () => {
    const manifest = baseManifest({ files: {} });
    const result = checkManifestValid(manifest);
    expect(result.status).toBe('warn');
    expect(result.message).toContain('files');
  });
});

describe('checkManifestFiles', () => {
  it('returns pass when all files exist', () => {
    writeFileSync(join(tempDir, 'AGENTS.md'), '# Agents');
    const manifest = baseManifest({
      files: { 'AGENTS.md': { checksum: 'abc', originalChecksum: 'abc', modified: false } },
    });
    const result = checkManifestFiles(tempDir, manifest);
    expect(result.status).toBe('pass');
    expect(result.message).toContain('1/1');
  });

  it('returns warn when fewer than half the files are missing', () => {
    writeFileSync(join(tempDir, 'AGENTS.md'), '# Agents');
    writeFileSync(join(tempDir, 'CLAUDE.md'), '# Claude');
    writeFileSync(join(tempDir, 'rules.md'), '# Rules');
    const manifest = baseManifest({
      files: {
        'AGENTS.md': { checksum: 'abc', originalChecksum: 'abc', modified: false },
        'CLAUDE.md': { checksum: 'def', originalChecksum: 'def', modified: false },
        'rules.md': { checksum: 'ghi', originalChecksum: 'ghi', modified: false },
        'missing.md': { checksum: 'jkl', originalChecksum: 'jkl', modified: false },
      },
    });
    const result = checkManifestFiles(tempDir, manifest);
    expect(result.status).toBe('warn');
    expect(result.message).toContain('1 missing');
  });

  it('returns fail when more than half the files are missing', () => {
    const manifest = baseManifest({
      files: {
        'a.md': { checksum: 'a', originalChecksum: 'a', modified: false },
        'b.md': { checksum: 'b', originalChecksum: 'b', modified: false },
        'c.md': { checksum: 'c', originalChecksum: 'c', modified: false },
      },
    });
    const result = checkManifestFiles(tempDir, manifest);
    expect(result.status).toBe('fail');
  });
});

describe('checkScriptPermissions', () => {
  it('returns pass when no plugin path exists', () => {
    const manifest = baseManifest();
    const result = checkScriptPermissions(tempDir, manifest);
    expect(result.status).toBe('pass');
  });

  it('returns pass when scripts are executable', () => {
    const pluginDir = join(tempDir, 'plugin');
    const scriptsDir = join(pluginDir, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    writeFileSync(join(scriptsDir, 'test.sh'), '#!/bin/bash\necho ok');
    chmodSync(join(scriptsDir, 'test.sh'), 0o755);

    const manifest = baseManifest({ pluginPath: 'plugin' });
    const result = checkScriptPermissions(tempDir, manifest);
    expect(result.status).toBe('pass');
  });

  it('returns warn with fix when scripts lack execute permission', () => {
    const pluginDir = join(tempDir, 'plugin');
    const scriptsDir = join(pluginDir, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    writeFileSync(join(scriptsDir, 'test.sh'), '#!/bin/bash\necho ok');
    chmodSync(join(scriptsDir, 'test.sh'), 0o644);

    const manifest = baseManifest({ pluginPath: 'plugin' });
    const result = checkScriptPermissions(tempDir, manifest);
    expect(result.status).toBe('warn');
    expect(result.fixable).toBe(true);
    expect(result.fix).toBeDefined();
  });

  it('fix function makes scripts executable', () => {
    const pluginDir = join(tempDir, 'plugin');
    const scriptsDir = join(pluginDir, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    const scriptPath = join(scriptsDir, 'test.sh');
    writeFileSync(scriptPath, '#!/bin/bash\necho ok');
    chmodSync(scriptPath, 0o644);

    const manifest = baseManifest({ pluginPath: 'plugin' });
    const result = checkScriptPermissions(tempDir, manifest);
    result.fix!();

    const stat = statSync(scriptPath);
    expect(stat.mode & 0o111).toBeTruthy();
  });
});

describe('checkQualityScripts', () => {
  it('returns pass when all quality scripts exist', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: { typecheck: 'tsc', lint: 'eslint .', test: 'vitest' },
      })
    );
    const result = checkQualityScripts(tempDir);
    expect(result.status).toBe('pass');
  });

  it('returns warn when some scripts are missing', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: { typecheck: 'tsc', lint: 'eslint .' },
      })
    );
    const result = checkQualityScripts(tempDir);
    expect(result.status).toBe('warn');
    expect(result.message).toContain('test');
  });

  it('returns warn when no package.json found', () => {
    const noPackageDir = join(tempDir, 'empty');
    mkdirSync(noPackageDir);
    const result = checkQualityScripts(noPackageDir);
    expect(result.status).toBe('warn');
  });
});

describe('checkThoughtsDir', () => {
  it('returns pass when thoughts/ exists', () => {
    mkdirSync(join(tempDir, 'thoughts'));
    const result = checkThoughtsDir(tempDir);
    expect(result.status).toBe('pass');
  });

  it('returns warn with fix when thoughts/ is missing', () => {
    const result = checkThoughtsDir(tempDir);
    expect(result.status).toBe('warn');
    expect(result.fixable).toBe(true);
    expect(result.fix).toBeDefined();
  });

  it('fix function creates thoughts directory structure', () => {
    const result = checkThoughtsDir(tempDir);
    result.fix!();

    expect(existsSync(join(tempDir, 'thoughts/specs'))).toBe(true);
    expect(existsSync(join(tempDir, 'thoughts/research'))).toBe(true);
    expect(existsSync(join(tempDir, 'thoughts/plans'))).toBe(true);
    expect(existsSync(join(tempDir, 'thoughts/checkpoints'))).toBe(true);
    expect(existsSync(join(tempDir, 'thoughts/notes'))).toBe(true);
    expect(existsSync(join(tempDir, 'thoughts/debug'))).toBe(true);
    expect(existsSync(join(tempDir, 'thoughts/audit'))).toBe(true);
    expect(existsSync(join(tempDir, 'thoughts/archive/backlog'))).toBe(true);
  });
});
