# Git Worktrees for Parallel Claude Sessions

The #1 productivity tip from the Claude Code team: run 3-5 Claude sessions in parallel using git worktrees.

## What are Worktrees?

Git worktrees let you have multiple working directories from the same repository, each on a different branch. Unlike multiple clones, they share the same `.git` directory.

```
my-project/              # Main worktree (your normal repo)
my-project-wt-feature/   # Worktree for feature work
my-project-wt-bugfix/    # Worktree for bug fixes
my-project-wt-analysis/  # Worktree for reading/analysis only
```

## Why Use Worktrees with Claude Code?

1. **Parallel work**: Run multiple Claude sessions on different tasks simultaneously
2. **Clean context**: Each session has its own working directory and branch
3. **No conflicts**: Changes in one worktree don't affect others
4. **Fast switching**: Jump between tasks without stashing or committing

## Setup

### Create Worktrees

```bash
# From your main repo directory
cd my-project

# Create worktrees for parallel work
git worktree add ../my-project-wt-a -b feature/task-a
git worktree add ../my-project-wt-b -b feature/task-b
git worktree add ../my-project-wt-c -b feature/task-c

# Create a read-only worktree for analysis
git worktree add ../my-project-analysis main
```

### Shell Aliases (Recommended)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Quick navigation to worktrees
alias za="cd ~/projects/my-project-wt-a && code ."
alias zb="cd ~/projects/my-project-wt-b && code ."
alias zc="cd ~/projects/my-project-wt-c && code ."
alias zm="cd ~/projects/my-project && code ."  # Main

# Or with Claude Code
alias ca="cd ~/projects/my-project-wt-a && claude"
alias cb="cd ~/projects/my-project-wt-b && claude"
alias cc="cd ~/projects/my-project-wt-c && claude"
```

Reload shell:
```bash
source ~/.zshrc
```

## Workflow

### Starting Parallel Tasks

```bash
# Terminal 1: Feature A
za  # or: cd my-project-wt-a && claude
> "Implement user authentication"

# Terminal 2: Feature B
zb  # or: cd my-project-wt-b && claude
> "Add API rate limiting"

# Terminal 3: Bug Fix
zc  # or: cd my-project-wt-c && claude
> "Fix the checkout flow bug"
```

### Analysis Worktree

Keep a dedicated worktree for read-only tasks:
- Reading logs
- Running queries
- Exploring code without changing it

```bash
# Analysis worktree stays on main, never modified
cd my-project-analysis
claude
> "Analyze the error logs from today"
> "Run BigQuery to check conversion rates"
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

# Or merge directly (if appropriate)
git checkout main
git merge feature/task-a
```

## Managing Worktrees

### List Worktrees

```bash
git worktree list
# /Users/you/my-project         abc1234 [main]
# /Users/you/my-project-wt-a    def5678 [feature/task-a]
# /Users/you/my-project-wt-b    ghi9012 [feature/task-b]
```

### Remove Worktree

```bash
# Remove when done
git worktree remove ../my-project-wt-a

# Force remove if there are changes
git worktree remove --force ../my-project-wt-a
```

### Prune Stale Worktrees

```bash
# Clean up references to deleted worktrees
git worktree prune
```

## Best Practices

### 1. Naming Convention

Use consistent naming:
```
project-wt-[identifier]
```

Where identifier can be:
- `a`, `b`, `c` (generic)
- `feature-name` (specific)
- `analysis` (read-only)

### 2. Branch Hygiene

- Each worktree should have its own branch
- Don't have two worktrees on the same branch
- Clean up branches after merging

### 3. Terminal Organization

Color-code your terminal tabs:
- Green: Main branch
- Blue: Feature work
- Yellow: Bug fixes
- Gray: Analysis

Or use tmux with named windows:
```bash
tmux new-session -s project
# Ctrl+b c - new window
# Ctrl+b , - rename window
```

### 4. Status Line

Configure Claude Code status line to show current branch:
```
/statusline
```

This helps identify which worktree/task you're in.

## Comparison: Worktrees vs Multiple Clones

| Aspect | Worktrees | Multiple Clones |
|--------|-----------|-----------------|
| Disk space | Shared .git | Duplicate .git |
| Setup time | Fast | Slow (full clone) |
| Sync | Automatic | Manual fetch |
| Branch safety | Enforced unique | Can conflict |

## Troubleshooting

### "Branch already checked out"

```bash
# Can't checkout same branch in two worktrees
# Solution: create a new branch
git worktree add ../my-project-wt-new -b new-branch
```

### Worktree shows wrong files

```bash
# Reset the worktree
cd ../my-project-wt-a
git checkout .
git clean -fd
```

### Lost track of worktrees

```bash
# List all worktrees
git worktree list

# Find worktrees on disk
find ~ -name ".git" -type f 2>/dev/null | xargs grep -l "gitdir"
```

## Example: Full Parallel Session

```bash
# Setup (once)
git worktree add ../project-wt-a -b feature/auth
git worktree add ../project-wt-b -b feature/api
git worktree add ../project-analysis main

# Terminal 1
cd ../project-wt-a
claude
> "Implement JWT authentication following the existing patterns"

# Terminal 2
cd ../project-wt-b
claude
> "Add rate limiting middleware to the API endpoints"

# Terminal 3 (Analysis)
cd ../project-analysis
claude
> "Review the security audit findings and summarize"

# Each Claude session works independently
# Merge when ready via PRs
```

## References

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Claude Code Docs: Parallel Sessions](https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees)
