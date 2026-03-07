/**
 * @generated-from thoughts/plans/2026-03-07_fix-skill-namespace.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests that skill name: fields in templates do NOT contain the devtronic: prefix.
 * Claude Code's plugin system adds the namespace automatically from the filesystem
 * location (.claude-plugins/devtronic/skills/). Putting devtronic: in the name: field
 * breaks skill registration because : is not valid in skill names.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CORE_SKILLS } from '../rules.js';

// ─── Locate templates directory ─────────────────────────────────────────────

const TEMPLATES_SKILLS_DIR = join(
  __dirname,
  '..', '..', '..', 'templates', 'claude-code', '.claude', 'skills'
);

function getTemplateSkillDirs(): string[] {
  if (!existsSync(TEMPLATES_SKILLS_DIR)) return [];
  return readdirSync(TEMPLATES_SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function readSkillFrontmatter(skillDir: string): string | null {
  const skillFile = join(TEMPLATES_SKILLS_DIR, skillDir, 'SKILL.md');
  if (!existsSync(skillFile)) return null;
  const content = readFileSync(skillFile, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)---/);
  return match ? match[1] : null;
}

function extractNameField(frontmatter: string): string | null {
  const match = frontmatter.match(/^name:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

// ─── Template SKILL.md files ────────────────────────────────────────────────

describe('Template SKILL.md name fields', () => {
  const skillDirs = getTemplateSkillDirs();

  it('should find template skill directories', () => {
    expect(skillDirs.length).toBeGreaterThan(0);
  });

  it.each(skillDirs)('%s should not have devtronic: prefix in name field', (skillDir) => {
    const frontmatter = readSkillFrontmatter(skillDir);
    if (!frontmatter) return; // skip if no SKILL.md

    const name = extractNameField(frontmatter);
    if (!name) return; // skip if no name field

    expect(name).not.toMatch(/^devtronic:/);
    expect(name).toMatch(/^[a-z0-9-]+$/); // only lowercase, numbers, hyphens
  });

  it('every template skill name should match its directory name', () => {
    for (const dir of skillDirs) {
      const frontmatter = readSkillFrontmatter(dir);
      if (!frontmatter) continue;

      const name = extractNameField(frontmatter);
      if (!name) continue;

      expect(name).toBe(dir);
    }
  });
});

// ─── CORE_SKILLS registry ───────────────────────────────────────────────────

describe('CORE_SKILLS registry', () => {
  it('should not have devtronic: prefix in any skill name', () => {
    for (const skill of CORE_SKILLS) {
      expect(skill.name).not.toMatch(/^devtronic:/);
      expect(skill.name).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('should have at least 15 core skills', () => {
    expect(CORE_SKILLS.length).toBeGreaterThanOrEqual(15);
  });

  it('should include essential skills', () => {
    const names = CORE_SKILLS.map((s) => s.name);
    expect(names).toContain('brief');
    expect(names).toContain('spec');
    expect(names).toContain('create-plan');
    expect(names).toContain('execute-plan');
    expect(names).toContain('generate-tests');
    expect(names).toContain('post-review');
  });
});

// ─── Generated AGENTS.md content ────────────────────────────────────────────

describe('generateAgentsMdFromConfig skill references', () => {
  // Lazy import to avoid circular issues
  let generateAgentsMdFromConfig: typeof import('../rules.js').generateAgentsMdFromConfig;

  function createConfig() {
    return {
      architecture: 'clean' as const,
      layers: ['domain', 'application', 'infrastructure', 'presentation'],
      stateManagement: [],
      dataFetching: [],
      orm: [],
      testing: [],
      ui: [],
      validation: [],
      framework: 'nextjs' as const,
      qualityCommand: 'npm run typecheck && npm run lint && npm test',
    };
  }

  function createScripts() {
    return {
      typecheck: 'typecheck',
      lint: 'lint',
      test: 'test',
      build: 'build',
      dev: 'dev',
    };
  }

  it('should reference skills without devtronic: prefix', async () => {
    const mod = await import('../rules.js');
    generateAgentsMdFromConfig = mod.generateAgentsMdFromConfig;

    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');

    // Should contain skill references like /brief, /spec
    expect(result).toContain('/brief');
    expect(result).toContain('/spec');

    // Should NOT contain devtronic: prefixed skill references
    expect(result).not.toMatch(/\/devtronic:[a-z]/);
  });
});
