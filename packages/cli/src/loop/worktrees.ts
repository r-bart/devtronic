/**
 * Worktree helpers (infra boundary). Thin, deterministic wrappers over
 * `git worktree` so the outer loop can isolate each item in its own working tree
 * (FR-4) — the inner loop's sentinel is already worktree-scoped (FR-9), so
 * concurrent items don't collide. No business logic here.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export interface WorktreeInfo {
  path: string;
  branch: string;
}

/** Directory (relative to the repo) under which per-item worktrees live. */
export const WORKTREE_DIR = '.loop-worktrees';

function git(repoDir: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const res = spawnSync('git', args, { cwd: repoDir, encoding: 'utf8' });
  return { status: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

/**
 * Create an isolated worktree for an item on a fresh `loop/<id>` branch.
 * Returns the worktree path. Throws with git's stderr on failure.
 */
export function addWorktree(repoDir: string, itemId: string): string {
  const rel = join(WORKTREE_DIR, itemId);
  const branch = `loop/${itemId}`;
  const res = git(repoDir, ['worktree', 'add', '-b', branch, rel]);
  if (res.status !== 0) {
    throw new Error(`git worktree add failed for ${itemId}: ${res.stderr.trim()}`);
  }
  return join(repoDir, rel);
}

/** List the repo's worktrees (parsed from `git worktree list --porcelain`). */
export function listWorktrees(repoDir: string): WorktreeInfo[] {
  const res = git(repoDir, ['worktree', 'list', '--porcelain']);
  if (res.status !== 0) return [];
  const out: WorktreeInfo[] = [];
  let path = '';
  for (const line of res.stdout.split('\n')) {
    if (line.startsWith('worktree ')) path = line.slice('worktree '.length).trim();
    else if (line.startsWith('branch ')) {
      out.push({ path, branch: line.slice('branch '.length).trim().replace('refs/heads/', '') });
    } else if (line === '' && path) {
      // detached or no branch line — still record the path
      if (!out.some((w) => w.path === path)) out.push({ path, branch: '' });
      path = '';
    }
  }
  return out;
}

/** Remove an item's worktree (force — it may hold converged, uncommitted work). */
export function removeWorktree(repoDir: string, worktreePath: string): void {
  const res = git(repoDir, ['worktree', 'remove', '--force', worktreePath]);
  if (res.status !== 0) {
    throw new Error(`git worktree remove failed for ${worktreePath}: ${res.stderr.trim()}`);
  }
}
