/**
 * @generated-from thoughts/specs/2026-07-08_backlog-loop-of-loops.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for the per-item state machine (FR-2) and the fail-soft quarantine
 * transition (FR-8, US-3). The state machine is the deterministic spine — it must
 * be pure and reject invalid transitions rather than silently accept them.
 * Assertions activated during /execute-plan exactly as specified in the comments.
 */
import { describe, it, expect } from 'vitest';
import { transition } from '../itemState.js';

describe('item state machine (FR-2)', () => {
  describe('valid lifecycle transitions', () => {
    it('queued -> converging on launch', () => {
      // Spec: FR-2
      expect(transition('queued', 'launch')).toBe('converging');
    });

    it('converging -> parked on converge (awaiting human ship-sign)', () => {
      // Spec: FR-2, FR-5
      expect(transition('converging', 'converged')).toBe('parked');
    });

    it('parked -> done on human sign', () => {
      // Spec: FR-2, FR-9
      expect(transition('parked', 'sign')).toBe('done');
    });
  });

  describe('FR-8/US-3: fail-soft quarantine', () => {
    it('converging -> quarantined when the inner loop cannot converge', () => {
      // Spec: FR-8
      expect(transition('converging', 'fail')).toBe('quarantined');
    });

    it('any in-flight state -> quarantined on abort', () => {
      // Spec: FR-8, FR-11
      expect(transition('converging', 'abort')).toBe('quarantined');
      expect(transition('parked', 'abort')).toBe('quarantined');
    });
  });

  describe('invalid transitions are rejected (not silently accepted)', () => {
    it('a terminal state (done) does not transition further', () => {
      // Spec: FR-2
      expect(() => transition('done', 'launch')).toThrow();
    });

    it('cannot sign an item that has not converged', () => {
      // Spec: FR-2, FR-9
      expect(() => transition('converging', 'sign')).toThrow();
    });
  });
});
