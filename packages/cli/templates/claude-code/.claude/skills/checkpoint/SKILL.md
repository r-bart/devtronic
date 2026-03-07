---
name: checkpoint
description: Save current session progress for resumption. Creates a compact state document with what's done, what's pending, and how to continue.
allowed-tools: Read, Write, Bash, Glob
argument-hint: "[task-name]"
---

# Checkpoint - Session State Compaction

Saves current progress to a file so you can start a fresh session without losing context. If `$ARGUMENTS` provides a task name, use it for the checkpoint slug; otherwise derive it from the current work.

## When to Use

- Context feels "heavy" after extended work
- Before taking a break
- After completing a major phase
- When the AI starts making obvious mistakes
- Before a risky operation

---

## Auto-Suggestion

**Claude should proactively suggest `/checkpoint` when:**

- Conversation exceeds ~40-50 messages
- Multiple complex tasks have been completed in one session
- User mentions taking a break or stopping
- Before risky operations (large refactors, migrations)
- Context feels sluggish or Claude starts forgetting earlier decisions

**How to suggest:**
```
We've been working for a while and completed several tasks.
Consider running /checkpoint to save progress before continuing.
```

**Don't wait until context is full** - by then, quality has already degraded.

---

## Why Checkpoint?

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONTEXT WINDOW DEGRADATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  0-40% used   ████████░░░░░░░░░░░░  Optimal performance        │
│  40-60% used  ████████████░░░░░░░░  Good, consider checkpoint  │
│  60-80% used  ████████████████░░░░  Degrading, checkpoint soon │
│  80%+ used    ████████████████████  Poor, checkpoint NOW       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

As context fills up, the model forgets earlier instructions and makes inconsistent decisions.

---

## Process

```
1. SUMMARIZE PROGRESS
   ├── Original goal
   ├── What's completed
   └── Files modified

2. CAPTURE CURRENT STATE
   ├── What's working
   ├── What's broken/pending
   └── Any errors

3. DEFINE NEXT STEPS
   └── Clear, actionable actions

4. SAVE TO FILE
   ├── thoughts/checkpoints/YYYY-MM-DD_HH-MM_[slug].md (timestamped)
   ├── thoughts/STATE.md (overwrite — current position)
   └── thoughts/SUMMARY.md (overwrite — session recap)
```

---

## Template

Save to: `thoughts/checkpoints/YYYY-MM-DD_HH-MM_[task-slug].md`

```markdown
# Checkpoint: [Task Name]

**Created**: YYYY-MM-DD HH:MM
**Branch**: [current branch]
**Context**: [~X% used, or "fresh session recommended"]

---

## Original Goal

[What we set out to accomplish]

---

## Completed

- [x] [Task 1]
  - Modified: `path/to/file.ts`
  - Added: `path/to/new/file.ts`

- [x] [Task 2]
  - Modified: `path/to/another.ts`

---

## Current State

### Working
- [What's functional now]

### Not Working / Pending
- [What's broken or incomplete]

### Errors (if any)
\`\`\`
[Relevant error messages]
\`\`\`

---

## Files Modified This Session

| File | Change | Status |
|------|--------|--------|
| `src/components/Feature.tsx` | Created | Complete |
| `src/hooks/useFeature.ts` | Modified | Complete |
| `src/pages/FeaturePage.tsx` | Modified | Partial |

---

## Next Steps

To continue in a new session:

1. **Immediate next action**:
   [Specific, actionable step]

2. **Then**:
   [Following step]

3. **Verification**:
   \`\`\`bash
   [Commands to run]
   \`\`\`

---

## Context for Next Session

### Key Decisions Made
- [Decision 1]: [Why]
- [Decision 2]: [Why]

### Things to Remember
- [Important detail]
- [Gotcha discovered]

### Related Files
- `path/to/file.ts` - [Why relevant]
- `thoughts/plans/[feature].md` - [If applicable]

---

## Resume Command

Copy this to start your next session:

\`\`\`
I'm resuming work from a checkpoint. Please read:
thoughts/checkpoints/YYYY-MM-DD_HH-MM_[slug].md

The immediate next step is: [specific action]
\`\`\`
```

---

## Quick Checkpoint (Short Form)

```markdown
# Quick Checkpoint: [Task]

**Time**: YYYY-MM-DD HH:MM
**Branch**: [branch]

## Done
- [x] Thing 1
- [x] Thing 2

## Next
1. [Immediate step]
2. [Following step]

## Notes
- [Key thing to remember]
```

---

## Persistent State Files

In addition to the timestamped checkpoint, **always** update these two files:

### thoughts/STATE.md

Overwrite entirely. This is the "where am I" file.

```markdown
# Project State

**Updated**: YYYY-MM-DD HH:MM
**Branch**: [current git branch]
**Active Feature**: [feature name or "none"]
**Workflow Position**: [e.g., "implementing", "plan approved", "post-review pending"]
**Active Plan**: [path to plan file, or "none"]

## Key Decisions

- [Decision]: [Why] (date)

## Current Blockers

- [Blocker or "None"]

## Modified Files (this session)

- `path/to/file.ts` — [complete/partial]
```

### thoughts/SUMMARY.md

Overwrite entirely. This is the "what happened last time" file.

```markdown
# Session Summary

**Date**: YYYY-MM-DD HH:MM
**Feature**: [what was being worked on]
**Branch**: [branch name]

## What Was Done

- [Completed item 1]
- [Completed item 2]

## What's Pending

- [Remaining item 1]

## Next Steps

1. [Immediate next action]
2. [Following step]
```

---

## Resuming

In a new session:

```
Please read my checkpoint: thoughts/checkpoints/YYYY-MM-DD_HH-MM_[slug].md

Continue from where I left off. The next step is [X].
```

---

## Tips

1. **Checkpoint before complexity** - Before risky changes
2. **Include error messages** - Valuable context
3. **Be specific about next steps** - Future you will thank you
4. **Commit first** - Checkpoint after committing for clean state
