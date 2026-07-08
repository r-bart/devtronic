/**
 * @generated-from thoughts/specs/2026-07-07_loop-skill-prd.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for the dry-run plan builder (FR-11, US-2).
 * buildPlan is PURE: it returns data; the command prints. Purity is asserted.
 */
import { describe, it /*, expect */ } from 'vitest';
// import { buildPlan } from '../buildPlan.js';
// import type { LoopManifest } from '../manifestSchema.js';

describe('buildPlan — dry-run (FR-11, US-2)', () => {
  describe('US-2/AC: ordering & stop markers', () => {
    it.todo('emits phases in declared order with owner resolved');
    // Spec: US-2
    // const lines = buildPlan(VALID);
    // expect(lines.map(l => l.phaseId)).toEqual(['implement', 'ship']);

    it.todo('marks owner:human phases as STOP points');
    // Spec: US-2
    // const lines = buildPlan(VALID);
    // expect(lines.find(l => l.phaseId === 'ship')?.stop).toBe(true);
  });

  describe('FR-11: pedagogical output (explains, not just lists)', () => {
    it.todo('each phase line carries a plain-language ownership/stop explanation');
    // Spec: FR-11
    // const lines = buildPlan(VALID);
    // expect(lines.every(l => typeof l.explanation === 'string' && l.explanation.length > 0)).toBe(true);

    it.todo('each gate is annotated with what it verifies and its tier/frequency');
    // Spec: FR-11
    // const impl = buildPlan(VALID).find(l => l.phaseId === 'implement');
    // expect(impl?.gates[0]).toMatchObject({ tier: 1, frequency: 'per-iteration' });

    it.todo('budget/escalation stated in plain language');
    // Spec: FR-11
    // const lines = buildPlan(VALID);
    // expect(lines.some(l => /up to 4 iterations/i.test(l.explanation))).toBe(true);
  });

  describe('US-2/AC: purity — no side effects', () => {
    it.todo('does not read or write the filesystem and does not exec');
    // Spec: US-2 (dry-run purity)
    // Assert buildPlan only transforms its argument (spy on fs / child_process -> not called).
  });
});
