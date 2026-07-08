/**
 * @generated-from thoughts/specs/2026-07-07_loop-skill-prd.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for the ownership signal + lifecycle (FR-3), worktree-awareness
 * (FR-9), and the clean-tree guard (FR-7). The sentinel is the coexistence keystone.
 * Assertions activated during /execute-plan exactly as specified in the comments.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  writeSentinel,
  readSentinel,
  clearSentinel,
  isStale,
  isCleanTree,
  sentinelPath,
} from '../ownership.js';

let tempDir: string;
beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'loop-ownership-'));
});
afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('ownership signal (FR-3)', () => {
  describe('write / read round-trip', () => {
    it('writeSentinel then readSentinel returns phase, owner, atBarrier and a heartbeat', () => {
      // Spec: FR-3
      writeSentinel(tempDir, { phase: 'implement', owner: 'machine', atBarrier: false });
      const s = readSentinel(tempDir);
      expect(s).toMatchObject({ phase: 'implement', owner: 'machine', atBarrier: false });
      expect(typeof s?.heartbeat).toBe('number');
    });

    it('clearSentinel removes the signal (readSentinel -> null)', () => {
      // Spec: FR-3
      writeSentinel(tempDir, { phase: 'implement', owner: 'machine', atBarrier: false });
      clearSentinel(tempDir);
      expect(readSentinel(tempDir)).toBeNull();
    });

    it('readSentinel returns null when no sentinel exists', () => {
      // Spec: FR-3
      expect(readSentinel(tempDir)).toBeNull();
    });
  });

  describe('staleness (crash lifecycle)', () => {
    it('isStale=false for a fresh heartbeat within threshold', () => {
      // Spec: FR-3 (crash/stale — the highest-risk unknown)
      const s = { phase: 'implement', owner: 'machine' as const, atBarrier: false, heartbeat: 1000 };
      expect(isStale(s, 1000 + 60, 900)).toBe(false);
    });

    it('isStale=true once heartbeat exceeds threshold (loop died mid-phase)', () => {
      // Spec: FR-3
      const s = { phase: 'implement', owner: 'machine' as const, atBarrier: false, heartbeat: 1000 };
      expect(isStale(s, 1000 + 1000, 900)).toBe(true);
    });
  });
});

describe('per-worktree ownership (FR-9)', () => {
  it('sentinelPath is keyed off the git worktree/common-dir so two worktrees do not collide', () => {
    // Spec: FR-9 (gap #6)
    const worktreeA = mkdtempSync(join(tmpdir(), 'loop-wtA-'));
    const worktreeB = mkdtempSync(join(tmpdir(), 'loop-wtB-'));
    try {
      expect(sentinelPath(worktreeA)).not.toBe(sentinelPath(worktreeB));
    } finally {
      rmSync(worktreeA, { recursive: true, force: true });
      rmSync(worktreeB, { recursive: true, force: true });
    }
  });
});

describe('clean-tree guard (FR-7)', () => {
  it('isCleanTree=true when git status --porcelain is empty', () => {
    // Spec: FR-7 (gap #4)
    const repo = mkdtempSync(join(tmpdir(), 'loop-clean-'));
    try {
      spawnSync('git', ['init'], { cwd: repo });
      expect(isCleanTree(repo)).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('isCleanTree=false when there is uncommitted WIP', () => {
    // Spec: FR-7 (gap #4 — hit live this session)
    const repo = mkdtempSync(join(tmpdir(), 'loop-dirty-'));
    try {
      spawnSync('git', ['init'], { cwd: repo });
      writeFileSync(join(repo, 'wip.txt'), 'uncommitted', 'utf8');
      expect(isCleanTree(repo)).toBe(false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
