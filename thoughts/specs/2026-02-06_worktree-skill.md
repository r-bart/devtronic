# PRD: Worktree Management Skill

**Date**: 2026-02-06
**Status**: draft

---

## Executive Summary

A Claude Code skill (`/worktree`) that simplifies git worktree management with intuitive flags. Combines quick command wrappers with workflow automation (branch creation, dep installation, enriched status). Targets any team member working on the `ai-agentic-architecture` project.

---

## Problem Statement

### Current State

Developers manually run `git worktree add/remove/list` commands, need to remember directory naming conventions, manually install dependencies, and have no enriched view of worktree status.

### Pain Points

- **Memorization burden**: Git worktree syntax isn't intuitive (`git worktree add ../path -b branch`)
- **Inconsistent naming**: Each developer names worktree directories differently
- **Missing context**: `git worktree list` shows minimal info (no uncommitted changes, no last commit)
- **Multi-step workflow**: Creating a productive worktree requires: create dir → create branch → install deps → navigate
- **Cleanup friction**: Forgetting to prune or remove stale worktrees

---

## Goals & Non-Goals

### Goals

1. Single command to create a fully ready worktree (dir + branch + optional deps)
2. Consistent naming convention enforced automatically
3. Enriched status view showing branch, last commit, and uncommitted changes
4. Easy cleanup (remove + prune) with guardrails

### Non-Goals

- Auto-launching Claude sessions in new worktrees (user opens terminal manually)
- Managing worktrees across multiple repositories
- Git merge/rebase operations from within the skill
- IDE integration (VS Code, etc.)

---

## User Stories

### US1: Create a worktree for a new feature

**As a** developer
**I want to** run `/worktree --create auth`
**So that** I get a ready-to-use worktree at `../project-wt-auth` on branch `feature/auth`

Acceptance Criteria:
- [ ] Directory created at `../<project>-wt-<name>`
- [ ] Branch `feature/<name>` created from current branch
- [ ] If `--install` flag: dependencies installed (auto-detect package manager)
- [ ] If `--type fix` flag: branch is `fix/<name>` instead of `feature/<name>`
- [ ] Outputs summary: directory path, branch name, next steps

### US2: Create a worktree for a bugfix

**As a** developer
**I want to** run `/worktree --create login-error --type fix`
**So that** I get a worktree on branch `fix/login-error`

Acceptance Criteria:
- [ ] Branch type prefix matches `--type` value
- [ ] Supported types: `feature` (default), `fix`, `chore`, `refactor`, `docs`

### US3: See status of all worktrees

**As a** developer
**I want to** run `/worktree --list` or `/worktree --status`
**So that** I see all worktrees with branch, last commit, and uncommitted change count

Acceptance Criteria:
- [ ] Shows table with: directory, branch, last commit (short), uncommitted changes count
- [ ] Flags worktrees with uncommitted changes
- [ ] Indicates which worktree is current

### US4: Remove a worktree

**As a** developer
**I want to** run `/worktree --remove auth`
**So that** the worktree directory and optionally its branch are cleaned up

Acceptance Criteria:
- [ ] Warns if worktree has uncommitted changes
- [ ] Asks for confirmation before removal
- [ ] Optionally deletes the associated branch (`--delete-branch` flag)
- [ ] Reports success/failure

### US5: Prune stale worktrees

**As a** developer
**I want to** run `/worktree --prune`
**So that** stale worktree references are cleaned up

Acceptance Criteria:
- [ ] Runs `git worktree prune`
- [ ] Reports what was pruned (or "nothing to prune")

---

## Functional Requirements

### FR1: Create (`--create <name>`)

| Aspect | Detail |
|--------|--------|
| Directory | `../<project-name>-wt-<name>` |
| Branch | `<type>/<name>` (default type: `feature`) |
| Base branch | Current HEAD (or `--from <branch>` to specify) |
| Deps | Only with `--install` flag |
| PM detection | Check lockfiles: pnpm-lock.yaml → pnpm, yarn.lock → yarn, bun.lockb → bun, else npm |

**Flags**:
- `--create <name>` (required): Worktree identifier
- `--type <type>` (optional, default: `feature`): Branch prefix
- `--from <branch>` (optional, default: current branch): Base branch
- `--install` (optional): Run package manager install after creation

**Behavior**:
1. Validate name doesn't conflict with existing worktree
2. Create worktree: `git worktree add ../<project>-wt-<name> -b <type>/<name>`
3. If `--from`: checkout from that branch instead
4. If `--install`: detect PM and run install in new worktree
5. Output summary with path and next steps

### FR2: List/Status (`--list`)

**Behavior**:
1. Run `git worktree list --porcelain` for machine-readable output
2. For each worktree, gather:
   - Branch name
   - Last commit message (short)
   - Count of uncommitted changes (`git status --porcelain` in each dir)
3. Display as formatted table
4. Mark current worktree with indicator

### FR3: Remove (`--remove <name>`)

**Flags**:
- `--remove <name>` (required): Worktree to remove
- `--delete-branch` (optional): Also delete the associated branch
- `--force` (optional): Skip uncommitted changes warning

**Behavior**:
1. Check for uncommitted changes
2. If changes exist and no `--force`: warn and ask confirmation
3. Run `git worktree remove ../<project>-wt-<name>`
4. If `--delete-branch`: delete branch with `git branch -d` (not `-D`)
5. Report result

### FR4: Prune (`--prune`)

**Behavior**:
1. Run `git worktree prune --verbose`
2. Report what was pruned or "nothing to prune"

---

## Technical Considerations

### Skill Structure

- File: `.claude/skills/worktree.md`
- Allowed tools: `Bash`, `AskUserQuestion`, `Read`, `Glob`
- `disable-model-invocation: true` (user-initiated only)

### Edge Cases

| Case | Behavior |
|------|----------|
| Name already exists | Error with suggestion to use different name or `--list` |
| Branch already exists | Error: "Branch `feature/auth` already exists. Use `--from feature/auth` or choose a different name." |
| Worktree has uncommitted changes on remove | Warn + confirm unless `--force` |
| No worktrees exist on `--list` | "No additional worktrees found. Use `/worktree --create <name>` to create one." |
| Running from inside a worktree | Works fine - git worktree commands work from any worktree |
| Project name detection | Extract from current directory basename (strip `-wt-*` suffix if in a worktree) |

### Project Name Detection

```bash
# Get project root name, handling both main repo and worktrees
basename $(git rev-parse --show-toplevel) | sed 's/-wt-.*//'
```

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Adoption | Team members use `/worktree` instead of raw git commands | Observation |
| Naming consistency | 100% of worktrees follow `project-wt-<name>` convention | `git worktree list` |
| Friction reduction | Create worktree in 1 command vs 3-4 manual steps | Command count |

---

## Open Questions

- [ ] Should `--list` be the default when running `/worktree` with no flags?
- [ ] Should we support a `--cd` flag that outputs a `cd` command for the user to copy?
- [ ] Worth adding a `--clone` flag that copies `.env` or config files to the new worktree?

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Directory naming collision with non-worktree dirs | Low | Check existence before creating |
| Accidental branch deletion on remove | Medium | Use `git branch -d` (safe delete), require `--delete-branch` explicitly |
| Large repos: dep install takes long | Low | `--install` is opt-in, not default |
