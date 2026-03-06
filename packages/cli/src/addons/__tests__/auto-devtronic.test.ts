/**
 * Content validation tests for the auto-devtronic addon.
 * Validates file structure, manifest integrity, and key content assertions.
 * These are content tests, not logic tests.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── Addon source path ──────────────────────────────────────────────────────

const ADDON_ROOT = join(import.meta.dirname, '..', 'auto-devtronic');

// ─── Suite 1: Addon Structure ───────────────────────────────────────────────

describe('auto-devtronic addon structure', () => {
  it('addon source directory exists', () => {
    expect(existsSync(ADDON_ROOT)).toBe(true);
  });

  it('manifest.json exists and is valid JSON', () => {
    const manifestPath = join(ADDON_ROOT, 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('auto-devtronic');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.license).toBe('MIT');
  });

  it('manifest declares exactly 1 skill: auto-devtronic', () => {
    const manifest = JSON.parse(readFileSync(join(ADDON_ROOT, 'manifest.json'), 'utf-8'));
    expect(manifest.files.skills).toEqual(['auto-devtronic']);
  });

  it('manifest declares all 3 agents', () => {
    const manifest = JSON.parse(readFileSync(join(ADDON_ROOT, 'manifest.json'), 'utf-8'));
    expect(manifest.files.agents).toEqual(['issue-parser', 'failure-analyst', 'quality-runner']);
  });
});

// ─── Suite 2: Skill File ─────────────────────────────────────────────────────

describe('auto-devtronic skill file', () => {
  it('SKILL.md exists', () => {
    const skillPath = join(ADDON_ROOT, 'skills', 'auto-devtronic', 'SKILL.md');
    expect(existsSync(skillPath)).toBe(true);
  });

  it('SKILL.md has required frontmatter fields: name, description, allowed-tools', () => {
    const content = readFileSync(
      join(ADDON_ROOT, 'skills', 'auto-devtronic', 'SKILL.md'),
      'utf-8',
    );
    expect(content).toContain('name:');
    expect(content).toContain('description:');
    expect(content).toContain('allowed-tools:');
  });

  it('SKILL.md describes HITL and AFK modes', () => {
    const content = readFileSync(
      join(ADDON_ROOT, 'skills', 'auto-devtronic', 'SKILL.md'),
      'utf-8',
    );
    expect(content).toMatch(/hitl/i);
    expect(content).toMatch(/afk/i);
  });

  it('SKILL.md documents --max-retries flag', () => {
    const content = readFileSync(
      join(ADDON_ROOT, 'skills', 'auto-devtronic', 'SKILL.md'),
      'utf-8',
    );
    expect(content).toContain('max-retries');
  });

  it('SKILL.md references execute loop with retry logic', () => {
    const content = readFileSync(
      join(ADDON_ROOT, 'skills', 'auto-devtronic', 'SKILL.md'),
      'utf-8',
    );
    expect(content).toMatch(/attempt.*max_retries|while attempt/i);
  });
});

// ─── Suite 3: Agent Files ────────────────────────────────────────────────────

describe('auto-devtronic agent files', () => {
  const agents = ['issue-parser', 'failure-analyst', 'quality-runner'];

  for (const agent of agents) {
    it(`${agent}.md exists`, () => {
      const agentPath = join(ADDON_ROOT, 'agents', `${agent}.md`);
      expect(existsSync(agentPath)).toBe(true);
    });
  }

  it('failure-analyst uses sonnet model for quality analysis', () => {
    const content = readFileSync(join(ADDON_ROOT, 'agents', 'failure-analyst.md'), 'utf-8');
    expect(content).toContain('model: sonnet');
  });

  it('issue-parser uses haiku model for cost-efficiency', () => {
    const content = readFileSync(join(ADDON_ROOT, 'agents', 'issue-parser.md'), 'utf-8');
    expect(content).toContain('model: haiku');
  });

  it('quality-runner uses haiku model', () => {
    const content = readFileSync(join(ADDON_ROOT, 'agents', 'quality-runner.md'), 'utf-8');
    expect(content).toContain('model: haiku');
  });

  it('failure-analyst never recommends @ts-ignore or any', () => {
    const content = readFileSync(join(ADDON_ROOT, 'agents', 'failure-analyst.md'), 'utf-8');
    expect(content).toMatch(/never suggest.*any|never.*@ts-ignore|Never suggest `any` or `@ts-ignore`/i);
  });

  it('quality-runner output format includes Overall status', () => {
    const content = readFileSync(join(ADDON_ROOT, 'agents', 'quality-runner.md'), 'utf-8');
    expect(content).toMatch(/Overall/);
  });
});
