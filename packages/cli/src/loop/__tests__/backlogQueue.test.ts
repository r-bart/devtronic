/**
 * @generated-from thoughts/specs/2026-07-08_backlog-loop-of-loops.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for the backlog queue: item readiness (FR-1, FR-3) and priority
 * ordering (FR-1, US-1). Greenfield — `../backlogQueue.js` does not exist yet, so
 * cases are it.todo() with the intended assertion in comments. Readiness is a PURE
 * function over an injected fs-probe (no real I/O), matching the inner loop's split.
 */
import { describe, it /*, expect */ } from 'vitest';
// import { checkReadiness, orderByPriority, eligibleQueue } from '../backlogQueue.js';
// import type { BacklogItem } from '../backlogQueue.js';

// A ready item points at an existing spec + DoD; probe(path) reports existence.
// const ITEM: BacklogItem = { id: 'BACK-012', spec: 'thoughts/specs/auth.md', dod: 'thoughts/tests/auth.md', priority: 2 };
// const readyProbe = (p: string) => p === ITEM.spec || p === ITEM.dod;

describe('backlog readiness (FR-1, FR-3)', () => {
  describe('US-1/AC: eligibility = spec + DoD both present', () => {
    it.todo('marks an item ready when both its spec and DoD tests exist');
    // Spec: FR-1, FR-3
    // expect(checkReadiness(ITEM, readyProbe)).toMatchObject({ ready: true });

    it.todo('marks an item NOT ready with a reason when the spec is missing');
    // Spec: FR-3
    // const probe = (p: string) => p === ITEM.dod; // spec absent
    // const r = checkReadiness(ITEM, probe);
    // expect(r.ready).toBe(false);
    // if (!r.ready) expect(r.reason).toMatch(/spec/i);

    it.todo('marks an item NOT ready with a reason when the DoD tests are missing');
    // Spec: FR-3
    // const probe = (p: string) => p === ITEM.spec; // dod absent
    // const r = checkReadiness(ITEM, probe);
    // expect(r.ready).toBe(false);
    // if (!r.ready) expect(r.reason).toMatch(/dod|test/i);
  });

  describe('FR-3: skipped items are reported, never silently dropped', () => {
    it.todo('eligibleQueue returns both the ready list and the skipped list with reasons');
    // Spec: FR-3
    // const items = [ITEM, { id: 'BACK-013', spec: 'missing.md', dod: 'missing.md', priority: 1 }];
    // const { ready, skipped } = eligibleQueue(items, readyProbe);
    // expect(ready.map(i => i.id)).toEqual(['BACK-012']);
    // expect(skipped).toHaveLength(1);
    // expect(skipped[0].ready).toBe(false);
  });
});

describe('priority ordering (FR-1, US-1)', () => {
  it.todo('orders eligible items by descending priority (higher first)');
  // Spec: FR-1
  // const items = [
  //   { id: 'a', spec: 's', dod: 'd', priority: 1 },
  //   { id: 'b', spec: 's', dod: 'd', priority: 3 },
  //   { id: 'c', spec: 's', dod: 'd', priority: 2 },
  // ];
  // expect(orderByPriority(items).map(i => i.id)).toEqual(['b', 'c', 'a']);

  it.todo('is stable within a priority band (FIFO for ties)');
  // Spec: FR-1 (tie-break)
  // const items = [
  //   { id: 'first', spec: 's', dod: 'd', priority: 1 },
  //   { id: 'second', spec: 's', dod: 'd', priority: 1 },
  // ];
  // expect(orderByPriority(items).map(i => i.id)).toEqual(['first', 'second']);
});
