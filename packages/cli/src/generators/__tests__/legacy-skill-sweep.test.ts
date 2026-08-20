/**
 * Legacy directory sweep on addon removal.
 *
 * Codex skills moved from `.codex/skills/<name>/SKILL.md` to
 * `.agents/skills/<name>/SKILL.md`, and OpenCode skills from
 * `.opencode/command/<name>.md` to `.opencode/skills/<name>/SKILL.md`. An
 * upgrade leaves the old copies behind, and both runtimes still read them — so
 * a stale skill keeps loading long after the addon is gone. Removal has to
 * sweep the old locations as well as the current one.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateAddonFiles, removeAddonFiles } from '../addonFiles.js';

const SKILL = `---
name: devtronic
description: Autonomous engineering loop
---
# Devtronic
`;

let tempDir: string;
let addonSourceDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-legacy-'));
  addonSourceDir = join(tempDir, '_addon-source', 'test-addon');
  mkdirSync(join(addonSourceDir, 'skills', 'devtronic'), { recursive: true });
  writeFileSync(join(addonSourceDir, 'skills', 'devtronic', 'SKILL.md'), SKILL);
  writeFileSync(
    join(addonSourceDir, 'manifest.json'),
    JSON.stringify({
      name: 'test-addon',
      version: '1.0.0',
      license: 'MIT',
      files: { skills: ['devtronic'] },
    })
  );
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function project(): string {
  const dir = join(tempDir, 'project');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Writes a skill where an older devtronic version would have put it. */
function seedLegacy(projectDir: string, relPath: string): string {
  const abs = join(projectDir, relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, SKILL);
  return abs;
}

// ─── Codex: .codex/skills → .agents/skills ────────────────────────────────────

describe('Codex legacy sweep', () => {
  it('removes a skill left at .codex/skills/<name>/SKILL.md', () => {
    const projectDir = project();
    mkdirSync(join(projectDir, '.codex', 'skills', 'devtronic'), { recursive: true });
    const legacy = seedLegacy(projectDir, '.codex/skills/devtronic/SKILL.md');
    expect(existsSync(legacy)).toBe(true);

    removeAddonFiles(projectDir, 'test-addon', ['codex'], addonSourceDir);

    expect(existsSync(legacy)).toBe(false);
  });

  it('removes both the current and the legacy copy in one pass', () => {
    const projectDir = project();
    generateAddonFiles(projectDir, addonSourceDir, ['codex']);
    mkdirSync(join(projectDir, '.codex', 'skills', 'devtronic'), { recursive: true });
    const legacy = seedLegacy(projectDir, '.codex/skills/devtronic/SKILL.md');
    const current = join(projectDir, '.agents', 'skills', 'devtronic', 'SKILL.md');
    expect(existsSync(current)).toBe(true);

    removeAddonFiles(projectDir, 'test-addon', ['codex'], addonSourceDir);

    expect(existsSync(current)).toBe(false);
    expect(existsSync(legacy)).toBe(false);
  });

  it('leaves an unrelated file in the legacy directory alone', () => {
    const projectDir = project();
    mkdirSync(join(projectDir, '.codex', 'skills', 'someone-elses'), { recursive: true });
    const other = seedLegacy(projectDir, '.codex/skills/someone-elses/SKILL.md');

    removeAddonFiles(projectDir, 'test-addon', ['codex'], addonSourceDir);

    expect(existsSync(other)).toBe(true);
  });

  it('does not touch the Codex config directory itself', () => {
    const projectDir = project();
    mkdirSync(join(projectDir, '.codex'), { recursive: true });
    const config = join(projectDir, '.codex', 'config.toml');
    writeFileSync(config, 'model = "gpt-5"\n');

    removeAddonFiles(projectDir, 'test-addon', ['codex'], addonSourceDir);

    expect(existsSync(config)).toBe(true);
  });
});

// ─── OpenCode: .opencode/command/<name>.md → .opencode/skills ─────────────────

describe('OpenCode legacy sweep', () => {
  it('removes a skill left at .opencode/command/<name>.md', () => {
    const projectDir = project();
    mkdirSync(join(projectDir, '.opencode', 'command'), { recursive: true });
    const legacy = seedLegacy(projectDir, '.opencode/command/devtronic.md');
    expect(existsSync(legacy)).toBe(true);

    removeAddonFiles(projectDir, 'test-addon', ['opencode'], addonSourceDir);

    expect(existsSync(legacy)).toBe(false);
  });

  it('removes both the current and the legacy copy in one pass', () => {
    const projectDir = project();
    generateAddonFiles(projectDir, addonSourceDir, ['opencode']);
    mkdirSync(join(projectDir, '.opencode', 'command'), { recursive: true });
    const legacy = seedLegacy(projectDir, '.opencode/command/devtronic.md');
    const current = join(projectDir, '.opencode', 'skills', 'devtronic', 'SKILL.md');
    expect(existsSync(current)).toBe(true);

    removeAddonFiles(projectDir, 'test-addon', ['opencode'], addonSourceDir);

    expect(existsSync(current)).toBe(false);
    expect(existsSync(legacy)).toBe(false);
  });

  it('leaves another command file alone', () => {
    const projectDir = project();
    mkdirSync(join(projectDir, '.opencode', 'command'), { recursive: true });
    const other = seedLegacy(projectDir, '.opencode/command/my-own.md');

    removeAddonFiles(projectDir, 'test-addon', ['opencode'], addonSourceDir);

    expect(existsSync(other)).toBe(true);
  });
});

// ─── Runtimes without a legacy directory ──────────────────────────────────────

describe('runtimes with no legacy directory', () => {
  it('removes the Claude skill and touches nothing else', () => {
    const projectDir = project();
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    const current = join(projectDir, '.claude', 'skills', 'devtronic', 'SKILL.md');
    expect(existsSync(current)).toBe(true);

    removeAddonFiles(projectDir, 'test-addon', ['claude'], addonSourceDir);

    expect(existsSync(current)).toBe(false);
  });

  it('is a no-op when nothing was ever installed', () => {
    const projectDir = project();
    expect(() =>
      removeAddonFiles(projectDir, 'test-addon', ['codex', 'opencode'], addonSourceDir)
    ).not.toThrow();
  });
});
