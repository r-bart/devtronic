import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { hasStandaloneSkills, buildDefaultConfig, cleanEmptyDirs } from '../update.js';
import type { Manifest, ManifestFile, ProjectAnalysis } from '../../types.js';

function createManifestFile(content: string): ManifestFile {
  const checksum = createHash('sha256').update(content).digest('hex').slice(0, 12);
  return { checksum, originalChecksum: checksum, modified: false };
}

function baseManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    version: '1.7.0',
    implantedAt: '2026-01-01',
    selectedIDEs: ['claude-code'],
    projectConfig: {
      architecture: 'clean',
      layers: ['domain', 'application', 'infrastructure', 'presentation'],
      stateManagement: [],
      dataFetching: [],
      orm: [],
      testing: [],
      ui: [],
      validation: [],
      framework: 'nextjs',
      qualityCommand: 'npm run typecheck && npm run lint && npm test',
    },
    files: {},
    ...overrides,
  };
}

function createAnalysis(overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis {
  return {
    architecture: { pattern: 'clean', layers: ['domain', 'application'], hasTests: true },
    framework: { name: 'nextjs', version: '14.0.0' },
    stack: {
      stateManagement: [],
      dataFetching: [],
      orm: [],
      testing: [],
      ui: [],
      validation: [],
      api: [],
    },
    scripts: {
      typecheck: 'tsc --noEmit',
      lint: 'eslint .',
      test: 'vitest run',
      build: 'tsup',
      dev: 'tsup --watch',
    },
    packageManager: 'npm',
    existingConfigs: {
      'claude-code': false,
      cursor: false,
      antigravity: false,
      'github-copilot': false,
    },
    hasTypescript: true,
    hasGit: true,
    ...overrides,
  };
}

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'agentic-update-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('hasStandaloneSkills', () => {
  it('returns true when manifest has .claude/skills/ files', () => {
    const manifest = baseManifest({
      files: {
        '.claude/skills/brief/SKILL.md': createManifestFile('# Brief'),
        '.claude/rules/architecture.md': createManifestFile('# Rules'),
      },
    });

    expect(hasStandaloneSkills(manifest)).toBe(true);
  });

  it('returns true when manifest has .claude/agents/ files', () => {
    const manifest = baseManifest({
      files: {
        '.claude/agents/code-reviewer.md': createManifestFile('# Reviewer'),
      },
    });

    expect(hasStandaloneSkills(manifest)).toBe(true);
  });

  it('returns false when manifest has no skills/agents', () => {
    const manifest = baseManifest({
      files: {
        '.claude/rules/architecture.md': createManifestFile('# Rules'),
        'CLAUDE.md': createManifestFile('# Claude'),
      },
    });

    expect(hasStandaloneSkills(manifest)).toBe(false);
  });

  it('returns false when manifest has plugin files instead of standalone', () => {
    const manifest = baseManifest({
      installMode: 'plugin',
      pluginPath: '.claude-plugins/tut-ai',
      files: {
        '.claude-plugins/tut-ai/skills/brief/SKILL.md': createManifestFile('# Brief'),
        '.claude-plugins/tut-ai/agents/code-reviewer.md': createManifestFile('# Reviewer'),
      },
    });

    expect(hasStandaloneSkills(manifest)).toBe(false);
  });

  it('returns false for empty manifest files', () => {
    const manifest = baseManifest({ files: {} });

    expect(hasStandaloneSkills(manifest)).toBe(false);
  });
});

describe('buildDefaultConfig', () => {
  it('builds config from analysis with detected scripts', () => {
    const analysis = createAnalysis({
      stack: {
        stateManagement: ['zustand'],
        dataFetching: ['react-query'],
        orm: [],
        testing: ['vitest'],
        ui: ['tailwind'],
        validation: ['zod'],
        api: [],
      },
      packageManager: 'pnpm',
    });

    const config = buildDefaultConfig(analysis);

    expect(config.architecture).toBe('clean');
    expect(config.framework).toBe('nextjs');
    expect(config.stateManagement).toEqual(['zustand']);
    expect(config.dataFetching).toEqual(['react-query']);
    expect(config.testing).toEqual(['vitest']);
    expect(config.ui).toEqual(['tailwind']);
    expect(config.validation).toEqual(['zod']);
    expect(config.qualityCommand).toBe('pnpm typecheck && pnpm lint && pnpm test');
  });

  it('uses npm run when package manager is npm', () => {
    const analysis = createAnalysis({
      scripts: {
        typecheck: 'tsc --noEmit',
        lint: 'eslint .',
        test: null,
        build: null,
        dev: null,
      },
      packageManager: 'npm',
    });

    const config = buildDefaultConfig(analysis);

    expect(config.qualityCommand).toBe('npm run typecheck && npm run lint');
  });

  it('falls back to typecheck && lint when no scripts detected', () => {
    const analysis = createAnalysis({
      architecture: { pattern: 'flat', layers: [], hasTests: false },
      scripts: {
        typecheck: null,
        lint: null,
        test: null,
        build: null,
        dev: null,
      },
      packageManager: 'npm',
    });

    const config = buildDefaultConfig(analysis);

    expect(config.qualityCommand).toBe('npm run typecheck && npm run lint');
  });

  it('handles null package manager by falling back to npm', () => {
    const analysis = createAnalysis({
      packageManager: null,
    });

    const config = buildDefaultConfig(analysis);

    expect(config.qualityCommand).toContain('npm run');
  });
});

describe('cleanEmptyDirs', () => {
  it('removes an empty directory', () => {
    const emptyDir = join(tempDir, 'empty');
    mkdirSync(emptyDir);

    cleanEmptyDirs(emptyDir);

    expect(existsSync(emptyDir)).toBe(false);
  });

  it('removes nested empty directories from leaf to root', () => {
    const nested = join(tempDir, 'a', 'b', 'c');
    mkdirSync(nested, { recursive: true });

    cleanEmptyDirs(join(tempDir, 'a'));

    expect(existsSync(join(tempDir, 'a'))).toBe(false);
  });

  it('preserves directories that contain files', () => {
    const dir = join(tempDir, 'has-file');
    mkdirSync(dir);
    writeFileSync(join(dir, 'keep.txt'), 'content');

    cleanEmptyDirs(dir);

    expect(existsSync(dir)).toBe(true);
    expect(existsSync(join(dir, 'keep.txt'))).toBe(true);
  });

  it('removes only empty branches, preserving branches with files', () => {
    const parent = join(tempDir, 'parent');
    mkdirSync(join(parent, 'empty-branch', 'empty-leaf'), { recursive: true });
    mkdirSync(join(parent, 'file-branch'), { recursive: true });
    writeFileSync(join(parent, 'file-branch', 'file.txt'), 'content');

    cleanEmptyDirs(parent);

    expect(existsSync(join(parent, 'empty-branch'))).toBe(false);
    expect(existsSync(join(parent, 'file-branch', 'file.txt'))).toBe(true);
  });

  it('handles non-existent directory gracefully', () => {
    const nonExistent = join(tempDir, 'does-not-exist');

    expect(() => cleanEmptyDirs(nonExistent)).not.toThrow();
  });
});
