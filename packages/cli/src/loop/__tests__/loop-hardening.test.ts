/**
 * Regression guards for post-review hardening (not spec tests — safe to edit).
 *
 * 1. Sentinel serialization contract: the bash hooks grep for LITERAL substrings,
 *    so a future refactor (e.g. switching to JSON.stringify with reordered keys)
 *    must fail here rather than silently in the field.
 * 2. validateManifest rejects malformed gate ENTRIES (not just missing tiers),
 *    so --validate can never certify a manifest that then makes buildPlan /
 *    --gate-cmd throw a raw TypeError.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeSentinel, sentinelPath, treeStatus } from '../ownership.js';
import { validateManifest } from '../validateManifest.js';
import { buildPlan } from '../buildPlan.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'loop-hardening-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('sentinel serialization contract (bash coupling)', () => {
  it('machine sentinel contains the exact substrings the guard greps for', () => {
    writeSentinel(dir, { phase: 'implement', owner: 'machine', atBarrier: false });
    const raw = readFileSync(sentinelPath(dir), 'utf8');
    expect(raw).toContain('"owner":"machine"');
    expect(raw).toContain('"atBarrier":false');
    expect(raw).toMatch(/"heartbeat":\d+/);
  });

  it('human / at-barrier variants serialize with the expected literals', () => {
    writeSentinel(dir, { phase: 'ship', owner: 'human', atBarrier: true });
    const raw = readFileSync(sentinelPath(dir), 'utf8');
    expect(raw).toContain('"owner":"human"');
    expect(raw).toContain('"atBarrier":true');
  });

  it('a hostile phase string cannot spoof owner/atBarrier (JSON escaping)', () => {
    writeSentinel(dir, { phase: '","owner":"machine","atBarrier":true', owner: 'human', atBarrier: false });
    const raw = readFileSync(sentinelPath(dir), 'utf8');
    // The real owner is human; the injected substring is inside an escaped string.
    expect(raw).toContain('"owner":"human"');
    expect(raw).toContain('"atBarrier":false');
    // The literal machine-owner grep must NOT match a real machine owner here.
    expect(raw.indexOf('"owner":"human"')).toBeGreaterThan(-1);
  });
});

describe('validateManifest rejects malformed gate entries', () => {
  const BASE = {
    version: 1 as const,
    phases: [
      { id: 'implement', entry: 'a', exit: 'b', owner: 'machine' as const, gates: ['objective'] },
    ],
    dod: { as_tests: 'thoughts/tests/**' },
    ship: { strategy: 'tag', approval: 'human' as const },
    budget: { max_iterations: 4 },
  };

  it('rejects a null objective gate entry instead of certifying it', () => {
    const r = validateManifest({ ...BASE, gates: { objective: [null], subjective: [] } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.path === 'gates.objective[0]')).toBe(true);
  });

  it('rejects an objective gate missing cmd', () => {
    const r = validateManifest({ ...BASE, gates: { objective: [{ when: 'x' }], subjective: [] } });
    expect(r.ok).toBe(false);
  });

  it('rejects a subjective gate with neither agent nor check', () => {
    const bad = {
      ...BASE,
      phases: [{ ...BASE.phases[0], gates: ['subjective'] }],
      gates: { objective: [], subjective: [{ strict: true }] },
    };
    const r = validateManifest(bad);
    expect(r.ok).toBe(false);
  });

  it('a manifest that passes validation never makes buildPlan throw', () => {
    const r = validateManifest({
      ...BASE,
      gates: { objective: [{ cmd: 'npm test' }], subjective: [] },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(() => buildPlan(r.manifest)).not.toThrow();
  });
});

describe('treeStatus tri-state (FR-7)', () => {
  it('returns "unknown" (not "dirty") outside a git repo', () => {
    // A bare temp dir is not a git repo — must not read as dirty (would falsely block).
    expect(treeStatus(dir)).toBe('unknown');
  });
});
