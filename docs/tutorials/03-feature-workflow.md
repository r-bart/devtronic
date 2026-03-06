# Tutorial 03: Create a Feature End to End

The complete workflow to implement a feature using all skills.

---

## Objective

By the end of this tutorial:
- You'll have completed the brief → spec → research → plan → implement → summary → review cycle
- You'll understand when to use each skill
- You'll have documentation in thoughts/ as reference

---

## Prerequisites

- Project with devtronic installed (Tutorial 01 or 02)
- A feature to implement (we'll use "notification system" as example)

---

## The Complete Workflow

```
/devtronic:brief [topic]         →  Orientation + pre-flight checks
        │
/devtronic:spec [idea]           →  Define WHAT to build
        │
/devtronic:create-plan [feature] →  Design implementation phases
        │
/devtronic:generate-tests        →  Encode acceptance criteria as failing tests
        │
/devtronic:execute-plan          →  Implement in parallel phases
        │
/devtronic:summary               →  Document what changed and why
        │
/devtronic:post-review           →  Final quality verification
```

---

## Phase 0: Briefing (Optional)

### Run /brief

If you're working on something that may have prior work:

```
/devtronic:brief notifications
```

Claude will scan docs, code, and git for existing work:

```
# Brief: notifications

## Summary

No existing specs or plans found. Some notification-related code exists in utils.

## Key Code Files

| File | Purpose |
|------|---------|
| `src/utils/toast.ts` | Toast notification helper |

## Next Steps

This appears to be new work. Proceed to `/spec`.
```

**Skip if**: This is brand new work with no prior context.

---

## Phase 1: Specification

### Run /spec

```
/devtronic:spec "push notification system for users"
```

Claude will generate an interactive PRD:

```
Claude: I'm going to create a PRD for the notification system.

Before we start, some questions:

1. Do you have design mockups for this feature? (Figma, Sketch, etc.)
   [a] Yes - I'll provide the link
   [b] No

2. What types of notifications?
   [a] In-app only
   [b] Push + email
   [c] Push + email + SMS

3. Per-user configuration?
   [a] Yes, granular by type
   [b] Only global on/off

4. Notification priorities?
   [a] Yes (urgent, normal, low)
   [b] No
```

Answer the questions and Claude will generate:

```
thoughts/specs/2026-02-05_notifications-system.md
```

### Review the Spec

```
Read thoughts/specs/2026-02-05_notifications-system.md
```

Typical content:
- Executive Summary
- Problem Statement
- User Stories
- Functional Requirements
- Technical Considerations
- Design Reference (if mockups were provided)
- Success Metrics

**Important**: Review and adjust before continuing. Changes here are cheap.

---

## Phase 2: Research

### Investigate the Code

```
/devtronic:research --deep "notification patterns in our codebase"
```

Claude will explore:
- How events are currently handled
- Existing domain patterns
- Integrations with external services
- Where the new feature fits

Result:
```
thoughts/devtronic:research/2026-02-05_notifications-research.md
```

### What to Look for in Research

- Is there similar code we can reuse?
- What patterns does the project use?
- Are there technical constraints affecting the design?

---

## Phase 3: Plan

### Create the Plan

```
/devtronic:create-plan notifications system
```

Or if you want detailed plan with pseudocode:

```
/devtronic:create-plan notifications system --detailed
```

Claude will create implementation phases:

```markdown
# Plan: Notification System

## Phase 1: Domain Layer
- NotificationEntity
- NotificationRepository interface
- NotificationService

## Phase 2: Infrastructure
- PrismaNotificationRepository
- PushNotificationProvider
- EmailNotificationProvider

## Phase 3: Application
- SendNotificationUseCase
- GetUserNotificationsUseCase
- MarkAsReadUseCase

## Phase 4: Presentation
- NotificationBell component
- NotificationList component
- NotificationSettings page
```

Result:
```
thoughts/plans/2026-02-05_notifications-plan.md
```

---

## Phase 4: Implementation

### Baby Steps

Implement phase by phase, verifying after each change:

```bash
# After each change
pnpm typecheck && pnpm lint && pnpm test
```

### Example: Phase 1

```
Implement Phase 1 from the notifications plan: Domain Layer
```

Claude will implement:
- `src/domain/Notification/Models/Notification.ts`
- `src/domain/Notification/Repositories/NotificationRepository.ts`
- `src/domain/Notification/Service/NotificationService.ts`

### Verify

```bash
pnpm typecheck  # ✓ No errors
pnpm lint       # ✓ No warnings
pnpm test       # ✓ Tests pass
```

### Checkpoint (Optional)

If the session is long:

```
/devtronic:checkpoint
```

Saves progress in `thoughts/devtronic:checkpoints/`.

### Continue with Phases

```
Implement Phase 2: Infrastructure layer
```

Repeat: implement → verify → next phase.

---

## Phase 5: Summary

### Document Changes

After completing implementation, document what was done:

```
/devtronic:summary notifications
```

Claude will analyze git diff, commits, and generate:

```
thoughts/SUMMARY.md                              (latest, for /brief)
thoughts/summaries/2026-02-05_notifications.md   (archive)
```

This captures: what changed, why, decisions made, and what's pending.

---

## Phase 6: Review

### Run Review

After summarizing:

```
/devtronic:post-review
```

Claude will verify:
- ✅ Meets original spec
- ✅ Follows project architecture
- ✅ Tests cover functionality
- ✅ No code smells
- ✅ Documentation updated

### Strict Review

If you want more rigorous review:

```
/devtronic:post-review --strict
```

"Senior engineer" mode - more demanding, more questions.

### Result

```markdown
## Review Summary

✅ Spec compliance: 100%
✅ Architecture: Clean DDD respected
✅ Test coverage: 85%
⚠️ Minor: Consider adding error boundary in NotificationBell

## Lessons Learned
- Observer pattern was useful for notification events
- Consider rate limiting for push notifications
```

---

## Final Structure in thoughts/

After complete workflow:

```
thoughts/
├── specs/
│   └── 2026-02-05_notifications-system.md
├── research/
│   └── 2026-02-05_notifications-research.md
├── plans/
│   └── 2026-02-05_notifications-plan.md
├── summaries/
│   └── 2026-02-05_notifications.md
├── SUMMARY.md
└── checkpoints/
    └── 2026-02-05_14-30_notifications-phase2.md
```

---

## Final Verification

✅ Feature implemented and working
✅ Tests pass
✅ Spec, research, plan documented
✅ Review approved
✅ Code ready for PR

---

## Next Step

→ [Tutorial 04: Debugging](./04-debugging.md)

Learn to approach errors in a structured way.

---

## Tips

1. **Start with /brief** - Quick orientation on existing work
2. **Don't skip the spec** - It's where you define success
3. **Research before plan** - Avoids redesigns
4. **Baby steps** - Verify after each change
5. **Always review** - Captures lessons learned
6. **Use /devtronic:checkpoint** in long sessions

---

## Workflow Variants

### Small Feature

```
/devtronic:brief dark mode
/devtronic:spec "add dark mode toggle"
/devtronic:create-plan dark mode --detailed
[implement]
/devtronic:summary dark-mode
/devtronic:post-review --quick
```

### Bug Fix

```
/devtronic:brief "login timeout"
[fix]
/devtronic:summary login-timeout-fix
/devtronic:post-review
```

### Refactor

```
/devtronic:brief auth
/devtronic:research --deep "current auth implementation"
/devtronic:create-plan refactor auth to use JWT
[implement]
/devtronic:summary auth-jwt-refactor
/devtronic:post-review --strict
```

### Feature with Design

```
/devtronic:brief [feature]
/devtronic:design --research
/devtronic:design --define
/devtronic:design --ia
/devtronic:design --wireframe
/devtronic:design-system --define   (if design system doesn't exist yet)
/devtronic:spec [feature]
/devtronic:create-plan [feature]
/devtronic:generate-tests
/devtronic:execute-plan
/devtronic:design-review
/devtronic:summary [feature]
/devtronic:post-review
```

Use when visual quality and UX matter — define what to build and how it should feel before writing a single line of code. See [Tutorial 07: Design-First Workflow](./07-design-workflow.md).
