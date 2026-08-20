/**
 * Skills reference each other by slash name: routers delegate, `devtronic-help`
 * indexes, prose points at the next step. Nothing checked those names against
 * the skills that actually ship.
 *
 * The v2 renames made the cost visible. `/design-system --sync` still routed to
 * `/design:system-sync` — a name that never existed under that form and, after
 * the rename to `design-tokens-sync`, was wrong twice over. `devtronic-help`
 * still listed `/recap`, removed in the same release, and had never listed
 * `converge`, `generate-tests`, `briefing`, `design-spec` or itself.
 *
 * These tests read the shipped templates and fail on the next such drift.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(
  __dirname,
  '..', '..', '..', 'templates', 'claude-code', '.claude', 'skills'
);
const AGENTS_DIR = join(
  __dirname,
  '..', '..', '..', 'templates', 'claude-code', '.claude', 'agents'
);

const SKILLS = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

function readSkill(name: string): string {
  return readFileSync(join(SKILLS_DIR, name, 'SKILL.md'), 'utf-8');
}

// ─── Routing tables name real skills ──────────────────────────────────────────

/**
 * A router documents its delegates in a markdown table whose second column is
 * the target skill, e.g. `| --sync | /design-tokens-sync | … |`.
 */
function routingTargets(content: string): string[] {
  const routing = content.split(/^## Routing\s*$/m)[1];
  if (!routing) return [];
  const table = routing.split(/^## /m)[0];
  const targets: string[] = [];
  for (const line of table.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    // Capture the whole name, colons included, so a stale `design:system-sync`
    // fails instead of matching its `design` prefix.
    const match = cells[2]?.match(/\/([a-z][a-z0-9:-]*)/);
    if (match) targets.push(match[1].replace(/^devtronic:/, ''));
  }
  return targets;
}

describe('router skills delegate to skills that exist', () => {
  const routers = SKILLS.filter((s) => /^## Routing\s*$/m.test(readSkill(s)));

  it('finds the routers', () => {
    // design and design-system. A rename that drops one should be deliberate.
    expect(routers).toContain('design');
    expect(routers).toContain('design-system');
  });

  for (const router of routers) {
    it(`${router} routes only to shipped skills`, () => {
      const targets = routingTargets(readSkill(router));
      expect(targets.length, `no delegates parsed from ${router}`).toBeGreaterThan(0);
      for (const target of targets) {
        expect(SKILLS, `${router} routes to /${target}, which does not exist`).toContain(target);
      }
    });
  }

  it('design-system routes --sync to the renamed token sync skill', () => {
    expect(routingTargets(readSkill('design-system'))).toContain('design-tokens-sync');
  });
});

// ─── devtronic-help indexes every skill ───────────────────────────────────────

describe('devtronic-help lists every shipped skill', () => {
  const help = readSkill('devtronic-help');
  const categories = help.split(/^## Skill Categories\s*$/m)[1]?.split(/^## /m)[0] ?? '';

  const listed = new Set(
    categories
      .split('\n')
      .filter((l) => l.trim().startsWith('|'))
      // Drop the header row and the `|---|` separator.
      .filter((l) => !/^\|[\s|:-]*\|$/.test(l.trim()) && l.split('|')[1]?.trim() !== 'Category')
      .flatMap((l) => (l.split('|')[2] ?? '').split(','))
      .map((s) => s.trim())
      .filter(Boolean)
  );

  it('parses the category table', () => {
    expect(listed.size).toBeGreaterThan(20);
  });

  for (const skill of SKILLS) {
    it(`lists ${skill}`, () => {
      expect(listed, `${skill} ships but /devtronic-help never mentions it`).toContain(skill);
    });
  }

  it('names no skill that does not ship', () => {
    for (const name of listed) {
      expect(SKILLS, `/devtronic-help lists ${name}, which does not exist`).toContain(name);
    }
  });
});

// ─── Retired names stay retired ───────────────────────────────────────────────

describe('renamed skills are not invoked under their old names', () => {
  /** Renamed in v2.0.0 to clear Claude Code built-ins. */
  const RETIRED = ['loop', 'recap', 'design-system-sync'];

  /** Prose that documents the rename is the one legitimate mention. */
  const EXPLAINS_THE_RENAME = /former|renamed|replaces|Claude Code now ships|no longer/i;

  const files = [
    ...SKILLS.map((s) => ({ path: `skills/${s}/SKILL.md`, content: readSkill(s) })),
    ...readdirSync(AGENTS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({
        path: `agents/${f}`,
        content: readFileSync(join(AGENTS_DIR, f), 'utf-8'),
      })),
  ];

  for (const name of RETIRED) {
    it(`no template invokes /${name}`, () => {
      // `/loop` the slash command, not `loop.manifest.yaml` or `devtronic loop`.
      const pattern = new RegExp(`(^|[^a-zA-Z0-9_./-])/${name}([^a-zA-Z0-9_.-]|$)`);
      const offenders = files.flatMap(({ path, content }) =>
        content
          .split('\n')
          .map((line, i) => ({ line, n: i + 1 }))
          .filter(({ line }) => pattern.test(line) && !EXPLAINS_THE_RENAME.test(line))
          .map(({ n, line }) => `${path}:${n}: ${line.trim()}`)
      );
      expect(offenders, `/${name} was renamed in v2.0.0`).toEqual([]);
    });
  }
});
