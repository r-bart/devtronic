---
name: worktree
description: Manage git worktrees with intuitive flags. Create, list, remove, and prune worktrees with consistent naming and enriched status.
allowed-tools: Bash, AskUserQuestion, Read, Glob
argument-hint: "[--create|--list|--remove|--prune] [name]"
---

# Worktree - Git Worktree Manager

Simplifies git worktree operations with consistent naming, smart defaults, and enriched status views. Parse `$ARGUMENTS` for the operation flag (--create, --list, --remove, --prune) and any name/options.

## When to Use

- Starting parallel work on a different feature/fix
- Checking status of all active worktrees
- Cleaning up finished worktrees
- Running multiple Claude Code sessions simultaneously

**Skip for:** Single-branch work, quick edits that don't need isolation.

---

## Workflow

```
┌─────────────────────────────────────────────────────────┐
│                      /worktree                           │
├─────────────────────────────────────────────────────────┤
│  --create <name>  → Create worktree + branch             │
│  --list           → Enriched status of all worktrees     │
│  --remove <name>  → Remove worktree (with guardrails)    │
│  --prune          → Clean stale references               │
└─────────────────────────────────────────────────────────┘
```

---

## Flag Reference

| Flag | Required | Description |
|------|----------|-------------|
| `--create <name>` | Yes* | Create a new worktree |
| `--type <type>` | No | Branch prefix: `feature` (default), `fix`, `chore`, `refactor`, `docs` |
| `--from <branch>` | No | Base branch (default: current branch) |
| `--install` | No | Run package manager install after creation |
| `--list` | Yes* | List all worktrees with enriched status |
| `--remove <name>` | Yes* | Remove a worktree |
| `--delete-branch` | No | Also delete the associated branch on remove |
| `--force` | No | Skip confirmation prompts |
| `--prune` | No | Clean up stale worktree references |

*One of `--create`, `--list`, `--remove`, or `--prune` is required.

---

## Operation: Create (`--create <name>`)

### Parse Input

Extract from the user's command:
- `name`: The worktree identifier (required)
- `type`: Branch prefix (default: `feature`)
- `from`: Base branch (default: current branch)
- `install`: Whether to install dependencies (default: false)

### Execute

**Step 1**: Detect project name and validate.

```bash
# Get the project root name (handles being inside a worktree)
PROJECT_NAME=$(basename $(git rev-parse --show-toplevel) | sed 's/-wt-.*//')
```

Validate that a worktree with this name doesn't already exist:
```bash
git worktree list | grep "wt-<name>"
```

Also validate the target branch doesn't already exist:
```bash
git branch --list "<type>/<name>"
```

If either exists, report the conflict and stop.

**Step 2**: Create the worktree.

```bash
git worktree add ../${PROJECT_NAME}-wt-<name> -b <type>/<name>
```

If `--from <branch>` was specified:
```bash
git worktree add ../${PROJECT_NAME}-wt-<name> -b <type>/<name> <from>
```

**Step 3**: If `--install` flag is present, detect package manager and install:

```bash
# Detect PM by checking lockfiles in the NEW worktree
cd ../${PROJECT_NAME}-wt-<name>
if [ -f pnpm-lock.yaml ]; then pnpm install
elif [ -f yarn.lock ]; then yarn install
elif [ -f bun.lockb ]; then bun install
else npm install
fi
```

**Step 4**: Output summary.

```
Worktree created:
  Directory: ../<PROJECT_NAME>-wt-<name>
  Branch:    <type>/<name>
  Based on:  <from|current branch>
  Deps:      installed | skipped (use --install to install)

Next steps:
  cd ../<PROJECT_NAME>-wt-<name>
  claude    # Start a new Claude Code session
```

---

## Operation: List (`--list`)

### Execute

**Step 1**: Get worktree list.

```bash
git worktree list --porcelain
```

**Step 2**: For each worktree, gather enriched info:

```bash
# For each worktree path:
cd <worktree_path>
BRANCH=$(git branch --show-current)
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null)
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
```

**Step 3**: Display as a formatted table.

```
Git Worktrees:

| # | Directory                          | Branch        | Last Commit          | Changes |
|---|------------------------------------|---------------|----------------------|---------|
| * | /path/to/project                   | develop       | abc1234 feat: ...    | 3       |
|   | /path/to/project-wt-auth           | feature/auth  | def5678 wip: ...     | 0       |
|   | /path/to/project-wt-bugfix         | fix/login     | ghi9012 fix: ...     | 5       |

* = current worktree
```

If no additional worktrees exist:
```
No additional worktrees found. Use /worktree --create <name> to create one.
```

---

## Operation: Remove (`--remove <name>`)

### Execute

**Step 1**: Resolve the worktree path.

```bash
PROJECT_NAME=$(basename $(git rev-parse --show-toplevel) | sed 's/-wt-.*//')
WORKTREE_PATH="../${PROJECT_NAME}-wt-<name>"
```

Verify it exists:
```bash
git worktree list | grep "wt-<name>"
```

If not found, report error and show available worktrees.

**Step 2**: Check for uncommitted changes.

```bash
cd <WORKTREE_PATH>
git status --porcelain
```

If there are uncommitted changes AND `--force` was NOT specified:
- Use AskUserQuestion to warn the user and ask for confirmation
- Show the list of uncommitted changes
- Options: "Remove anyway" or "Cancel"

**Step 3**: Remove the worktree.

```bash
git worktree remove <WORKTREE_PATH>
```

If removal fails (e.g., untracked files), and user confirmed:
```bash
git worktree remove --force <WORKTREE_PATH>
```

**Step 4**: If `--delete-branch` flag is present:

```bash
# Get branch name before removal (or from naming convention)
git branch -d <type>/<name>
```

Use `-d` (safe delete, fails if unmerged) not `-D`. If branch is unmerged, warn the user.

**Step 5**: Output result.

```
Worktree removed:
  Directory: ../<PROJECT_NAME>-wt-<name> (deleted)
  Branch:    <type>/<name> (deleted | kept)
```

---

## Operation: Prune (`--prune`)

### Execute

```bash
git worktree prune --verbose
```

Output the result. If nothing was pruned:
```
Nothing to prune. All worktree references are valid.
```

---

## No Flags Provided

If the user runs `/worktree` with no flags, default to `--list` behavior.

---

## Error Handling

| Error | Response |
|-------|----------|
| Name conflict | "Worktree `wt-<name>` already exists. Run `/worktree --list` to see active worktrees." |
| Branch conflict | "Branch `feature/<name>` already exists. Use `--from feature/<name>` to base off it, or choose a different name." |
| Not a git repo | "Not inside a git repository. Navigate to a repo first." |
| Worktree not found on remove | "Worktree `wt-<name>` not found." + show available worktrees |
| Unmerged branch on delete | "Branch `feature/<name>` has unmerged changes. Merge first or delete manually with `git branch -D`." |

---

## Tips

1. **Default to `--list`**: Run `/worktree` with no flags to see all active worktrees
2. **Keep names short**: `/worktree --create auth` not `/worktree --create user-authentication-system`
3. **Clean up often**: Use `--remove` when done, `--prune` periodically
4. **One branch per worktree**: Git enforces this - if a branch is checked out in another worktree, you can't use it
5. **Install is opt-in**: Use `--install` only when you need to run code in the new worktree immediately
