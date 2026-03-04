# Git Worktrees for Parallel AI Sessions

Run 3-5 AI sessions in parallel using git worktrees. One of the highest-leverage productivity patterns for AI-assisted development.

## What are Worktrees?

Git worktrees let you have multiple working directories from the same repository, each on a different branch. Unlike multiple clones, they share the same `.git` directory.

```
my-project/              # Main worktree (your normal repo)
my-project-wt-feature/   # Worktree for feature work
my-project-wt-bugfix/    # Worktree for bug fixes
my-project-wt-analysis/  # Worktree for reading/analysis only
```

## Why Use Worktrees?

1. **Parallel work**: Run multiple AI sessions on different tasks simultaneously
2. **Clean context**: Each session has its own working directory and branch
3. **No conflicts**: Changes in one worktree don't affect others
4. **Fast switching**: Jump between tasks without stashing or committing

Works with any IDE: **Claude Code**, **Cursor**, **Windsurf**, **Zed**, and any other AI editor.

---

## Creating Worktrees

### With the `/worktree` skill (recommended)

The devtronic `/worktree` skill abstracts git worktree management with consistent naming and guardrails:

```
/worktree --create auth
/worktree --create api --type fix
/worktree --create analysis --from main
/worktree --list
/worktree --remove auth
/worktree --prune
```

Running `/worktree` with no flags defaults to `--list`.

See the full flag reference in the skill itself.

### With raw git commands

```bash
# From your main repo directory
cd my-project

git worktree add ../my-project-wt-a -b feature/task-a
git worktree add ../my-project-wt-b -b feature/task-b
git worktree add ../my-project-wt-c -b feature/task-c

# Read-only worktree for analysis (stays on main)
git worktree add ../my-project-analysis main
```

---

## Workflow

### Starting Parallel Sessions

Open each worktree in a separate terminal and start your AI session:

```bash
# Terminal 1 — Claude Code
cd ../my-project-wt-a
claude

# Terminal 2 — Cursor
cd ../my-project-wt-b
cursor .

# Terminal 3 — Any IDE
cd ../my-project-wt-c
# open in your preferred editor
```

### Shell Aliases (Optional)

For frequent use, add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias wta="cd ~/projects/my-project-wt-a"
alias wtb="cd ~/projects/my-project-wt-b"
alias wtc="cd ~/projects/my-project-wt-c"
alias wtm="cd ~/projects/my-project"  # Main
```

### Analysis Worktree

Keep a dedicated worktree for read-only tasks — reviewing logs, exploring code, running queries — without risking any modifications:

```bash
cd ../my-project-analysis
# Start your AI session here for read-only tasks
```

### Merging Back

When a task is complete:

```bash
# In the worktree
git add .
git commit -m "Complete feature A"
git push origin feature/task-a

# Create PR
gh pr create

# Clean up
/worktree --remove task-a --delete-branch
```

---

## Managing Worktrees

### List Worktrees

```bash
# Via skill (enriched output with last commit + changes)
/worktree --list

# Raw git
git worktree list
```

### Remove Worktree

```bash
# Via skill (checks for uncommitted changes)
/worktree --remove <name>

# Raw git
git worktree remove ../my-project-wt-a
git worktree remove --force ../my-project-wt-a  # force
```

### Prune Stale References

```bash
/worktree --prune

# Raw git
git worktree prune
```

---

## Best Practices

### 1. Naming Convention

```
project-wt-[identifier]
```

Where identifier can be:
- `a`, `b`, `c` — generic slots
- `feature-name` — specific task
- `analysis` — read-only exploration

The `/worktree` skill enforces this convention automatically.

### 2. Branch Hygiene

- Each worktree should have its own branch
- Git prevents two worktrees from checking out the same branch
- Clean up branches after merging

### 3. Terminal Organization

Color-code terminal tabs or use tmux named windows:

```bash
tmux new-session -s project
# Ctrl+b c — new window
# Ctrl+b , — rename window
```

### 4. Status Line (Claude Code)

Configure the Claude Code status line to show the current branch:

```
/statusline
```

Helps identify which worktree/task you're in at a glance.

---

## Worktrees vs Multiple Clones

| Aspect | Worktrees | Multiple Clones |
|--------|-----------|-----------------|
| Disk space | Shared `.git` | Duplicate `.git` |
| Setup time | Fast | Slow (full clone) |
| Sync | Automatic | Manual fetch |
| Branch safety | Enforced unique | Can conflict |

---

## Troubleshooting

### "Branch already checked out"

```bash
# Can't checkout same branch in two worktrees
# Solution: create a new branch
git worktree add ../my-project-wt-new -b new-branch
```

### Worktree shows wrong files

```bash
cd ../my-project-wt-a
git checkout .
git clean -fd
```

### Lost track of worktrees

```bash
git worktree list

# Find worktrees on disk
find ~ -name ".git" -type f 2>/dev/null | xargs grep -l "gitdir"
```

---

## References

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Claude Code Docs: Parallel Sessions](https://docs.anthropic.com/en/docs/claude-code/tutorials#run-parallel-claude-code-sessions-with-git-worktrees)
