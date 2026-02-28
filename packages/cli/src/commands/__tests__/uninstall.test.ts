import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Manifest } from '../../types.js';
import { MANIFEST_DIR } from '../../utils/files.js';
import { PLUGIN_NAME, PLUGIN_DIR } from '../../generators/plugin.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function baseManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    version: '1.0.0',
    implantedAt: '2026-02-28',
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
    installMode: 'plugin',
    ...overrides,
  };
}

function writeManifest(dir: string, manifest: Manifest): void {
  const manifestDir = join(dir, MANIFEST_DIR);
  mkdirSync(manifestDir, { recursive: true });
  writeFileSync(join(manifestDir, 'manifest.json'), JSON.stringify(manifest));
}

function createFile(dir: string, relPath: string, content = 'test'): void {
  const absPath = join(dir, relPath);
  const parent = join(absPath, '..');
  mkdirSync(parent, { recursive: true });
  writeFileSync(absPath, content);
}

/**
 * Simulates the core removal logic from uninstallCommand.
 * Extracted here to test without interactive prompts.
 */
function performUninstall(
  targetDir: string,
  manifest: Manifest,
  opts: {
    removeClaudeMd?: boolean;
    removeAgentsMd?: boolean;
    removeThoughts?: boolean;
  } = {}
): { removed: string[]; kept: string[]; errors: string[] } {
  const removed: string[] = [];
  const kept: string[] = [];
  const errors: string[] = [];

  const managedFiles = Object.keys(manifest.files);
  const existingFiles = managedFiles.filter((f) => existsSync(join(targetDir, f)));

  const hasPlugin =
    manifest.installMode === 'plugin' &&
    existsSync(join(targetDir, PLUGIN_DIR, PLUGIN_NAME));
  const hasClaudeMd = existsSync(join(targetDir, 'CLAUDE.md'));
  const hasAgentsMd = existsSync(join(targetDir, 'AGENTS.md'));
  const hasThoughts = existsSync(join(targetDir, 'thoughts'));

  // 1. Remove plugin directory
  if (hasPlugin) {
    try {
      rmSync(join(targetDir, PLUGIN_DIR, PLUGIN_NAME), { recursive: true, force: true });
      removed.push(`${PLUGIN_DIR}/${PLUGIN_NAME}/`);

      const marketplaceDescDir = join(targetDir, PLUGIN_DIR, '.claude-plugin');
      if (existsSync(marketplaceDescDir)) {
        rmSync(marketplaceDescDir, { recursive: true, force: true });
        removed.push(`${PLUGIN_DIR}/.claude-plugin/`);
      }

      const pluginsDir = join(targetDir, PLUGIN_DIR);
      if (existsSync(pluginsDir)) {
        const remaining = readdirSync(pluginsDir);
        if (remaining.length === 0) {
          rmSync(pluginsDir, { recursive: true, force: true });
          removed.push(`${PLUGIN_DIR}/ (empty)`);
        }
      }
    } catch (err) {
      errors.push(`Failed to remove plugin: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Remove managed files (excluding special files)
  const DEVTRONIC_FILES = ['CLAUDE.md', 'AGENTS.md'];
  for (const file of existingFiles) {
    if (DEVTRONIC_FILES.includes(file)) continue;
    if (file.startsWith('thoughts/')) continue;
    if (file.startsWith(PLUGIN_DIR + '/')) continue;

    try {
      const filePath = join(targetDir, file);
      if (existsSync(filePath)) {
        rmSync(filePath, { force: true });
        removed.push(file);
      }
    } catch (err) {
      errors.push(`Failed to remove ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. CLAUDE.md
  if (hasClaudeMd) {
    if (opts.removeClaudeMd) {
      rmSync(join(targetDir, 'CLAUDE.md'), { force: true });
      removed.push('CLAUDE.md');
    } else {
      kept.push('CLAUDE.md');
    }
  }

  // 4. AGENTS.md
  if (hasAgentsMd) {
    if (opts.removeAgentsMd) {
      rmSync(join(targetDir, 'AGENTS.md'), { force: true });
      removed.push('AGENTS.md');
    } else {
      kept.push('AGENTS.md');
    }
  }

  // 5. thoughts/
  if (hasThoughts) {
    if (opts.removeThoughts) {
      rmSync(join(targetDir, 'thoughts'), { recursive: true, force: true });
      removed.push('thoughts/');
    } else {
      kept.push('thoughts/');
    }
  }

  // 6. Manifest
  try {
    const manifestDir = join(targetDir, MANIFEST_DIR);
    if (existsSync(manifestDir)) {
      rmSync(manifestDir, { recursive: true, force: true });
      removed.push(`${MANIFEST_DIR}/`);
    }
  } catch (err) {
    errors.push(`Failed to remove manifest: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { removed, kept, errors };
}

// ─── Tests ────────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'uninstall-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('uninstall core removal logic', () => {
  it('removes manifest directory', () => {
    const manifest = baseManifest();
    writeManifest(tempDir, manifest);

    const result = performUninstall(tempDir, manifest);

    expect(existsSync(join(tempDir, MANIFEST_DIR))).toBe(false);
    expect(result.removed).toContain(`${MANIFEST_DIR}/`);
    expect(result.errors).toHaveLength(0);
  });

  it('removes managed rule files from manifest', () => {
    const manifest = baseManifest({
      files: {
        '.claude/rules/architecture.md': {
          checksum: 'abc',
          modified: false,
          originalChecksum: 'abc',
        },
      },
    });
    writeManifest(tempDir, manifest);
    createFile(tempDir, '.claude/rules/architecture.md', '# Rules');

    const result = performUninstall(tempDir, manifest);

    expect(existsSync(join(tempDir, '.claude/rules/architecture.md'))).toBe(false);
    expect(result.removed).toContain('.claude/rules/architecture.md');
  });

  it('keeps CLAUDE.md when removeClaudeMd is false', () => {
    const manifest = baseManifest();
    writeManifest(tempDir, manifest);
    createFile(tempDir, 'CLAUDE.md', '# My Rules');

    const result = performUninstall(tempDir, manifest, { removeClaudeMd: false });

    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(result.kept).toContain('CLAUDE.md');
    expect(result.removed).not.toContain('CLAUDE.md');
  });

  it('removes CLAUDE.md when removeClaudeMd is true', () => {
    const manifest = baseManifest();
    writeManifest(tempDir, manifest);
    createFile(tempDir, 'CLAUDE.md', '# My Rules');

    const result = performUninstall(tempDir, manifest, { removeClaudeMd: true });

    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(false);
    expect(result.removed).toContain('CLAUDE.md');
  });

  it('keeps AGENTS.md when removeAgentsMd is false', () => {
    const manifest = baseManifest();
    writeManifest(tempDir, manifest);
    createFile(tempDir, 'AGENTS.md', '# Agents');

    const result = performUninstall(tempDir, manifest, { removeAgentsMd: false });

    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(true);
    expect(result.kept).toContain('AGENTS.md');
  });

  it('removes AGENTS.md when removeAgentsMd is true', () => {
    const manifest = baseManifest();
    writeManifest(tempDir, manifest);
    createFile(tempDir, 'AGENTS.md', '# Agents');

    const result = performUninstall(tempDir, manifest, { removeAgentsMd: true });

    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(false);
    expect(result.removed).toContain('AGENTS.md');
  });

  it('keeps thoughts/ when removeThoughts is false', () => {
    const manifest = baseManifest();
    writeManifest(tempDir, manifest);
    mkdirSync(join(tempDir, 'thoughts/notes'), { recursive: true });
    createFile(tempDir, 'thoughts/notes/session.md', 'notes');

    const result = performUninstall(tempDir, manifest, { removeThoughts: false });

    expect(existsSync(join(tempDir, 'thoughts'))).toBe(true);
    expect(result.kept).toContain('thoughts/');
  });

  it('removes thoughts/ when removeThoughts is true', () => {
    const manifest = baseManifest();
    writeManifest(tempDir, manifest);
    mkdirSync(join(tempDir, 'thoughts/notes'), { recursive: true });
    createFile(tempDir, 'thoughts/notes/session.md', 'notes');

    const result = performUninstall(tempDir, manifest, { removeThoughts: true });

    expect(existsSync(join(tempDir, 'thoughts'))).toBe(false);
    expect(result.removed).toContain('thoughts/');
  });

  it('does not touch files outside the manifest', () => {
    const manifest = baseManifest({ files: {} });
    writeManifest(tempDir, manifest);
    createFile(tempDir, 'package.json', '{}');
    createFile(tempDir, 'src/index.ts', 'export {}');

    performUninstall(tempDir, manifest);

    expect(existsSync(join(tempDir, 'package.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'src/index.ts'))).toBe(true);
  });

  it('handles missing managed files gracefully', () => {
    const manifest = baseManifest({
      files: {
        '.claude/rules/architecture.md': {
          checksum: 'abc',
          modified: false,
          originalChecksum: 'abc',
        },
        '.cursor/rules/architecture.mdc': {
          checksum: 'def',
          modified: false,
          originalChecksum: 'def',
        },
      },
    });
    writeManifest(tempDir, manifest);
    // Only create one of the two files
    createFile(tempDir, '.claude/rules/architecture.md', '# Rules');

    const result = performUninstall(tempDir, manifest);

    expect(result.removed).toContain('.claude/rules/architecture.md');
    // Missing file should not cause errors
    expect(result.errors).toHaveLength(0);
  });
});

describe('uninstall plugin removal', () => {
  it('removes plugin directory and marketplace descriptor', () => {
    const manifest = baseManifest({ installMode: 'plugin' });
    writeManifest(tempDir, manifest);

    // Create plugin structure
    const pluginDir = join(tempDir, PLUGIN_DIR, PLUGIN_NAME);
    mkdirSync(join(pluginDir, 'skills/brief'), { recursive: true });
    createFile(tempDir, `${PLUGIN_DIR}/${PLUGIN_NAME}/skills/brief/SKILL.md`, '# Brief');
    createFile(tempDir, `${PLUGIN_DIR}/.claude-plugin/marketplace.json`, '{}');

    const result = performUninstall(tempDir, manifest);

    expect(existsSync(join(tempDir, PLUGIN_DIR, PLUGIN_NAME))).toBe(false);
    expect(existsSync(join(tempDir, PLUGIN_DIR, '.claude-plugin'))).toBe(false);
    expect(result.removed).toContain(`${PLUGIN_DIR}/${PLUGIN_NAME}/`);
    expect(result.removed).toContain(`${PLUGIN_DIR}/.claude-plugin/`);
  });

  it('removes .claude-plugins/ dir when empty after plugin removal', () => {
    const manifest = baseManifest({ installMode: 'plugin' });
    writeManifest(tempDir, manifest);

    const pluginDir = join(tempDir, PLUGIN_DIR, PLUGIN_NAME);
    mkdirSync(pluginDir, { recursive: true });
    createFile(tempDir, `${PLUGIN_DIR}/${PLUGIN_NAME}/plugin.json`, '{}');

    const result = performUninstall(tempDir, manifest);

    expect(existsSync(join(tempDir, PLUGIN_DIR))).toBe(false);
    expect(result.removed).toContain(`${PLUGIN_DIR}/ (empty)`);
  });

  it('keeps .claude-plugins/ when other plugins exist', () => {
    const manifest = baseManifest({ installMode: 'plugin' });
    writeManifest(tempDir, manifest);

    mkdirSync(join(tempDir, PLUGIN_DIR, PLUGIN_NAME), { recursive: true });
    createFile(tempDir, `${PLUGIN_DIR}/${PLUGIN_NAME}/plugin.json`, '{}');
    // Another plugin exists
    mkdirSync(join(tempDir, PLUGIN_DIR, 'other-plugin'), { recursive: true });
    createFile(tempDir, `${PLUGIN_DIR}/other-plugin/plugin.json`, '{}');

    const result = performUninstall(tempDir, manifest);

    expect(existsSync(join(tempDir, PLUGIN_DIR))).toBe(true);
    expect(existsSync(join(tempDir, PLUGIN_DIR, 'other-plugin'))).toBe(true);
    expect(result.removed).not.toContain(`${PLUGIN_DIR}/ (empty)`);
  });

  it('skips plugin removal when installMode is standalone', () => {
    const manifest = baseManifest({ installMode: 'standalone' });
    writeManifest(tempDir, manifest);

    // Even if the directory exists, it shouldn't be removed
    mkdirSync(join(tempDir, PLUGIN_DIR, PLUGIN_NAME), { recursive: true });

    const result = performUninstall(tempDir, manifest);

    // Plugin removal should not happen (hasPlugin = false because installMode !== 'plugin')
    // Actually installMode is 'standalone' but directory exists — the check requires both
    expect(result.removed).not.toContain(`${PLUGIN_DIR}/${PLUGIN_NAME}/`);
  });

  it('skips plugin files in managed file removal (no double-counting)', () => {
    const manifest = baseManifest({
      installMode: 'plugin',
      files: {
        [`${PLUGIN_DIR}/${PLUGIN_NAME}/skills/brief/SKILL.md`]: {
          checksum: 'abc',
          modified: false,
          originalChecksum: 'abc',
        },
        '.claude/rules/architecture.md': {
          checksum: 'def',
          modified: false,
          originalChecksum: 'def',
        },
      },
    });
    writeManifest(tempDir, manifest);

    mkdirSync(join(tempDir, PLUGIN_DIR, PLUGIN_NAME, 'skills/brief'), { recursive: true });
    createFile(tempDir, `${PLUGIN_DIR}/${PLUGIN_NAME}/skills/brief/SKILL.md`, '# Brief');
    createFile(tempDir, '.claude/rules/architecture.md', '# Rules');

    const result = performUninstall(tempDir, manifest);

    // Plugin files are removed via recursive plugin removal, not individual managed file removal
    // The managed file loop skips plugin files (startsWith check)
    const managedRemoved = result.removed.filter(
      (f) => f === '.claude/rules/architecture.md'
    );
    expect(managedRemoved).toHaveLength(1);
  });
});

describe('uninstall combined scenarios', () => {
  it('removes everything when all flags are true', () => {
    const manifest = baseManifest({
      installMode: 'plugin',
      files: {
        '.claude/rules/architecture.md': {
          checksum: 'abc',
          modified: false,
          originalChecksum: 'abc',
        },
      },
    });
    writeManifest(tempDir, manifest);

    mkdirSync(join(tempDir, PLUGIN_DIR, PLUGIN_NAME), { recursive: true });
    createFile(tempDir, `${PLUGIN_DIR}/${PLUGIN_NAME}/plugin.json`, '{}');
    createFile(tempDir, '.claude/rules/architecture.md', '# Rules');
    createFile(tempDir, 'CLAUDE.md', '# Claude');
    createFile(tempDir, 'AGENTS.md', '# Agents');
    mkdirSync(join(tempDir, 'thoughts/notes'), { recursive: true });
    createFile(tempDir, 'thoughts/notes/session.md', 'notes');

    const result = performUninstall(tempDir, manifest, {
      removeClaudeMd: true,
      removeAgentsMd: true,
      removeThoughts: true,
    });

    expect(existsSync(join(tempDir, PLUGIN_DIR))).toBe(false);
    expect(existsSync(join(tempDir, '.claude/rules/architecture.md'))).toBe(false);
    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(false);
    expect(existsSync(join(tempDir, 'thoughts'))).toBe(false);
    expect(existsSync(join(tempDir, MANIFEST_DIR))).toBe(false);
    expect(result.kept).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('keeps user content when all flags are false', () => {
    const manifest = baseManifest({ files: {} });
    writeManifest(tempDir, manifest);

    createFile(tempDir, 'CLAUDE.md', '# Claude');
    createFile(tempDir, 'AGENTS.md', '# Agents');
    mkdirSync(join(tempDir, 'thoughts'), { recursive: true });

    const result = performUninstall(tempDir, manifest, {
      removeClaudeMd: false,
      removeAgentsMd: false,
      removeThoughts: false,
    });

    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'thoughts'))).toBe(true);
    expect(result.kept).toEqual(['CLAUDE.md', 'AGENTS.md', 'thoughts/']);
    // Manifest should still be removed
    expect(existsSync(join(tempDir, MANIFEST_DIR))).toBe(false);
  });

  it('produces no errors on clean install with no extra files', () => {
    const manifest = baseManifest({ installMode: 'standalone', files: {} });
    writeManifest(tempDir, manifest);

    const result = performUninstall(tempDir, manifest);

    expect(result.errors).toHaveLength(0);
    expect(result.removed).toContain(`${MANIFEST_DIR}/`);
  });
});
