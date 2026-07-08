/**
 * Regression test for the worktree infra helpers (not a spec test — safe to edit).
 * Verifies add/list/remove against a real temp git repo (Done Criteria, Phase 2).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { addWorktree, listWorktrees, removeWorktree, WORKTREE_DIR } from '../worktrees.js';

let repo: string;
beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'loop-wt-infra-'));
  const g = (args: string[]) => spawnSync('git', args, { cwd: repo });
  g(['init', '-q']);
  g(['config', 'user.email', 't@t']);
  g(['config', 'user.name', 't']);
  writeFileSync(join(repo, 'README.md'), '# temp', 'utf8');
  g(['add', '-A']);
  g(['commit', '-qm', 'init']);
});
afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('worktree helpers (FR-4)', () => {
  it('addWorktree creates an isolated worktree on a loop/<id> branch', () => {
    const path = addWorktree(repo, 'BACK-001');
    expect(path).toContain(join(WORKTREE_DIR, 'BACK-001'));
    const list = listWorktrees(repo);
    expect(list.some((w) => w.branch === 'loop/BACK-001')).toBe(true);
  });

  it('removeWorktree tears it down again', () => {
    const path = addWorktree(repo, 'BACK-002');
    removeWorktree(repo, path);
    const list = listWorktrees(repo);
    expect(list.some((w) => w.branch === 'loop/BACK-002')).toBe(false);
  });

  it('two items get distinct, non-colliding worktrees (FR-4/FR-9)', () => {
    const a = addWorktree(repo, 'BACK-003');
    const b = addWorktree(repo, 'BACK-004');
    expect(a).not.toBe(b);
    expect(listWorktrees(repo).filter((w) => w.branch.startsWith('loop/')).length).toBe(2);
  });
});
