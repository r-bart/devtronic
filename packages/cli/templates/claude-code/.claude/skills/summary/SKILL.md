---
name: summary
description: Generate a structured post-change summary. Captures what changed, why, what's pending, and files modified.
allowed-tools: Read, Write, Bash, Glob, Grep
argument-hint: "[feature-name]"
---

# Summary - Post-Change Documentation

Generates a structured summary of what was accomplished in the current session. Saves to persistent files so the next session (or another developer) can pick up seamlessly.

## When to Use

- After completing a feature or significant change
- Before creating a PR (complements `/post-review`)
- At the end of a work session
- After a multi-step refactor
- When handing off work to someone else

**Difference from `/checkpoint`**: Checkpoint saves *how to resume* (state + next steps). Summary documents *what was done and why* (change log + rationale). Use both: `/summary` first, then `/checkpoint` if pausing.

**Difference from `/post-review`**: Post-review validates quality and catches issues. Summary documents the narrative of changes for posterity.

---

## Process

```
1. GATHER CHANGES
   ├── git diff (staged + unstaged)
   ├── git log (commits this session/branch)
   └── Modified files list

2. ANALYZE INTENT
   ├── Read active plan/spec (if referenced in STATE.md)
   ├── Infer "why" from commit messages + code changes
   └── Identify scope (feature, bugfix, refactor, chore)

3. GENERATE SUMMARY
   ├── What changed (grouped by area)
   ├── Why it changed (rationale)
   ├── What's pending (remaining work)
   └── Decisions made (and alternatives considered)

4. SAVE
   ├── thoughts/SUMMARY.md (overwrite — latest summary)
   └── thoughts/summaries/YYYY-MM-DD_[slug].md (archive)
```

---

## Step 1: Gather Changes

```bash
# What branch are we on?
git branch --show-current

# Commits on this branch (vs main)
git log main..HEAD --oneline 2>/dev/null || git log -20 --oneline

# Files changed
git diff --stat main...HEAD 2>/dev/null || git diff --stat HEAD~5..HEAD

# Full diff for analysis (staged + unstaged)
git diff HEAD --stat
```

If `$ARGUMENTS` provides a feature name, use it as the slug. Otherwise derive from the branch name or most recent commit message.

---

## Step 2: Analyze Intent

### Find Context

1. Check `thoughts/STATE.md` for `Active Plan` or `Active Feature`
2. If a plan exists, read it to understand original goals
3. If a spec exists, read it to understand requirements

### Categorize Changes

Determine the type of work:

| Type | Signal |
|------|--------|
| **Feature** | New files, new exports, new routes/endpoints |
| **Bug fix** | Targeted changes, test additions for edge cases |
| **Refactor** | Renames, moves, restructuring without behavior change |
| **Chore** | Config, deps, CI, docs-only changes |
| **Enhancement** | Additions to existing features |

---

## Step 3: Generate Summary

### Template

```markdown
# Summary: [Feature Name]

**Date**: YYYY-MM-DD
**Type**: [Feature | Bug Fix | Refactor | Chore | Enhancement]
**Branch**: [branch name]
**Scope**: [X files changed, +Y/-Z lines]

---

## What Changed

### [Area 1] (e.g., "Authentication")

- Added `src/auth/TokenRefresh.ts` — handles JWT refresh logic
- Modified `src/auth/AuthProvider.tsx` — integrated refresh on 401

### [Area 2] (e.g., "API Layer")

- Modified `src/api/client.ts` — added interceptor for token refresh

---

## Why

[1-3 sentences explaining the rationale. Link to spec/plan if available.]

Example: "Users were getting logged out after 15 minutes because the JWT expired without refresh. This adds automatic token refresh on 401 responses, extending sessions indefinitely while the refresh token is valid."

---

## Decisions Made

| Decision | Rationale | Alternative Considered |
|----------|-----------|----------------------|
| [e.g., "Interceptor-based refresh"] | [e.g., "Centralizes logic, no per-call changes"] | [e.g., "Per-call retry wrapper"] |

---

## What's Pending

- [ ] [Remaining item 1]
- [ ] [Remaining item 2]
- [ ] [Or "Nothing — feature is complete"]

---

## Quality Status

| Check | Status |
|-------|--------|
| typecheck | ✅ / ❌ |
| lint | ✅ / ❌ |
| tests | ✅ / ❌ |
```

---

## Step 4: Save Files

### Primary: `thoughts/SUMMARY.md`

**Always overwrite.** This is the "what happened last" file read by `/brief` and `/checkpoint`.

Use the template above but in a condensed format:

```markdown
# Session Summary

**Date**: YYYY-MM-DD HH:MM
**Feature**: [what was worked on]
**Type**: [Feature | Bug Fix | Refactor | Chore]
**Branch**: [branch name]

## What Was Done

- [Completed item 1]
- [Completed item 2]
- [Completed item 3]

## Why

[1-2 sentences]

## Key Decisions

- [Decision]: [Why]

## What's Pending

- [Remaining item or "Nothing — complete"]

## Files Modified

| File | Change |
|------|--------|
| `path/to/file.ts` | Added — [purpose] |
| `path/to/other.ts` | Modified — [what changed] |

## Next Steps

1. [Immediate next action]
2. [Following step]
```

### Archive: `thoughts/summaries/YYYY-MM-DD_[slug].md`

Save the full template (from Step 3) as a timestamped archive. This builds a history of changes over time.

```bash
# Ensure directory exists
mkdir -p thoughts/summaries
```

Use the feature name (or branch name) as the slug: `2026-02-27_token-refresh.md`

---

## Output

After saving, display a confirmation:

```markdown
## Summary Saved

- **Latest**: `thoughts/SUMMARY.md` (overwritten)
- **Archive**: `thoughts/summaries/YYYY-MM-DD_[slug].md`

### Quick View

**[Feature Name]** ([Type]) — [X files, +Y/-Z lines]

[1-sentence description of what was done]

Pending: [count items or "Nothing"]
```

---

## Edge Cases

### No Changes Detected

If `git diff` and `git log` show nothing:

```markdown
No changes detected since last commit. Nothing to summarize.

If you made changes in a previous session, they may already be committed.
Run `git log -5 --oneline` to see recent commits.
```

### First Session (No Prior State)

If no `thoughts/STATE.md` or previous summaries exist, proceed normally but note:

> This is the first summary for this project. Future `/brief` sessions will use this as context.

### Multiple Features in One Session

If commits span multiple unrelated changes, group them by topic:

```markdown
## What Changed

### Feature: Token Refresh
- [changes...]

### Chore: Dependency Updates
- [changes...]
```

---

## Tips

1. **Run after completing work** — Capture context while it's fresh
2. **Be specific about "why"** — Future you won't remember the reasoning
3. **Document decisions** — Especially ones where you considered alternatives
4. **Include pending items** — Makes resumption effortless
5. **Pair with `/checkpoint`** — Summary captures narrative, checkpoint captures state
6. **Run before `/post-review`** — Summary helps structure your review
