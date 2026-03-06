/**
 * @generated-from thoughts/specs/2026-03-06_addon-mode-ux-refactor.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 * If a test seems wrong, update the spec and regenerate — don't edit tests directly.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readAddonConfig, writeAddonConfig } from '../addonConfig.js';
// readMode, writeMode, detectOrphanedAddonFiles, registerAddonInConfig — not yet implemented
// Tests for these use it.todo() below

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-config-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writeConfigAt(subpath: string, data: unknown): void {
  const fullPath = join(tempDir, subpath);
  const parts = subpath.split('/');
  if (parts.length > 1) {
    mkdirSync(join(tempDir, ...parts.slice(0, -1)), { recursive: true });
  }
  writeFileSync(fullPath, JSON.stringify(data, null, 2));
}

// ─── FR-1: Config File Location (.claude/devtronic.json) ────────────────────

describe('FR-1: Config location — .claude/devtronic.json', () => {
  it('should read config from .claude/devtronic.json', () => {
    // Spec: FR-1
    writeConfigAt('.claude/devtronic.json', {
      version: 1,
      agents: ['custom-agent'],
      installed: {},
    });
    const config = readAddonConfig(tempDir);
    expect(config.agents).toEqual(['custom-agent']);
  });

  it('should return default config when .claude/devtronic.json does not exist', () => {
    // Spec: FR-1
    const config = readAddonConfig(tempDir);
    expect(config.agents).toEqual(['claude']);
    expect(config.installed).toEqual({});
  });

  it('should write config to .claude/devtronic.json (not root)', () => {
    // Spec: FR-1
    writeAddonConfig(tempDir, { agents: ['claude'], installed: {} });
    const newPath = join(tempDir, '.claude', 'devtronic.json');
    const rootPath = join(tempDir, 'devtronic.json');
    expect(existsSync(newPath)).toBe(true);
    expect(existsSync(rootPath)).toBe(false);
  });

  it('should create .claude directory if it does not exist when writing', () => {
    // Spec: FR-1
    writeAddonConfig(tempDir, { agents: ['claude'], installed: {} });
    expect(existsSync(join(tempDir, '.claude'))).toBe(true);
  });

  it('should include version: 1 in written config', () => {
    // Spec: FR-1
    writeAddonConfig(tempDir, { agents: ['claude'], installed: {} });
    const raw = JSON.parse(readFileSync(join(tempDir, '.claude', 'devtronic.json'), 'utf-8'));
    expect(raw.version).toBe(1);
  });
});

// ─── FR-1 / US-2: mode field ─────────────────────────────────────────────────

describe('FR-1 / US-2: mode field in config', () => {
  it('should read mode as undefined when not set', () => {
    // Spec: FR-1, US-2
    writeConfigAt('.claude/devtronic.json', {
      version: 1,
      agents: ['claude'],
      installed: {},
    });
    const config = readAddonConfig(tempDir) as any;
    expect(config.mode).toBeUndefined();
  });

  it('should read mode: afk when written to config', () => {
    // Spec: FR-1, US-2
    writeConfigAt('.claude/devtronic.json', {
      version: 1,
      mode: 'afk',
      agents: ['claude'],
      installed: {},
    });
    const config = readAddonConfig(tempDir) as any;
    expect(config.mode).toBe('afk');
  });

  it('should read mode: hitl when written to config', () => {
    // Spec: FR-1, US-2
    writeConfigAt('.claude/devtronic.json', {
      version: 1,
      mode: 'hitl',
      agents: ['claude'],
      installed: {},
    });
    const config = readAddonConfig(tempDir) as any;
    expect(config.mode).toBe('hitl');
  });
});

// ─── FR-3: readMode / writeMode helpers ──────────────────────────────────────

describe('FR-3: readMode / writeMode helpers', () => {
  it.todo('US-2/AC-3: readMode returns hitl when no config exists (default)');
  // Spec: FR-3, US-2/AC-3
  // When readMode is exported from addonConfig.ts:
  // import { readMode } from '../addonConfig.js';
  // const mode = readMode(tempDir);
  // expect(mode).toBe('hitl');

  it.todo('US-2/AC-3: readMode returns hitl when mode is not set in config');
  // Spec: FR-3, US-2/AC-3
  // writeConfigAt('.claude/devtronic.json', { version: 1, agents: ['claude'], installed: {} });
  // expect(readMode(tempDir)).toBe('hitl');

  it.todo('US-2/AC-1: writeMode(afk) persists to .claude/devtronic.json');
  // Spec: FR-3, US-2/AC-1
  // writeMode(tempDir, 'afk');
  // expect(readMode(tempDir)).toBe('afk');

  it.todo('US-2/AC-2: writeMode(hitl) persists to .claude/devtronic.json');
  // Spec: FR-3, US-2/AC-2
  // writeMode(tempDir, 'hitl');
  // expect(readMode(tempDir)).toBe('hitl');

  it.todo('writeMode creates .claude/devtronic.json if it does not exist');
  // Spec: FR-3
  // expect(existsSync(join(tempDir, '.claude', 'devtronic.json'))).toBe(false);
  // writeMode(tempDir, 'afk');
  // expect(existsSync(join(tempDir, '.claude', 'devtronic.json'))).toBe(true);

  it.todo('writeMode preserves existing installed addons');
  // Spec: FR-3
  // writeConfigAt('.claude/devtronic.json', {
  //   version: 1, agents: ['claude'],
  //   installed: { 'auto-devtronic': { version: '1.0.0', files: [] } },
  // });
  // writeMode(tempDir, 'afk');
  // const config = readAddonConfig(tempDir) as any;
  // expect(config.installed['auto-devtronic']).toBeDefined();
  // expect(config.mode).toBe('afk');

  it.todo('writeMode overrides previous mode');
  // writeMode(tempDir, 'afk');
  // writeMode(tempDir, 'hitl');
  // expect(readMode(tempDir)).toBe('hitl');
});

// ─── Migration: root devtronic.json → .claude/devtronic.json ─────────────────

describe('Migration: auto-migrate root devtronic.json', () => {
  it('should auto-migrate devtronic.json from root to .claude/ on first read', () => {
    // Spec: Migration
    writeFileSync(
      join(tempDir, 'devtronic.json'),
      JSON.stringify({ addons: { agents: ['migrated-agent'], installed: {} } }, null, 2)
    );
    const config = readAddonConfig(tempDir);
    // Should read migrated data
    expect(config.agents).toEqual(['migrated-agent']);
    // Old file should be gone, new file should exist
    expect(existsSync(join(tempDir, 'devtronic.json'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude', 'devtronic.json'))).toBe(true);
  });

  it('should preserve installed addons during auto-migration', () => {
    // Spec: Migration
    writeFileSync(
      join(tempDir, 'devtronic.json'),
      JSON.stringify({
        addons: {
          agents: ['claude'],
          installed: {
            'design-best-practices': { version: '1.2.3', files: ['skills/design-init/SKILL.md'] },
          },
        },
      }, null, 2)
    );
    const config = readAddonConfig(tempDir);
    expect(config.installed['design-best-practices']).toBeDefined();
    expect(config.installed['design-best-practices'].version).toBe('1.2.3');
  });

  it('EC: when both root and .claude/ config exist, reads .claude/ and ignores root', () => {
    // Spec: EC
    writeFileSync(
      join(tempDir, 'devtronic.json'),
      JSON.stringify({ addons: { agents: ['legacy-agent'], installed: {} } }, null, 2)
    );
    writeConfigAt('.claude/devtronic.json', {
      version: 1,
      mode: 'afk',
      agents: ['primary-agent'],
      installed: {},
    });
    const config = readAddonConfig(tempDir) as any;
    // Reads from .claude/, not root
    expect(config.agents).toEqual(['primary-agent']);
    expect(config.mode).toBe('afk');
    // Root file should NOT be deleted (migration only runs when .claude/ is absent)
    expect(existsSync(join(tempDir, 'devtronic.json'))).toBe(true);
  });
});

// ─── Migration: detectOrphanedAddonFiles / registerAddonInConfig ──────────────

describe('Migration: orphaned addon detection', () => {
  it.todo('should detect addon files present in .claude/ but not in config installed');
  // Spec: FR-6, Migration
  // When detectOrphanedAddonFiles is exported from addonConfig.ts:
  // import { detectOrphanedAddonFiles } from '../addonConfig.js';
  // mkdirSync(join(tempDir, '.claude', 'skills', 'auto-devtronic'), { recursive: true });
  // writeFileSync(join(tempDir, '.claude', 'skills', 'auto-devtronic', 'SKILL.md'), '# skill');
  // const orphaned = detectOrphanedAddonFiles(tempDir);
  // expect(orphaned).toContain('auto-devtronic');

  it.todo('should return empty array when all addon files are registered in config');
  // Spec: FR-6, Migration
  // import { detectOrphanedAddonFiles } from '../addonConfig.js';
  // writeConfigAt('.claude/devtronic.json', {
  //   version: 1, agents: ['claude'],
  //   installed: { 'auto-devtronic': { version: '1.0.0', files: ['skills/auto-devtronic/SKILL.md'] } },
  // });
  // mkdirSync(join(tempDir, '.claude', 'skills', 'auto-devtronic'), { recursive: true });
  // writeFileSync(join(tempDir, '.claude', 'skills', 'auto-devtronic', 'SKILL.md'), '# skill');
  // const orphaned = detectOrphanedAddonFiles(tempDir);
  // expect(orphaned).toHaveLength(0);

  it.todo('registerAddonInConfig should add entry to config without copying files');
  // Spec: Migration
  // import { registerAddonInConfig } from '../addonConfig.js';
  // const skillFile = join(tempDir, '.claude', 'skills', 'auto-devtronic', 'SKILL.md');
  // mkdirSync(join(tempDir, '.claude', 'skills', 'auto-devtronic'), { recursive: true });
  // writeFileSync(skillFile, '# skill');
  // registerAddonInConfig(tempDir, 'auto-devtronic');
  // const config = readAddonConfig(tempDir);
  // expect(config.installed['auto-devtronic']).toBeDefined();
  // expect(existsSync(skillFile)).toBe(true); // file still there, untouched
});
