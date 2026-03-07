---
name: backlog
description: Manage the issue backlog. Add, prioritize, start work, complete, and cleanup items. Keeps the file manageable with automatic limits.
allowed-tools: Read, Write, Edit, Glob, AskUserQuestion
argument-hint: "[add|move|cleanup] [args]"
---

# Backlog - Issue Management

Manages `thoughts/BACKLOG.md` efficiently, keeping the file clean and manageable. Parse `$ARGUMENTS` for the subcommand (add, move, cleanup) and its arguments.

## Files

```
thoughts/BACKLOG.md          # Active backlog
thoughts/archive/backlog/    # Archived items
```

---

## Cleanup Rules

```
┌─────────────────────────────────────────────────────────────────┐
│  AUTOMATIC CLEANUP (check on every /backlog interaction)        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Completed: Maximum 5 items                                  │
│     → Archive oldest when adding 6th                            │
│                                                                 │
│  🔄 In Progress: Maximum 3 items                                │
│     → Don't start new work if 3 in progress                     │
│                                                                 │
│  📋 Total Backlog: Maximum 20 items                             │
│     → Force prioritization/cleanup before adding new            │
│                                                                 │
│  ⏰ Stale Items: > 30 days without movement                     │
│     → Prompt to review, reprioritize, or remove                 │
│                                                                 │
│  📦 Monthly Archive: 1st of each month                          │
│     → Archive all completed items                               │
│                                                                 │
│  🗑️ Archive Retention: > 6 months                               │
│     → Purge archives older than 6 months                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cleanup Check (run on every interaction)

Before executing any `/backlog` command:

```
1. Count completed items → if > 5: archive oldest
2. Count total items → if > 20: prompt cleanup before proceeding
3. Check dates → if any item > 30 days stale: notify user
4. Check archive folder → if files > 6 months old: prompt purge
```

---

## Commands

### View backlog
```
/backlog
```

### Add item
```
/backlog add "Title of item"
```

### Move item
```
/backlog move BACK-XXX high|medium|low|progress|done
```

### Cleanup
```
/backlog cleanup
```

---

## Item Structure

```markdown
### [BACK-042] Feature title
- **Type**: feature | bug | tech-debt | improvement
- **Priority**: high | medium | low
- **Description**: Brief description
- **Success criteria**: How we know it's done
- **Docs**:
  - Spec: thoughts/specs/BACK-042_feature.md
  - Plan: thoughts/plans/BACK-042_feature.md
- **Added**: 2026-02-05
- **Completed**: 2026-02-05 (PR #234)
```

---

## BACKLOG.md Template

```markdown
# Backlog

Last updated: YYYY-MM-DD

---

## 🔄 In Progress

### [BACK-042] Current feature
- **Type**: feature
- **Started**: 2026-01-28
- **Description**: What we're building

---

## 🔴 High Priority

### [BACK-045] Critical bug
- **Type**: bug
- **Description**: What's broken
- **Added**: 2026-01-20

---

## 🟡 Medium Priority

### [BACK-046] Improvement
- **Type**: improvement
- **Description**: What to improve
- **Added**: 2026-01-15

---

## 🟢 Low Priority

### [BACK-047] Nice to have
- **Type**: feature
- **Description**: Future idea
- **Added**: 2026-01-10

---

## ✅ Recently Completed

### [BACK-041] Previous feature
- **Type**: feature
- **Completed**: 2026-01-25 (PR #230)
```

---

## Workflow Integration

### During /spec or /create-plan

If something out of scope is discovered:

```
"I noticed [X] needs work but it's out of scope.
Add to backlog?"
→ Yes: Create item with reference to current plan
→ No: Continue without recording
```

### Starting work

```
User: "I want to work on notifications"

1. Read BACKLOG.md
2. Find related item
3. If exists: "Found BACK-042. Work on this?"
4. Move to "In Progress"
```

### Completing work

After successful `/post-review`:

1. Move item to "Completed"
2. Add date and PR reference
3. Run cleanup check

---

## ID Generation

```
BACK-XXX where XXX is sequential (zero-padded 3 digits)

To get next ID:
1. Find highest number in BACKLOG.md
2. Check archive/backlog/*.md
3. Use max + 1
```

---

## Archive Format

`thoughts/archive/backlog/YYYY-MM.md`:

```markdown
# Backlog Archive - 2026-01

Completed items from January 2026.

---

## Archived Items

### [BACK-001] Initial setup
- **Completed**: 2026-01-15
- **PR**: #45
- **Notes**: Base project configuration
```

---

## Tips

1. **One item = one scope** - If too big, split it
2. **Review weekly** - Reprioritize as needed
3. **Don't accumulate** - Cleanup rules help, but stay disciplined
4. **Link everything** - References to origin and related docs
5. **Archive freely** - It's there if needed, auto-purged after 6 months
