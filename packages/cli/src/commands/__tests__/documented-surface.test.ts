/**
 * What the package promises, against what it ships.
 *
 * Two drifts got as far as a tagged release before anyone noticed. The npm
 * README still said `Node.js >= 18.0.0` after `engines` moved to 20, so the
 * package page contradicted the install. And `devtronic add codex` answered
 * "Unknown IDE" for a whole release: `add` kept a private copy of the IDE list
 * and never got `codex`, which `init` had.
 *
 * Neither is exotic. Both are a promise in one file and a fact in another, with
 * nothing joining them. These tests join them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDE_OPTIONS } from '../../prompts/init.js';
import { ADDONS, type IDE } from '../../types.js';

const CLI_ROOT = join(__dirname, '..', '..', '..');
const REPO_ROOT = join(CLI_ROOT, '..', '..');

const pkg = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf-8'));
const npmReadme = readFileSync(join(CLI_ROOT, 'README.md'), 'utf-8');
const rootReadme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf-8');

// ─── The IDE list has one owner ───────────────────────────────────────────────

describe('every targetable IDE is reachable', () => {
  const ALL_IDES: IDE[] = [
    'claude-code',
    'cursor',
    'antigravity',
    'github-copilot',
    'opencode',
    'codex',
  ];

  it('the prompt list covers the IDE union', () => {
    // A new IDE in types.ts that no prompt offers is unreachable.
    expect(IDE_OPTIONS.map((o) => o.value).sort()).toEqual([...ALL_IDES].sort());
  });

  it('offers codex', () => {
    // Regression: `devtronic add codex` rejected a first-class target.
    expect(IDE_OPTIONS.map((o) => o.value)).toContain('codex');
  });

  it('gives every IDE a label', () => {
    for (const option of IDE_OPTIONS) {
      expect(option.label.length, `${option.value} has no label`).toBeGreaterThan(0);
    }
  });
});

// ─── The npm README matches the package it ships with ─────────────────────────

describe('npm README agrees with package.json', () => {
  it('states the same minimum Node version as engines', () => {
    const engines = pkg.engines.node.match(/(\d+)/)?.[1];
    expect(engines, 'engines.node is unreadable').toBeTruthy();

    const stated = npmReadme.match(/Node\.js\s*>=\s*(\d+)/)?.[1];
    expect(stated, 'the README states no Node requirement').toBeTruthy();
    expect(stated, `README says Node ${stated}, package.json requires ${engines}`).toBe(engines);
  });
});

// ─── Both READMEs describe the surface that exists ────────────────────────────

describe('READMEs name every IDE and addon', () => {
  const readmes = [
    { name: 'packages/cli/README.md', content: npmReadme },
    { name: 'README.md', content: rootReadme },
  ];

  for (const { name, content } of readmes) {
    for (const { label } of IDE_OPTIONS) {
      it(`${name} names ${label}`, () => {
        expect(content, `${label} is a supported target but ${name} never says so`).toContain(
          label
        );
      });
    }

    for (const [addon, info] of Object.entries(ADDONS)) {
      it(`${name} lists the ${addon} skills`, () => {
        // The addon tables name each skill; a folded or renamed one must go.
        const table = content
          .split('\n')
          .filter((l) => l.includes(`\`${addon}\``))
          .join('\n');
        if (!table) return; // this README does not carry an addon table
        for (const skill of info.skills) {
          expect(table, `${addon} ships ${skill}; ${name} omits it`).toContain(`\`${skill}\``);
        }
        // And names nothing else: a skill listed here must be one the addon has.
        const named = [...table.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1]);
        const strays = named.filter(
          (n) => n !== addon && !info.skills.includes(n) && !(n in ADDONS)
        );
        expect(strays, `${name} lists skills the ${addon} addon does not ship`).toEqual([]);
      });
    }
  }
});
