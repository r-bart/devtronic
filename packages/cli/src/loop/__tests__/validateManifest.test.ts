/**
 * @generated-from thoughts/specs/2026-07-07_loop-skill-prd.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for the loop manifest validator (FR-1, FR-6, FR-10, US-1).
 * Assertions activated during /execute-plan exactly as specified in the generated
 * comments — the checked behavior is unchanged.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { validateManifest } from '../validateManifest.js';
import type { LoopManifest } from '../manifestSchema.js';

// A minimal valid manifest fixture (design §7.4 shape).
const VALID = {
  version: 1,
  phases: [
    { id: 'implement', entry: 'spec-signed', exit: 'gates-green', owner: 'machine', gates: ['objective'] },
    { id: 'ship', entry: 'converged', exit: 'shipped', owner: 'human', gates: [] },
  ],
  gates: {
    objective: [{ cmd: 'npm run typecheck' }],
    subjective: [{ agent: 'code-reviewer', strict: true }],
  },
  dod: { as_tests: 'thoughts/tests/**' },
  ship: { strategy: 'tag', approval: 'human' },
  budget: { max_iterations: 4, on_exhausted: 'replan-then-human' },
} satisfies LoopManifest;

describe('validateManifest (FR-1, US-1)', () => {
  describe('US-1/AC: valid manifest', () => {
    it('accepts a well-formed manifest and returns { ok: true, manifest }', () => {
      // Spec: FR-1
      const r = validateManifest(VALID);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.manifest.version).toBe(1);
    });
  });

  describe('US-1/AC: violation classes each produce an actionable error', () => {
    it('rejects a bad version (not 1) with a path pointing at "version"', () => {
      // Spec: FR-2
      const r = validateManifest({ ...VALID, version: 2 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.some((e) => e.path.includes('version'))).toBe(true);
    });

    it('rejects an unknown phase owner with a path at the phase', () => {
      // Spec: FR-2
      const bad = { ...VALID, phases: [{ ...VALID.phases[0], owner: 'robot' }] };
      const r = validateManifest(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.some((e) => /owner/.test(e.path))).toBe(true);
    });

    it('rejects a phase missing id / entry / exit', () => {
      // Spec: FR-2
      const bad = { ...VALID, phases: [{ owner: 'machine', gates: [] }] };
      const r = validateManifest(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('rejects a gate tier ref not backed by a defined gate', () => {
      // Spec: FR-2
      const bad = {
        ...VALID,
        phases: [{ ...VALID.phases[0], gates: ['subjective'] }],
        gates: { objective: [{ cmd: 'x' }], subjective: [] },
      };
      const r = validateManifest(bad);
      expect(r.ok).toBe(false);
    });

    it('rejects a manifest missing dod', () => {
      // Spec: FR-2
      const noDod: Record<string, unknown> = { ...VALID };
      delete noDod.dod;
      const r = validateManifest(noDod);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.some((e) => e.path.includes('dod'))).toBe(true);
    });

    it('rejects a manifest missing budget.max_iterations', () => {
      // Spec: FR-2
      const r = validateManifest({ ...VALID, budget: { on_exhausted: 'replan-then-human' } });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.some((e) => e.path.includes('budget.max_iterations'))).toBe(true);
    });
  });

  describe('FR-10: seeded manifest is self-documented AND valid', () => {
    it('the init-seeded loop.manifest.yaml parses and validates with comments present', () => {
      // Spec: FR-10
      const here = dirname(fileURLToPath(import.meta.url));
      const seedPath = join(here, '../../../templates/loop.manifest.example.yaml');
      const raw = readFileSync(seedPath, 'utf8');
      const parsed = parseYaml(raw);
      const r = validateManifest(parsed);
      expect(r.ok).toBe(true);
      // Every top-level key carries an inline `#` comment (self-documented).
      for (const key of ['version', 'phases', 'gates', 'dod', 'ship', 'budget']) {
        expect(new RegExp(`${key}:.*#|#[^\\n]*\\n\\s*${key}:`).test(raw)).toBe(true);
      }
    });
  });

  describe('EC: malformed input', () => {
    it('EC-1: returns ok:false (not throw) for non-object input', () => {
      // Spec: EC — malformed YAML/schema
      expect(validateManifest(null).ok).toBe(false);
      expect(validateManifest('nope').ok).toBe(false);
    });
  });
});
