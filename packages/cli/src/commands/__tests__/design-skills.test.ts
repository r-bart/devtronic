/**
 * @generated-from thoughts/plans/2026-03-04_design-phase.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Structural validation for design phase skills and agents.
 * Tests fail while files don't exist; pass after /execute-plan completes.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../../../');
const SKILLS_DIR = resolve(REPO_ROOT, '.claude/skills');
const AGENTS_DIR = resolve(REPO_ROOT, '.claude/agents');

// --- helpers ---

function readSkill(folder: string): string {
  return readFileSync(resolve(SKILLS_DIR, folder, 'SKILL.md'), 'utf-8');
}

function readAgent(name: string): string {
  return readFileSync(resolve(AGENTS_DIR, `${name}.md`), 'utf-8');
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  return Object.fromEntries(
    match[1].split('\n').map((line) => {
      const [key, ...rest] = line.split(':');
      return [key.trim(), rest.join(':').trim()];
    })
  );
}

function lineCount(content: string): number {
  return content.split('\n').length;
}

// --- design skills ---

const DESIGN_SKILLS: { folder: string; name: string; dispatcher?: boolean }[] = [
  { folder: 'design', name: 'design', dispatcher: true },
  { folder: 'design-research', name: 'design:research' },
  { folder: 'design-define', name: 'design:define' },
  { folder: 'design-ia', name: 'design:ia' },
  { folder: 'design-wireframe', name: 'design:wireframe' },
  { folder: 'design-system', name: 'design:system', dispatcher: true },
  { folder: 'design-system-define', name: 'design:system-define' },
  { folder: 'design-system-audit', name: 'design:system-audit' },
  { folder: 'design-system-sync', name: 'design:system-sync' },
  { folder: 'design-audit', name: 'design:audit' },
  { folder: 'design-review', name: 'design:review' },
  { folder: 'design-spec', name: 'design:spec' },
];

const DESIGN_AGENTS: { name: string; model: string; readOnly?: boolean }[] = [
  { name: 'ux-researcher', model: 'sonnet' },
  { name: 'ia-architect', model: 'sonnet' },
  { name: 'design-critic', model: 'sonnet' },
  { name: 'a11y-auditor', model: 'haiku' },
  { name: 'design-token-extractor', model: 'haiku' },
  { name: 'design-system-guardian', model: 'haiku', readOnly: true },
  { name: 'visual-qa', model: 'sonnet' },
];

// --- skill tests ---

describe('Design Skills - File existence', () => {
  for (const { folder } of DESIGN_SKILLS) {
    it(`${folder}/SKILL.md exists`, () => {
      // Spec: Phase plan task for skill ${folder}
      expect(existsSync(resolve(SKILLS_DIR, folder, 'SKILL.md'))).toBe(true);
    });
  }
});

describe('Design Skills - Frontmatter', () => {
  for (const { folder, name } of DESIGN_SKILLS) {
    it(`${folder} has required frontmatter fields`, () => {
      // Spec: All skills must have name, description, allowed-tools, argument-hint
      const content = readSkill(folder);
      const fm = parseFrontmatter(content);

      expect(fm['name'], 'missing name').toBeTruthy();
      expect(fm['name']).toBe(name);
      expect(fm['description'], 'missing description').toBeTruthy();
      expect(fm['allowed-tools'], 'missing allowed-tools').toBeTruthy();
      expect(fm['argument-hint'], 'missing argument-hint').toBeTruthy();
    });
  }
});

describe('Design Skills - Size constraints', () => {
  for (const { folder, dispatcher } of DESIGN_SKILLS) {
    if (dispatcher) {
      it(`${folder} dispatcher is ≤ 80 lines`, () => {
        // Spec: Dispatcher skills must be thin routers (~50 lines, max 80)
        const content = readSkill(folder);
        expect(lineCount(content)).toBeLessThanOrEqual(80);
      });
    } else {
      it(`${folder} skill is ≤ 500 lines`, () => {
        // Spec: No skill file exceeds 500 lines
        const content = readSkill(folder);
        expect(lineCount(content)).toBeLessThanOrEqual(500);
      });
    }
  }
});

describe('Design Skills - Dispatcher routing', () => {
  it('design dispatcher documents all sub-skill flags', () => {
    // Spec: /design dispatcher must document all flags it routes
    const content = readSkill('design');
    const flags = ['--research', '--define', '--ia', '--wireframe', '--system', '--audit', '--review', '--spec'];
    for (const flag of flags) {
      expect(content, `missing flag ${flag} in dispatcher`).toContain(flag);
    }
  });

  it('design:system dispatcher documents --define, --audit, --sync flags', () => {
    // Spec: /design:system dispatcher must route to its three sub-skills
    const content = readSkill('design-system');
    expect(content).toContain('--define');
    expect(content).toContain('--audit');
    expect(content).toContain('--sync');
  });
});

describe('Design Skills - Output artifacts', () => {
  const expectedArtifacts: Record<string, string> = {
    'design-research': 'thoughts/design/research.md',
    'design-define': 'thoughts/design/define.md',
    'design-ia': 'thoughts/design/ia.md',
    'design-wireframe': 'thoughts/design/wireframes.md',
    'design-system-define': 'thoughts/design/design-system.md',
    'design-system-audit': 'thoughts/design/design-system-audit.md',
    'design-audit': 'thoughts/design/audit.md',
  };

  for (const [folder, artifact] of Object.entries(expectedArtifacts)) {
    it(`${folder} documents output artifact ${artifact}`, () => {
      // Spec: Each skill must document where it persists its output
      const content = readSkill(folder);
      expect(content).toContain(artifact);
    });
  }
});

// --- agent tests ---

describe('Design Agents - File existence', () => {
  for (const { name } of DESIGN_AGENTS) {
    it(`${name}.md exists`, () => {
      // Spec: Phase plan agent task
      expect(existsSync(resolve(AGENTS_DIR, `${name}.md`))).toBe(true);
    });
  }
});

describe('Design Agents - Frontmatter', () => {
  for (const { name, model } of DESIGN_AGENTS) {
    it(`${name} has required frontmatter fields`, () => {
      // Spec: All agents must have name, description, tools, model
      const content = readAgent(name);
      const fm = parseFrontmatter(content);

      expect(fm['name'], 'missing name').toBeTruthy();
      expect(fm['description'], 'missing description').toBeTruthy();
      expect(fm['tools'], 'missing tools').toBeTruthy();
      expect(fm['model'], 'missing model').toBe(model);
    });
  }
});

describe('Design Agents - Read-only constraint', () => {
  it('design-system-guardian has disallowedTools: Edit, Write', () => {
    // Spec: Guardian is read-only — reports violations, never modifies files
    const content = readAgent('design-system-guardian');
    const fm = parseFrontmatter(content);

    expect(fm['disallowedTools'], 'missing disallowedTools').toBeTruthy();
    expect(fm['disallowedTools']).toContain('Edit');
    expect(fm['disallowedTools']).toContain('Write');
  });
});
