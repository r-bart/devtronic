---
name: handoff
description: Context rotation for fresh sessions. Saves current state and signals to start a new session with clean context.
allowed-tools: Read, Write, Bash, Glob
argument-hint: "[reason]"
---

# Handoff — Context Rotation

Save current state and signal to start a fresh session. Use when context is exhausted or at natural breakpoints.

Reason: `$ARGUMENTS`

## When to Use

- Context feels heavy after extended work (>50 messages)
- Model making inconsistent or repetitive decisions
- Natural breakpoint between phases
- Before risky operations that benefit from fresh context
- When you want to "wrap up" and continue later

**Not for:**
- Quick saves mid-session → use `/checkpoint`
- End of planned execution → `/execute-plan` handles its own recap
- Just documenting what happened → use `/recap` or `/summary`

**Difference from `/checkpoint`:**

| | `/handoff` | `/checkpoint` |
|-|------------|---------------|
| **Purpose** | End session, rotate context | Save progress, continue or pause |
| **Saves** | STATE.md + RECAP.md | Checkpoint file only |
| **Signal** | "Start a new session" | "Can resume from here" |
| **Best for** | Context exhaustion | Mid-session saves |

---

## Process

```
1. SUMMARIZE
   └── What was accomplished, what's pending, key decisions

2. RECAP
   └── Run /recap logic if RECAP.md is stale

3. SAVE
   └── Update STATE.md with handoff context

4. SIGNAL
   └── Tell user to start fresh session with specific next step
```

---

## Step 1: Summarize

Gather context for the handoff:

- **Accomplished**: What was done this session (from git log + changes)
- **Pending**: What remains to be done
- **Key Decisions**: Important choices made during the session
- **Blockers**: Anything blocking progress
- **Active Branch**: Current git branch
- **Active Plan**: Path to current plan (if any)

---

## Step 2: Recap

Check if `thoughts/RECAP.md` is fresh (updated in last 10 minutes).

- If stale or missing: generate a recap (same logic as `/recap`)
- If fresh: use existing content

---

## Step 3: Save STATE.md

Update `thoughts/STATE.md` with handoff context:

```markdown
# Project State

**Last Updated**: YYYY-MM-DD HH:MM
**Branch**: [current branch]
**Workflow Position**: handoff
**Handoff Reason**: [reason from $ARGUMENTS or auto-detected]

## Active Work

- **Feature**: [current feature/task]
- **Plan**: [path to active plan, if any]
- **Phase**: [current phase in the plan]

## Session Summary

[Brief summary of what was accomplished]

## Key Decisions

- [Decision 1]: [rationale]
- [Decision 2]: [rationale]

## Pending Work

- [ ] [Next task 1]
- [ ] [Next task 2]

## Blockers

- [Blocker description, if any]

## Resume Instructions

1. Read this file: `thoughts/STATE.md`
2. Read the recap: `thoughts/RECAP.md`
3. Read the context: `thoughts/CONTEXT.md` (if exists)
4. Continue with: [specific next step]
```

### Merge with existing STATE.md

If `thoughts/STATE.md` already exists:
- **Preserve**: Key Decisions from previous sessions (append, don't replace)
- **Update**: Active Work, Pending Work, Workflow Position
- **Replace**: Session Summary, Resume Instructions

---

## Step 4: Signal

Display a clear handoff message to the user:

```markdown
## Handoff Complete

**Reason**: [reason]
**Branch**: `feat/auth`
**State saved**: `thoughts/STATE.md`
**Recap saved**: `thoughts/RECAP.md`

### To resume in a new session:

```
Please read thoughts/STATE.md and thoughts/RECAP.md, then continue with:
[specific next step]
```

**Tip**: Copy the resume command above into your new session.
```

---

## Examples

```bash
# Context exhaustion
/handoff context is getting heavy

# Natural breakpoint
/handoff phase 1 complete, moving to phase 2

# Before risky operation
/handoff about to refactor auth, want fresh context

# End of day
/handoff wrapping up for today
```

---

## Tips

1. **Run `/recap` first** if you want a more detailed session summary
2. **Be specific about next steps** — the resume instructions should be actionable
3. **Don't over-use** — if you're just taking a short break, `/checkpoint` is lighter
4. **Key decisions are gold** — always capture important decisions made during the session
