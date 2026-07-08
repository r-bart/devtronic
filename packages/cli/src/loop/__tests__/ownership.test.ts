/**
 * @generated-from thoughts/specs/2026-07-07_loop-skill-prd.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for the ownership signal + lifecycle (FR-3), worktree-awareness
 * (FR-9), and the clean-tree guard (FR-7). The sentinel is the coexistence keystone.
 */
import { describe, it /*, expect, beforeEach, afterEach */ } from 'vitest';
// import { mkdtempSync, rmSync } from 'node:fs';
// import { join } from 'node:path';
// import { tmpdir } from 'node:os';
// import { writeSentinel, readSentinel, clearSentinel, isStale, isCleanTree, sentinelPath } from '../ownership.js';

// let tempDir: string;
// beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), 'loop-ownership-')); });
// afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

describe('ownership signal (FR-3)', () => {
  describe('write / read round-trip', () => {
    it.todo('writeSentinel then readSentinel returns phase, owner, atBarrier and a heartbeat');
    // Spec: FR-3
    // writeSentinel(tempDir, { phase: 'implement', owner: 'machine', atBarrier: false });
    // const s = readSentinel(tempDir);
    // expect(s).toMatchObject({ phase: 'implement', owner: 'machine', atBarrier: false });
    // expect(typeof s?.heartbeat).toBe('number');

    it.todo('clearSentinel removes the signal (readSentinel -> null)');
    // Spec: FR-3
    // writeSentinel(tempDir, { phase: 'implement', owner: 'machine', atBarrier: false });
    // clearSentinel(tempDir);
    // expect(readSentinel(tempDir)).toBeNull();

    it.todo('readSentinel returns null when no sentinel exists');
    // Spec: FR-3
    // expect(readSentinel(tempDir)).toBeNull();
  });

  describe('staleness (crash lifecycle)', () => {
    it.todo('isStale=false for a fresh heartbeat within threshold');
    // Spec: FR-3 (crash/stale — the highest-risk unknown)
    // const s = { phase: 'implement', owner: 'machine', atBarrier: false, heartbeat: 1000 };
    // expect(isStale(s, 1000 + 60, 900)).toBe(false);

    it.todo('isStale=true once heartbeat exceeds threshold (loop died mid-phase)');
    // Spec: FR-3
    // const s = { phase: 'implement', owner: 'machine', atBarrier: false, heartbeat: 1000 };
    // expect(isStale(s, 1000 + 1000, 900)).toBe(true);
  });
});

describe('per-worktree ownership (FR-9)', () => {
  it.todo('sentinelPath is keyed off the git worktree/common-dir so two worktrees do not collide');
  // Spec: FR-9 (gap #6)
  // expect(sentinelPath(worktreeA)).not.toBe(sentinelPath(worktreeB));
});

describe('clean-tree guard (FR-7)', () => {
  it.todo('isCleanTree=true when git status --porcelain is empty');
  // Spec: FR-7 (gap #4)
  // (init a temp git repo, no changes) expect(isCleanTree(tempRepo)).toBe(true);

  it.todo('isCleanTree=false when there is uncommitted WIP');
  // Spec: FR-7 (gap #4 — hit live this session)
  // (write an untracked file) expect(isCleanTree(tempRepo)).toBe(false);
});
