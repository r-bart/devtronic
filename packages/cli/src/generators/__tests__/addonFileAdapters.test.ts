/**
 * Unit tests for format adapter functions in addonFiles.ts.
 *
 * The adapter functions (parseFrontmatter, markdownToGeminiToml,
 * stripFrontmatterName, stripFrontmatter) are module-private, so they are
 * tested indirectly through generateAddonFiles() by calling it with each
 * supported agent type and asserting on the installed file content.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateAddonFiles } from '../addonFiles.js';

// ─── Shared fixture ───────────────────────────────────────────────────────────

/** A realistic SKILL.md with YAML frontmatter — used across all adapter tests. */
const SKILL_CONTENT = `---
name: devtronic
description: Autonomous engineering loop
tags: [engineering, automation]
---
# Devtronic

Run the full autonomous engineering loop.
`;

let tempDir: string;
let addonSourceDir: string;

function setupAddonSource(skillContent: string = SKILL_CONTENT): void {
  addonSourceDir = join(tempDir, '_addon-source', 'test-addon');
  mkdirSync(join(addonSourceDir, 'skills', 'devtronic'), { recursive: true });
  writeFileSync(join(addonSourceDir, 'skills', 'devtronic', 'SKILL.md'), skillContent);
  writeFileSync(
    join(addonSourceDir, 'manifest.json'),
    JSON.stringify({
      name: 'test-addon',
      version: '1.0.0',
      license: 'MIT',
      files: { skills: ['devtronic'] },
    })
  );
}

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-adapters-'));
  setupAddonSource();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// ─── Claude adapter ───────────────────────────────────────────────────────────

describe('Claude adapter — passthrough Markdown', () => {
  it('installs skill to .claude/skills/devtronic/SKILL.md', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['claude']);

    const destPath = join(projectDir, '.claude', 'skills', 'devtronic', 'SKILL.md');
    const content = readFileSync(destPath, 'utf-8');
    expect(content).toBe(SKILL_CONTENT);
  });

  it('preserves frontmatter and body without modification', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['claude']);

    const content = readFileSync(join(projectDir, '.claude', 'skills', 'devtronic', 'SKILL.md'), 'utf-8');
    expect(content).toContain('name: devtronic');
    expect(content).toContain('description: Autonomous engineering loop');
    expect(content).toContain('# Devtronic');
    expect(content).toContain('Run the full autonomous engineering loop.');
  });
});

// ─── Gemini adapter ───────────────────────────────────────────────────────────

describe('Gemini adapter — passthrough Markdown', () => {
  it('installs skill to .gemini/skills/devtronic/SKILL.md', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['gemini']);

    const destPath = join(projectDir, '.gemini', 'skills', 'devtronic', 'SKILL.md');
    const content = readFileSync(destPath, 'utf-8');
    expect(content).toBe(SKILL_CONTENT);
  });

  it('preserves frontmatter and body without modification', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['gemini']);

    const content = readFileSync(join(projectDir, '.gemini', 'skills', 'devtronic', 'SKILL.md'), 'utf-8');
    expect(content).toContain('name: devtronic');
    expect(content).toContain('description: Autonomous engineering loop');
    expect(content).toContain('# Devtronic');
    expect(content).toContain('Run the full autonomous engineering loop.');
  });
});

// ─── OpenCode adapter ─────────────────────────────────────────────────────────

describe('OpenCode adapter — strip name: from frontmatter', () => {
  it('installs skill to .opencode/command/devtronic.md', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['opencode']);

    const destPath = join(projectDir, '.opencode', 'command', 'devtronic.md');
    const content = readFileSync(destPath, 'utf-8');
    expect(content).toBeDefined();
  });

  it('removes the name: field from frontmatter', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['opencode']);

    const content = readFileSync(join(projectDir, '.opencode', 'command', 'devtronic.md'), 'utf-8');
    expect(content).not.toMatch(/^name:/m);
  });

  it('preserves other frontmatter fields', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['opencode']);

    const content = readFileSync(join(projectDir, '.opencode', 'command', 'devtronic.md'), 'utf-8');
    expect(content).toContain('description: Autonomous engineering loop');
    expect(content).toContain('tags: [engineering, automation]');
  });

  it('keeps the frontmatter delimiters (--- ... ---)', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['opencode']);

    const content = readFileSync(join(projectDir, '.opencode', 'command', 'devtronic.md'), 'utf-8');
    expect(content).toContain('---');
  });

  it('preserves the body after frontmatter', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['opencode']);

    const content = readFileSync(join(projectDir, '.opencode', 'command', 'devtronic.md'), 'utf-8');
    expect(content).toContain('# Devtronic');
    expect(content).toContain('Run the full autonomous engineering loop.');
  });

  it('is a no-op for a SKILL.md with no frontmatter', () => {
    const noFrontmatterContent = `# No Frontmatter\n\nBody only.\n`;
    writeFileSync(join(addonSourceDir, 'skills', 'devtronic', 'SKILL.md'), noFrontmatterContent);

    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['opencode']);

    const content = readFileSync(join(projectDir, '.opencode', 'command', 'devtronic.md'), 'utf-8');
    expect(content).toBe(noFrontmatterContent);
  });
});

// ─── Cursor adapter ───────────────────────────────────────────────────────────

describe('Cursor adapter — passthrough Markdown', () => {
  it('installs skill to .cursor/skills/devtronic/SKILL.md', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['cursor']);

    const destPath = join(projectDir, '.cursor', 'skills', 'devtronic', 'SKILL.md');
    const content = readFileSync(destPath, 'utf-8');
    expect(content).toBe(SKILL_CONTENT);
  });

  it('preserves frontmatter and body without modification', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['cursor']);

    const content = readFileSync(join(projectDir, '.cursor', 'skills', 'devtronic', 'SKILL.md'), 'utf-8');
    expect(content).toContain('name: devtronic');
    expect(content).toContain('description: Autonomous engineering loop');
    expect(content).toContain('# Devtronic');
    expect(content).toContain('Run the full autonomous engineering loop.');
  });
});

// ─── Codex adapter ────────────────────────────────────────────────────────────

describe('Codex adapter — passthrough Markdown at skills/<name>/SKILL.md', () => {
  it('installs skill to .codex/skills/devtronic/SKILL.md', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['codex']);

    const destPath = join(projectDir, '.codex', 'skills', 'devtronic', 'SKILL.md');
    const content = readFileSync(destPath, 'utf-8');
    expect(content).toBe(SKILL_CONTENT);
  });

  it('preserves frontmatter and body without modification', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);

    generateAddonFiles(projectDir, addonSourceDir, ['codex']);

    const content = readFileSync(
      join(projectDir, '.codex', 'skills', 'devtronic', 'SKILL.md'),
      'utf-8'
    );
    expect(content).toContain('name: devtronic');
    expect(content).toContain('description: Autonomous engineering loop');
    expect(content).toContain('# Devtronic');
    expect(content).toContain('Run the full autonomous engineering loop.');
  });
});
