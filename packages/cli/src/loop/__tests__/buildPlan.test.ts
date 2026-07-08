/**
 * @generated-from thoughts/specs/2026-07-07_loop-skill-prd.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for the dry-run plan builder (FR-11, US-2).
 * buildPlan is PURE: it returns data; the command prints. Purity is asserted.
 * Assertions activated during /execute-plan exactly as specified in the comments.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import * as cp from 'node:child_process';
import { buildPlan } from '../buildPlan.js';
import type { LoopManifest } from '../manifestSchema.js';

// Auto-spy the side-effecting boundaries (ESM-safe) so purity can be asserted.
vi.mock('node:fs', { spy: true });
vi.mock('node:child_process', { spy: true });

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

describe('buildPlan — dry-run (FR-11, US-2)', () => {
  describe('US-2/AC: ordering & stop markers', () => {
    it('emits phases in declared order with owner resolved', () => {
      // Spec: US-2
      const lines = buildPlan(VALID);
      expect(lines.map((l) => l.phaseId)).toEqual(['implement', 'ship']);
    });

    it('marks owner:human phases as STOP points', () => {
      // Spec: US-2
      const lines = buildPlan(VALID);
      expect(lines.find((l) => l.phaseId === 'ship')?.stop).toBe(true);
    });
  });

  describe('FR-11: pedagogical output (explains, not just lists)', () => {
    it('each phase line carries a plain-language ownership/stop explanation', () => {
      // Spec: FR-11
      const lines = buildPlan(VALID);
      expect(lines.every((l) => typeof l.explanation === 'string' && l.explanation.length > 0)).toBe(
        true
      );
    });

    it('each gate is annotated with what it verifies and its tier/frequency', () => {
      // Spec: FR-11
      const impl = buildPlan(VALID).find((l) => l.phaseId === 'implement');
      expect(impl?.gates[0]).toMatchObject({ tier: 1, frequency: 'per-iteration' });
    });

    it('budget/escalation stated in plain language', () => {
      // Spec: FR-11
      const lines = buildPlan(VALID);
      expect(lines.some((l) => /up to 4 iterations/i.test(l.explanation))).toBe(true);
    });
  });

  describe('US-2/AC: purity — no side effects', () => {
    it('does not read or write the filesystem and does not exec', () => {
      // Spec: US-2 (dry-run purity)
      const before = JSON.stringify(VALID);
      buildPlan(VALID);
      // spy on fs / child_process -> not called
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(cp.execSync).not.toHaveBeenCalled();
      expect(cp.spawnSync).not.toHaveBeenCalled();
      // and it only transforms its argument (no input mutation)
      expect(JSON.stringify(VALID)).toBe(before);
    });
  });
});
