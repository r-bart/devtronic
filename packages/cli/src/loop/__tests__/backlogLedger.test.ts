/**
 * @generated-from thoughts/specs/2026-07-08_backlog-loop-of-loops.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for the run ledger (FR-10) and its role in resume (FR-11). The
 * ledger is the single authoritative record of a run; serialize/parse must
 * round-trip so `--resume` can reconstruct state faithfully.
 * Assertions activated during /execute-plan exactly as specified in the comments.
 */
import { describe, it, expect } from 'vitest';
import { serializeLedger, parseLedger } from '../backlogLedger.js';
import type { Ledger } from '../backlogLedger.js';

const LEDGER: Ledger = {
  run: 'backlog-2026-07-08',
  budgetSpent: 120_000,
  items: [
    { id: 'BACK-012', state: 'done', worktree: '.wt/BACK-012', budgetSpent: 60_000, trace: 'thoughts/loop/BACK-012.trace.md' },
    { id: 'BACK-013', state: 'parked', worktree: '.wt/BACK-013', budgetSpent: 60_000, trace: 'thoughts/loop/BACK-013.trace.md' },
    { id: 'BACK-014', state: 'quarantined', worktree: '.wt/BACK-014', budgetSpent: 0, trace: 'thoughts/loop/BACK-014.trace.md' },
  ],
};

describe('run ledger (FR-10)', () => {
  it('serialize then parse round-trips the ledger faithfully (resume relies on it)', () => {
    // Spec: FR-10, FR-11
    expect(parseLedger(serializeLedger(LEDGER))).toEqual(LEDGER);
  });

  it('records each item state: done, parked, quarantined', () => {
    // Spec: FR-10
    const parsed = parseLedger(serializeLedger(LEDGER));
    expect(parsed.items.map((i) => i.state).sort()).toEqual(['done', 'parked', 'quarantined']);
  });

  it('carries a per-item pointer to the inner trace and a budget-spent total', () => {
    // Spec: FR-10
    const parsed = parseLedger(serializeLedger(LEDGER));
    expect(parsed.items.every((i) => typeof i.trace === 'string')).toBe(true);
    expect(parsed.budgetSpent).toBe(120_000);
  });
});
