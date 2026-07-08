/**
 * Ownership signal + lifecycle (FR-3), worktree-awareness (FR-9), clean-tree
 * guard (FR-7). The sentinel is the coexistence keystone: the skill writes it,
 * `stop-guard.sh` reads it, `SessionStart` sweeps it (Phase 0 verdict).
 *
 * The on-disk shape is a single-line JSON object whose literal substrings
 * (`"owner":"machine"`, `"atBarrier":true`, `"heartbeat":N`) the generated bash
 * greps for — keep the serialization stable.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { STALE_SECS as STALE_SECS_CONST, SENTINEL_REL } from './constants.js';

export interface Sentinel {
  active: boolean;
  phase: string;
  owner: 'human' | 'machine';
  atBarrier: boolean;
  heartbeat: number; // epoch seconds
}

export interface SentinelInput {
  phase: string;
  owner: 'human' | 'machine';
  atBarrier: boolean;
}

/** Default staleness threshold (seconds) — re-exported from the shared,
 *  dependency-free constants module (single source of truth). */
export const STALE_SECS = STALE_SECS_CONST;

/**
 * Resolve the sentinel path for a directory.
 *
 * Cwd-relative by design: the ambient bash hooks (`stop-guard.sh`, the
 * SessionStart sweep) read the *relative* path `.claude/.loop-owner` from their
 * working directory, so the TS writer must resolve to the same location relative
 * to the same root. The skill runs `--own`/`--release` from the worktree root
 * (the session cwd), exactly where the hooks run — so both sides agree.
 *
 * This is still worktree-safe (FR-9): each git worktree has its own working
 * directory, so two concurrent loops resolve to distinct sentinel files and
 * never collide. (Resolving via `git rev-parse --show-toplevel` instead would
 * silently diverge from the cwd-relative bash whenever the two run from
 * different subdirectories — the coexistence bug this avoids.)
 */
export function sentinelPath(dir: string): string {
  return join(dir, SENTINEL_REL);
}

/** Write (or refresh) the sentinel, stamping a fresh heartbeat. */
export function writeSentinel(dir: string, input: SentinelInput): Sentinel {
  const sentinel: Sentinel = {
    active: true,
    phase: input.phase,
    owner: input.owner,
    atBarrier: input.atBarrier,
    heartbeat: nowSeconds(),
  };
  const path = sentinelPath(dir);
  mkdirSync(dirname(path), { recursive: true });
  // Fixed key order so the bash guard's literal greps stay valid.
  const json = `{"active":${sentinel.active},"phase":${JSON.stringify(sentinel.phase)},"owner":${JSON.stringify(sentinel.owner)},"atBarrier":${sentinel.atBarrier},"heartbeat":${sentinel.heartbeat}}`;
  // Atomic write (temp + rename) so a concurrent hook read never sees a
  // truncated/partial JSON file mid-write.
  const tmp = `${path}.${sentinel.heartbeat}.tmp`;
  writeFileSync(tmp, json + '\n', 'utf8');
  renameSync(tmp, path);
  return sentinel;
}

/** Read the sentinel, or null when absent / unparseable. */
export function readSentinel(dir: string): Sentinel | null {
  const path = sentinelPath(dir);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<Sentinel>;
    if (typeof parsed.heartbeat !== 'number' || typeof parsed.owner !== 'string') return null;
    return {
      active: parsed.active ?? true,
      phase: parsed.phase ?? '',
      owner: parsed.owner,
      atBarrier: parsed.atBarrier ?? false,
      heartbeat: parsed.heartbeat,
    };
  } catch {
    return null;
  }
}

/** Remove the sentinel (phase exit, completion, error, or `--abort`). */
export function clearSentinel(dir: string): void {
  rmSync(sentinelPath(dir), { force: true });
}

/** A sentinel is stale once its heartbeat is older than the threshold. */
export function isStale(sentinel: Pick<Sentinel, 'heartbeat'>, now: number, thresh: number): boolean {
  return now - sentinel.heartbeat >= thresh;
}

/**
 * Tri-state working-tree status (FR-7):
 *   'clean'   → git succeeded and `git status --porcelain` is empty
 *   'dirty'   → git succeeded and reported uncommitted changes
 *   'unknown' → git failed (not a repo, git missing, permission) — can't tell
 * Callers must not conflate 'unknown' with 'dirty' (see the clean-tree guard).
 */
export function treeStatus(dir: string): 'clean' | 'dirty' | 'unknown' {
  const res = spawnSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' });
  if (res.status !== 0) return 'unknown';
  return (res.stdout ?? '').trim().length === 0 ? 'clean' : 'dirty';
}

/** True when the working tree is confirmed clean — no uncommitted WIP (FR-7). */
export function isCleanTree(dir: string): boolean {
  return treeStatus(dir) === 'clean';
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
