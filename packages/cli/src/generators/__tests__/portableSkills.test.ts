/**
 * Portable skill export + the frontmatter contract every core skill must keep.
 *
 * `allowed-tools` grants tools for the invoking turn — it does not restrict
 * them. A bare `Bash`, `Write` or `Edit` entry therefore hands the skill
 * unprompted access, which is what these tests guard against.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import type { AddonName, ProjectConfig } from '../../types.js';
import { ADDONS } from '../../types.js';
import {
  generatePortableSkills,
  toPortableSkill,
  PORTABLE_SKILLS_DIR,
  PORTABLE_SKILL_IDES,
} from '../portableSkills.js';

const TEMPLATES_DIR = resolve(__dirname, '../../../templates');
const CORE_SKILLS_DIR = join(TEMPLATES_DIR, 'claude-code', '.claude', 'skills');

let tempDir: string;

function config(enabledAddons: AddonName[] = []): ProjectConfig {
  return {
    architecture: 'clean',
    layers: [],
    stateManagement: [],
    dataFetching: [],
    orm: [],
    testing: [],
    ui: [],
    validation: [],
    framework: 'react',
    qualityCommand: 'npm test',
    enabledAddons,
  };
}

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-portable-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2];
  }
  return fields;
}

const CORE_SKILLS = readdirSync(CORE_SKILLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

// ─── Frontmatter contract ─────────────────────────────────────────────────────

describe('core skill frontmatter contract', () => {
  it('finds the core skill set', () => {
    expect(CORE_SKILLS.length).toBeGreaterThan(20);
  });

  for (const skill of CORE_SKILLS) {
    const content = readFileSync(join(CORE_SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
    const fm = parseFrontmatter(content);

    it(`${skill}: name matches its directory`, () => {
      expect(fm['name']).toBe(skill);
    });

    it(`${skill}: pre-approves no broad tool`, () => {
      const grants = (fm['allowed-tools'] ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Every grant must be scoped, e.g. `Edit(thoughts/**)` or `Bash(git worktree *)`.
      for (const grant of grants) {
        expect(grant, `unscoped grant "${grant}" in ${skill}`).toMatch(/^[A-Za-z]+\(.+\)$/);
      }
    });

    it(`${skill}: does not reference the renamed Task tool`, () => {
      expect(fm['allowed-tools'] ?? '').not.toMatch(/\bTask\b/);
    });
  }
});

// ─── toPortableSkill ──────────────────────────────────────────────────────────

describe('toPortableSkill', () => {
  it('drops Claude Code-only execution fields', () => {
    const out = toPortableSkill(
      '---\nname: audit\ndescription: Audit\ncontext: fork\nbackground: false\n---\n# Audit\n'
    );
    expect(out).not.toContain('context: fork');
    expect(out).not.toContain('background: false');
    expect(out).toContain('name: audit');
  });

  it('keeps spec fields and portable extensions', () => {
    const out = toPortableSkill(
      [
        '---',
        'name: spec',
        'description: PRD interview',
        'argument-hint: "[feature]"',
        'allowed-tools: Edit(thoughts/**)',
        'disable-model-invocation: true',
        '---',
        '# Spec',
        '',
      ].join('\n')
    );
    expect(out).toContain('argument-hint: "[feature]"');
    expect(out).toContain('allowed-tools: Edit(thoughts/**)');
    expect(out).toContain('disable-model-invocation: true');
  });

  it('keeps a multi-line paths list intact', () => {
    const out = toPortableSkill(
      '---\nname: d\ndescription: D\npaths:\n  - "**/*.css"\n  - "**/*.tsx"\ncontext: fork\n---\n# D\n'
    );
    expect(out).toContain('  - "**/*.css"');
    expect(out).toContain('  - "**/*.tsx"');
    expect(out).not.toContain('context: fork');
  });

  it('leaves the markdown body untouched', () => {
    const body = '# Title\n\nSome instructions with `context: fork` in prose.\n';
    const out = toPortableSkill(`---\nname: x\ndescription: X\n---\n${body}`);
    expect(out.endsWith(body)).toBe(true);
  });

  it('is a no-op without frontmatter', () => {
    const raw = '# No frontmatter\n';
    expect(toPortableSkill(raw)).toBe(raw);
  });
});

// ─── generatePortableSkills ───────────────────────────────────────────────────

describe('generatePortableSkills', () => {
  it('writes the core skill set to the shared Agent Skills directory', () => {
    const result = generatePortableSkills(tempDir, TEMPLATES_DIR, config());

    expect(result.skills.length).toBeGreaterThan(20);
    for (const skill of result.skills) {
      expect(existsSync(join(tempDir, PORTABLE_SKILLS_DIR, skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('records every written file in the manifest', () => {
    const result = generatePortableSkills(tempDir, TEMPLATES_DIR, config());
    const paths = Object.keys(result.files);

    expect(paths).toHaveLength(result.skills.length);
    for (const path of paths) {
      expect(path.startsWith(`${PORTABLE_SKILLS_DIR}/`)).toBe(true);
      expect(result.files[path].checksum).toBeTruthy();
    }
  });

  it('strips Claude Code-only fields from the exported skills', () => {
    generatePortableSkills(tempDir, TEMPLATES_DIR, config());

    const audit = readFileSync(join(tempDir, PORTABLE_SKILLS_DIR, 'audit', 'SKILL.md'), 'utf-8');
    const fm = parseFrontmatter(audit);
    expect(fm['context']).toBeUndefined();
    expect(fm['background']).toBeUndefined();
    expect(fm['name']).toBe('audit');
    expect(fm['description']).toBeTruthy();
  });

  // Addon skills share the template directory with the core ones. Exporting
  // them unconditionally would ship an addon the user never enabled.
  it('excludes addon skills when the addon is disabled', () => {
    const result = generatePortableSkills(tempDir, TEMPLATES_DIR, config([]));

    for (const skill of ADDONS.orchestration.skills) {
      expect(result.skills, `${skill} leaked`).not.toContain(skill);
      expect(existsSync(join(tempDir, PORTABLE_SKILLS_DIR, skill))).toBe(false);
    }
  });

  it('includes addon skills when the addon is enabled', () => {
    const result = generatePortableSkills(tempDir, TEMPLATES_DIR, config(['orchestration']));

    for (const skill of ADDONS.orchestration.skills) {
      expect(result.skills).toContain(skill);
    }
  });

  it('leaves user-modified skills untouched', () => {
    generatePortableSkills(tempDir, TEMPLATES_DIR, config());

    const relPath = `${PORTABLE_SKILLS_DIR}/audit/SKILL.md`;
    const mine = '---\nname: audit\ndescription: mine\n---\n# Mine\n';
    writeFileSync(join(tempDir, relPath), mine);

    const result = generatePortableSkills(tempDir, TEMPLATES_DIR, config(), [relPath]);

    expect(readFileSync(join(tempDir, relPath), 'utf-8')).toBe(mine);
    expect(result.files[relPath]).toBeUndefined();
  });

  it('targets every non-Claude runtime devtronic supports', () => {
    expect(PORTABLE_SKILL_IDES).toEqual(
      expect.arrayContaining(['cursor', 'codex', 'opencode', 'github-copilot', 'antigravity'])
    );
    expect(PORTABLE_SKILL_IDES).not.toContain('claude-code');
  });

  it('returns an empty result when the source directory is missing', () => {
    const result = generatePortableSkills(tempDir, join(tempDir, 'nope'), config());
    expect(result.skills).toEqual([]);
    expect(result.files).toEqual({});
  });
});
