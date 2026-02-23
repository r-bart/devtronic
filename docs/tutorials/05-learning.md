# Tutorial 05: Learning from What Was Implemented

How to use `/learn` to extract knowledge after implementing something.

---

## Objective

By the end of this tutorial:
- You'll know how to use `/learn` to get didactic explanations
- You'll understand how to internalize patterns and techniques
- You'll be able to apply knowledge in other contexts

---

## Prerequisites

- Project with devtronic installed
- Something recently implemented (feature, fix, refactor)

---

## Why Learn Post-Implementation

When Claude implements something, you can:

1. **Accept the code** - It works, next task
2. **Learn from the code** - Understand what was done and why

Option 2 makes you a better developer over time.

---

## The /learn Skill

### Basic Usage

After Claude implements something:

```
/learn
```

Claude will explain what was just done in a didactic way.

### With Specific Context

```
/learn "the notification event system we just built"
```

To learn about something specific in the implementation.

---

## Example: Learning from an Event System

### Context

Claude just implemented an event system for notifications using the Observer pattern.

### Run /learn

```
/learn
```

### The Explanation

```markdown
# What We Implemented: Event System

## Summary
We created an event system based on the Observer pattern to
decouple notification creation from its processing.

## Key Concepts

### 1. Observer Pattern
Allows objects (observers) to subscribe to events from another
object (subject) without direct coupling.

```
Subject (NotificationService)
    │
    ├── notify('created', notification)
    │
    ▼
Observer 1 (EmailSender)     → Sends email
Observer 2 (PushSender)      → Sends push
Observer 3 (Analytics)       → Logs metric
```

### 2. Why This Pattern

**Without Observer:**
```ts
// NotificationService is coupled to everything
async create(notification) {
  await this.save(notification)
  await this.emailService.send(notification)
  await this.pushService.send(notification)
  await this.analytics.track(notification)
}
```

**With Observer:**
```ts
// NotificationService only notifies
async create(notification) {
  await this.save(notification)
  this.eventEmitter.emit('notification.created', notification)
}
```

Handlers are registered separately and can be added/removed
without modifying NotificationService.

### 3. Implementation in Our Code

```
src/domain/Notification/
├── Events/
│   ├── NotificationEvents.ts      # Event definitions
│   └── NotificationEventEmitter.ts
└── Handlers/
    ├── SendEmailHandler.ts
    ├── SendPushHandler.ts
    └── TrackAnalyticsHandler.ts
```

### 4. How the Flow Works

1. User creates notification
2. `CreateNotificationUseCase` calls `NotificationService.create()`
3. Service saves and emits `notification.created` event
4. Subscribed handlers react independently
5. If one handler fails, others continue

## Application to Other Contexts

This pattern is useful when:
- An action must trigger multiple side effects
- You want to add new effects without modifying existing code
- Effects can fail independently

Examples:
- Shopping cart → email, inventory, analytics
- User created → welcome email, onboarding, CRM sync
- Payment processed → receipt, notification, accounting

## To Learn More

- [Event-Driven Architecture in Node.js](https://nodejs.org/api/events.html)
- [Observer Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/observer)
```

---

## What to Ask in /learn

### Specific Concepts

```
/learn "why we used dependency injection here"
```

### Architecture Decisions

```
/learn "the repository pattern we implemented"
```

### Specific Techniques

```
/learn "the optimistic update pattern in the UI"
```

### Comparisons

```
/learn "why zustand instead of context for this state"
```

---

## Structure of a Good Explanation

When you use `/learn`, Claude will include:

1. **Summary** - What was done in one line
2. **Key Concepts** - Patterns and techniques used
3. **Why** - Justification of decisions
4. **Annotated Code** - Examples from actual code
5. **Application** - Where else to apply this
6. **References** - Links to go deeper

---

## Save the Learning

To save it as reference:

```
Save this explanation to thoughts/notes/
```

Claude will create:
```
thoughts/notes/2026-02-05_event-system-pattern.md
```

---

## Continuous Learning

### After Each Feature

```
[implementation completed]
/learn
```

Takes 2 minutes and accelerates your growth.

### Create a Learning Log

```
thoughts/notes/learning-log.md
```

With entries like:
```markdown
## 2026-02-05 - Event System

Learned: Observer pattern to decouple side effects.
Application: Any case with multiple side effects.
```

---

## Verification

✅ You know how to invoke `/learn` after implementations
✅ You understand the structure of explanations
✅ You can save learnings in thoughts/notes/

---

## Next Step

→ [Tutorial 06: Benefits](./06-benefits.md)

Other benefits of devtronic.

---

## Tips

1. **Always ask** - If Claude did something you don't understand, `/learn`
2. **Be specific** - "Learn about X" is better than just "/learn"
3. **Save what's important** - Create your knowledge base in thoughts/notes/
4. **Apply afterward** - Try using the pattern yourself next opportunity

---

## Alternatives to /learn

### During Implementation

```
Explain what you're about to do before implementing
```

### About Existing Code

```
/research --deep "how does the auth system work"
```

### About Decisions

```
Why did you choose X instead of Y?
```
