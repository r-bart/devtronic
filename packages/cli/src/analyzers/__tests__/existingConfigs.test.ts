/**
 * Detection of pre-existing IDE configuration. It drives the conflict prompt at
 * init, so a false positive makes devtronic ask about an install that is not
 * there, and a false negative overwrites one that is.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectExistingConfigs,
  getExistingConfigsList,
  hasAnyExistingConfig,
} from '../existingConfigs.js';
import type { IDE } from '../../types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-configs-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function seed(...paths: string[]): void {
  for (const path of paths) {
    const abs = join(tempDir, path);
    if (path.endsWith('/')) {
      mkdirSync(abs, { recursive: true });
    } else {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, '');
    }
  }
}

const ALL_IDES: IDE[] = [
  'claude-code',
  'cursor',
  'antigravity',
  'github-copilot',
  'opencode',
  'codex',
];

// ─── One entry per IDE ────────────────────────────────────────────────────────

describe('detectExistingConfigs', () => {
  it('reports every IDE as absent in an empty directory', () => {
    const result = detectExistingConfigs(tempDir);
    for (const ide of ALL_IDES) {
      expect(result[ide], `${ide} should be absent`).toBe(false);
    }
  });

  it('covers every IDE in the union', () => {
    // Guards against adding an IDE to the type and forgetting the detector.
    expect(Object.keys(detectExistingConfigs(tempDir)).sort()).toEqual([...ALL_IDES].sort());
  });

  const cases: Array<{ ide: IDE; paths: string[] }> = [
    { ide: 'claude-code', paths: ['.claude/'] },
    { ide: 'claude-code', paths: ['CLAUDE.md'] },
    { ide: 'cursor', paths: ['.cursor/'] },
    { ide: 'cursor', paths: ['.cursorrules'] },
    { ide: 'antigravity', paths: ['.agents/rules/'] },
    { ide: 'antigravity', paths: ['.antigravity/'] },
    { ide: 'github-copilot', paths: ['.github/copilot-instructions.md'] },
    { ide: 'opencode', paths: ['opencode.json'] },
    { ide: 'codex', paths: ['.codex/'] },
  ];

  for (const { ide, paths } of cases) {
    it(`detects ${ide} from ${paths.join(', ')}`, () => {
      seed(...paths);
      const result = detectExistingConfigs(tempDir);
      expect(result[ide]).toBe(true);
    });
  }
});

// ─── The Antigravity false positive ───────────────────────────────────────────

describe('detectExistingConfigs — .agents is shared, not Antigravity-owned', () => {
  // `.agents/skills/` is the portable Agent Skills directory devtronic writes
  // for Codex, Cursor, OpenCode and Copilot. Detecting on bare `.agents` would
  // read devtronic's own output as a pre-existing Antigravity install.
  it('does not read .agents/skills as an Antigravity install', () => {
    seed('.agents/skills/audit/SKILL.md');
    expect(detectExistingConfigs(tempDir).antigravity).toBe(false);
  });

  it('still detects Antigravity from .agents/rules', () => {
    seed('.agents/rules/architecture.md');
    expect(detectExistingConfigs(tempDir).antigravity).toBe(true);
  });

  it('detects Antigravity when both directories are present', () => {
    seed('.agents/skills/audit/SKILL.md', '.agents/rules/architecture.md');
    expect(detectExistingConfigs(tempDir).antigravity).toBe(true);
  });
});

// ─── Codex vs the shared directory ────────────────────────────────────────────

describe('detectExistingConfigs — Codex', () => {
  it('detects Codex from its own .codex directory', () => {
    seed('.codex/config.toml');
    expect(detectExistingConfigs(tempDir).codex).toBe(true);
  });

  it('does not infer Codex from the shared skills directory alone', () => {
    // `.agents/skills` is written for several runtimes, so it says nothing
    // about whether Codex itself is configured here.
    seed('.agents/skills/audit/SKILL.md');
    expect(detectExistingConfigs(tempDir).codex).toBe(false);
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

describe('getExistingConfigsList', () => {
  it('lists only the IDEs that are present', () => {
    seed('.claude/', 'opencode.json');
    const list = getExistingConfigsList(detectExistingConfigs(tempDir));
    expect(list.sort()).toEqual(['claude-code', 'opencode']);
  });

  it('returns an empty list for a clean directory', () => {
    expect(getExistingConfigsList(detectExistingConfigs(tempDir))).toEqual([]);
  });
});

describe('hasAnyExistingConfig', () => {
  it('is false for a clean directory', () => {
    expect(hasAnyExistingConfig(detectExistingConfigs(tempDir))).toBe(false);
  });

  it('is true as soon as one IDE is configured', () => {
    seed('.codex/config.toml');
    expect(hasAnyExistingConfig(detectExistingConfigs(tempDir))).toBe(true);
  });
});
