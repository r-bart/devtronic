/**
 * @generated-from thoughts/specs/2026-07-08_backlog-loop-of-loops.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for the dry-run plan builder (FR-2, US-4) and the budget/width
 * launch gate (FR-7). Both are PURE — the dry-run executes nothing, and the gate
 * is a predicate over counters.
 * Assertions activated during /execute-plan exactly as specified in the comments.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import * as cp from 'node:child_process';
import { buildBacklogPlan, canLaunchNext } from '../backlogPlan.js';
import type { BacklogItem } from '../backlogQueue.js';

// Auto-spy the side-effecting boundaries (ESM-safe) so purity can be asserted.
vi.mock('node:fs', { spy: true });
vi.mock('node:child_process', { spy: true });

const QUEUE: BacklogItem[] = [
  { id: 'b', spec: 's', dod: 'd', priority: 3 },
  { id: 'a', spec: 's', dod: 'd', priority: 1 },
];

describe('buildBacklogPlan — dry-run (FR-2, US-4)', () => {
  it('previews eligible items in priority order, annotated, executing nothing', () => {
    // Spec: US-4
    const lines = buildBacklogPlan(QUEUE, { budget: 500_000, width: 3 });
    expect(lines.map((l) => l.itemId)).toEqual(['b', 'a']);
  });

  it('states the budget and width caps in the plan', () => {
    // Spec: FR-7, US-4
    const lines = buildBacklogPlan(QUEUE, { budget: 500_000, width: 3 });
    expect(lines.some((l) => /width|budget/i.test(l.explanation))).toBe(true);
  });

  it('is pure — reads/writes no filesystem and does not exec', () => {
    // Spec: US-4 (dry-run purity)
    buildBacklogPlan(QUEUE, { budget: 500_000, width: 3 });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(cp.execSync).not.toHaveBeenCalled();
    expect(cp.spawnSync).not.toHaveBeenCalled();
  });
});

describe('canLaunchNext — budget + width gate (FR-7)', () => {
  it('allows launch when under both the budget and the width cap', () => {
    // Spec: FR-7
    expect(canLaunchNext({ budgetSpent: 100_000, budgetTotal: 500_000, inFlight: 1, widthCap: 3 })).toBe(true);
  });

  it('blocks launch when the width cap is reached', () => {
    // Spec: FR-7 (width cap — prevents worktree explosion during long absences)
    expect(canLaunchNext({ budgetSpent: 0, budgetTotal: 500_000, inFlight: 3, widthCap: 3 })).toBe(false);
  });

  it('blocks launch when the outer budget is exhausted', () => {
    // Spec: FR-7 (bounded cost)
    expect(canLaunchNext({ budgetSpent: 500_000, budgetTotal: 500_000, inFlight: 0, widthCap: 3 })).toBe(false);
  });
});
