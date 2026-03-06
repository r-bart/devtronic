---
name: recap
description: Quick structured session summary from git activity and modified files. Compact companion to /summary.
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Recap — Quick Session Summary

Generate a compact, structured summary of the current session from git activity and modified files.

## When to Use

- End of a work session (before wrapping up)
- After completing ad-hoc work not driven by `/execute-plan`
- When someone asks "what did we do?"
- Before `/handoff` to capture session details

**Skip when:**
- `/execute-plan` already wrote a recap (check `thoughts/RECAP.md` timestamp)
- Nothing meaningful was done (no commits, no changes)

**Difference from `/summary`:**

| | `/recap` | `/summary` |
|-|----------|------------|
| **Purpose** | Quick compact overview | Detailed narrative with rationale |
| **Output** | Tree-style + bullet points | Full markdown document |
| **Time** | Fast (git-based) | Thorough (reads code + explains) |
| **Best for** | "What happened?" | "Why did it happen?" |

Use `/recap` for quick status, `/summary` for documentation.

---

## Process

```
1. GATHER
   └── git diff, git log, modified files

2. ANALYZE
   └── Group changes by logical task

3. WRITE
   └── Save to thoughts/RECAP.md

4. DISPLAY
   └── Show tree-style summary
```

---

## Step 1: Gather

### Git Activity

```bash
# Commits since session start (last 4 hours or from STATE.md timestamp)
git log --oneline --since="4 hours ago" 2>/dev/null

# Uncommitted changes
git diff --stat 2>/dev/null
git diff --cached --stat 2>/dev/null

# Untracked files
git status --porcelain 2>/dev/null
```

### State Reference

If `thoughts/STATE.md` exists, use its timestamp as the session start.
Otherwise, use the last 4 hours of git activity.

### Modified Files

```bash
# All files changed (committed + uncommitted)
git diff --name-only HEAD~10..HEAD 2>/dev/null
git diff --name-only 2>/dev/null
```

### Design Artifacts

If `thoughts/design/` exists, list which artifacts are present:

```bash
ls thoughts/design/ 2>/dev/null
```

Include design phase state in the recap (which stages are complete).

---

## Step 2: Analyze

Group changes into logical tasks:

1. Parse commit messages for task references (Task X.Y, feat:, fix:, etc.)
2. Group related file changes together
3. Identify completion status:
   - `done` — committed and passing
   - `partial` — uncommitted changes remain
   - `blocked` — errors or failing tests

### For large change sets (>20 files)

Group by directory to avoid overwhelming output:
```
src/auth/         — 8 files (new auth module)
src/api/          — 3 files (API endpoints)
tests/            — 5 files (test coverage)
```

---

## Step 3: Write RECAP.md

Write to `thoughts/RECAP.md`:

```markdown
# Session Recap

**Date**: YYYY-MM-DD HH:MM
**Branch**: [current branch]
**Duration**: ~[estimated from git timestamps]

## Completed

- [Task/change description] — `file1.ts`, `file2.ts`
- [Task/change description] — `file3.ts`

## In Progress

- [Uncommitted work description] — `file4.ts`

## Files Modified

| File | Status | Task |
|------|--------|------|
| `src/auth/login.ts` | new | Auth module |
| `src/api/users.ts` | modified | API endpoints |
| `tests/auth.test.ts` | new | Test coverage |

## Design Phase

<!-- Only include if thoughts/design/ exists -->

| Artifact | Status |
|----------|--------|
| `thoughts/design/research.md` | done / partial / missing |
| `thoughts/design/define.md` | done / partial / missing |
| `thoughts/design/ia.md` | done / partial / missing |
| `thoughts/design/wireframes.md` | done / partial / missing |
| `thoughts/design/design-system.md` | done / partial / missing |

## Pending Work

- [ ] [Remaining task 1]
- [ ] [Remaining task 2]

## Next Steps

1. [Most logical next action]
2. [Follow-up action]
```

### Also update STATE.md

If `thoughts/STATE.md` exists, update its `Last Activity` and `Workflow Position` fields.

---

## Step 4: Display

Show a compact tree-style summary to the user:

```
Session Recap (branch: feat/auth)
├── ✔ Implement login endpoint — 3 files
├── ✔ Add JWT validation — 2 files
├── ○ Write integration tests — 1 file (partial)
└── Pending: error handling, rate limiting

Files: 6 modified, 2 new, 0 deleted
Commits: 3 (last 2 hours)
```

Status indicators:
- `✔` — complete (committed)
- `✖` — failed/blocked
- `○` — partial (uncommitted)

---

## Examples

```bash
# Quick recap of current session
/recap

# Recap is also useful before handoff
/recap
/handoff context exhaustion
```

---

## Tips

1. **Run before `/handoff`** — ensures RECAP.md is fresh for the next session
2. **Run after ad-hoc work** — captures work that wasn't driven by a plan
3. **Don't duplicate `/summary`** — if you need detailed narrative, use `/summary` instead
