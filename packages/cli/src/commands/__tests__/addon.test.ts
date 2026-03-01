import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Manifest } from '../../types.js';
import { MANIFEST_DIR } from '../../utils/files.js';
import { PLUGIN_NAME, PLUGIN_DIR } from '../../generators/plugin.js';

// ─── Mock external I/O ────────────────────────────────────────────────────

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: { warn: vi.fn(), info: vi.fn(), message: vi.fn() },
  confirm: vi.fn().mockResolvedValue(true),
  note: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock('../../commands/init.js', () => ({
  TEMPLATES_DIR: join(import.meta.dirname, '../../../../templates'),
}));

vi.mock('../../utils/version.js', () => ({
  getCliVersion: () => '1.0.0',
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

const PLUGIN_ROOT = join(PLUGIN_DIR, PLUGIN_NAME);

function pluginManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    version: '1.0.0',
    implantedAt: '2026-01-01',
    selectedIDEs: ['claude-code'],
    projectConfig: {
      architecture: 'flat',
      layers: [],
      stateManagement: [],
      dataFetching: [],
      orm: [],
      testing: [],
      ui: [],
      validation: [],
      framework: 'nextjs',
      qualityCommand: 'npm run typecheck',
      enabledAddons: [],
    },
    files: {},
    installMode: 'plugin',
    pluginPath: PLUGIN_ROOT,
    ...overrides,
  };
}

function writeManifestFile(dir: string, manifest: Manifest): void {
  const mDir = join(dir, MANIFEST_DIR);
  mkdirSync(mDir, { recursive: true });
  writeFileSync(join(mDir, 'manifest.json'), JSON.stringify(manifest));
}

function createFile(dir: string, relPath: string, content = 'content'): void {
  const abs = join(dir, relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('addonCommand — add', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'devtronic-addon-add-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits gracefully when no manifest found', async () => {
    const { addonCommand } = await import('../addon.js');
    await expect(addonCommand('add', 'orchestration', { path: tmpDir })).resolves.not.toThrow();
  });

  it('exits gracefully when not in plugin mode', async () => {
    const manifest = pluginManifest({ installMode: 'standalone', pluginPath: undefined });
    writeManifestFile(tmpDir, manifest);
    const { addonCommand } = await import('../addon.js');
    await expect(addonCommand('add', 'orchestration', { path: tmpDir })).resolves.not.toThrow();
  });

  it('cancels on unknown addon name', async () => {
    const manifest = pluginManifest();
    writeManifestFile(tmpDir, manifest);
    const { addonCommand } = await import('../addon.js');
    await expect(addonCommand('add', 'nonexistent', { path: tmpDir })).rejects.toThrow();
  });

  it('warns and exits if addon already enabled', async () => {
    const manifest = pluginManifest({
      projectConfig: {
        architecture: 'flat', layers: [], stateManagement: [], dataFetching: [],
        orm: [], testing: [], ui: [], validation: [], framework: 'nextjs',
        qualityCommand: '', enabledAddons: ['orchestration'],
      },
    });
    writeManifestFile(tmpDir, manifest);
    const { addonCommand } = await import('../addon.js');
    await expect(addonCommand('add', 'orchestration', { path: tmpDir })).resolves.not.toThrow();
  });

  it('updates manifest enabledAddons when addon is added', async () => {
    const manifest = pluginManifest();
    writeManifestFile(tmpDir, manifest);

    const { addonCommand } = await import('../addon.js');
    await addonCommand('add', 'orchestration', { path: tmpDir });

    const { readManifest } = await import('../../utils/files.js');
    const updated = readManifest(tmpDir);
    expect(updated).not.toBeNull();
    expect(updated!.projectConfig?.enabledAddons).toContain('orchestration');
  });

  it('updates plugin.json and marketplace.json descriptors', async () => {
    const manifest = pluginManifest();
    // Pre-create descriptor files
    createFile(tmpDir, join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), '{}');
    createFile(tmpDir, join(PLUGIN_DIR, '.claude-plugin', 'marketplace.json'), '{}');
    writeManifestFile(tmpDir, manifest);

    const { addonCommand } = await import('../addon.js');
    await addonCommand('add', 'orchestration', { path: tmpDir });

    const { readFile } = await import('../../utils/files.js');
    const pluginJson = JSON.parse(readFile(join(tmpDir, PLUGIN_ROOT, '.claude-plugin', 'plugin.json')));
    expect(pluginJson.description).toContain('addon skills');
  });
});

describe('addonCommand — remove', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'devtronic-addon-remove-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits gracefully when addon not enabled', async () => {
    const manifest = pluginManifest();
    writeManifestFile(tmpDir, manifest);
    const { addonCommand } = await import('../addon.js');
    await expect(addonCommand('remove', 'orchestration', { path: tmpDir })).resolves.not.toThrow();
  });

  it('removes skill files and updates manifest', async () => {
    // Set up manifest with orchestration enabled and tracked files
    const skillFiles: Record<string, { checksum: string; modified: boolean; originalChecksum: string }> = {};
    const skills = ['briefing', 'recap', 'handoff'];

    for (const skill of skills) {
      const relPath = join(PLUGIN_ROOT, 'skills', skill, 'SKILL.md');
      createFile(tmpDir, relPath, `# ${skill}`);
      const checksum = 'abc123';
      skillFiles[relPath] = { checksum, modified: false, originalChecksum: checksum };
    }

    const manifest = pluginManifest({
      projectConfig: {
        architecture: 'flat', layers: [], stateManagement: [], dataFetching: [],
        orm: [], testing: [], ui: [], validation: [], framework: 'nextjs',
        qualityCommand: '', enabledAddons: ['orchestration'],
      },
      files: skillFiles,
    });
    writeManifestFile(tmpDir, manifest);

    const { addonCommand } = await import('../addon.js');
    await addonCommand('remove', 'orchestration', { path: tmpDir });

    // Read updated manifest
    const { readManifest } = await import('../../utils/files.js');
    const updated = readManifest(tmpDir);
    expect(updated!.projectConfig?.enabledAddons).toEqual([]);

    // Skill directories should be gone
    for (const skill of skills) {
      const skillDir = join(tmpDir, PLUGIN_ROOT, 'skills', skill);
      expect(existsSync(skillDir)).toBe(false);
    }

    // Skill files should not be in manifest
    for (const skill of skills) {
      const relPath = join(PLUGIN_ROOT, 'skills', skill, 'SKILL.md');
      expect(updated!.files[relPath]).toBeUndefined();
    }
  });

  it('warns about modified files before removing', async () => {
    const skill = 'briefing';
    const relPath = join(PLUGIN_ROOT, 'skills', skill, 'SKILL.md');
    createFile(tmpDir, relPath, 'modified content');

    const manifest = pluginManifest({
      projectConfig: {
        architecture: 'flat', layers: [], stateManagement: [], dataFetching: [],
        orm: [], testing: [], ui: [], validation: [], framework: 'nextjs',
        qualityCommand: '', enabledAddons: ['orchestration'],
      },
      files: {
        [relPath]: { checksum: 'original-hash', modified: false, originalChecksum: 'original-hash' },
      },
    });
    writeManifestFile(tmpDir, manifest);

    const clack = await import('@clack/prompts');
    const { addonCommand } = await import('../addon.js');
    await addonCommand('remove', 'orchestration', { path: tmpDir });

    // confirm should have been called due to modified files
    expect(clack.confirm).toHaveBeenCalled();
  });
});
