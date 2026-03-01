---
name: briefing
description: Pre-planning alignment Q&A. Generates targeted questions to clarify scope, style, priority and constraints before diving into implementation.
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
argument-hint: "[topic]"
---

# Briefing — Pre-Planning Alignment

Align on `$ARGUMENTS` before planning or implementation by asking targeted questions about scope, style, priority, and constraints.

## When to Use

- Before `/create-plan` or `/execute-plan` on complex features
- When requirements are vague or ambiguous
- When multiple valid approaches exist and you need user preference
- When starting a multi-phase project

**Skip when:**
- Task is well-defined and straightforward
- User explicitly says "just do it"
- Already have a detailed spec from `/spec`

---

## Process

```
1. ANALYZE
   └── Read task context, existing state, project rules

2. GENERATE
   └── Create 3-5 targeted questions

3. ASK
   └── Present questions via AskUserQuestion

4. SAVE
   └── Write decisions to thoughts/CONTEXT.md

5. SUGGEST
   └── Recommend next step (/create-plan, /execute-plan, etc.)
```

---

## Step 1: Analyze Task

Read the following (if they exist) to understand current state:

```
thoughts/STATE.md      — Current workflow position, active branch, blockers
CLAUDE.md              — Project rules and conventions
thoughts/CONTEXT.md    — Previous briefing decisions (if any)
thoughts/SUMMARY.md    — Latest session summary
```

Also scan:
- `thoughts/specs/` for related specs
- `thoughts/plans/` for existing plans on this topic
- Recent git log for related work

---

## Step 2: Generate Questions

Create 3-5 targeted questions based on:

| Category | Example Questions |
|----------|-------------------|
| **Scope** | "Should this cover just the API or also the UI?" |
| **Style** | "Prefer composition or inheritance for this?" |
| **Priority** | "Ship fast or build for extensibility?" |
| **Constraints** | "Any performance budgets or browser support requirements?" |
| **Dependencies** | "Should this integrate with X or be standalone?" |

**Rules for good questions:**
- Each question should have 2-4 concrete options (not open-ended)
- Questions should resolve genuine ambiguity (don't ask obvious things)
- Fewer questions is better — only ask what changes the approach
- Include a recommended option when you have a clear preference

---

## Step 3: Ask

Use `AskUserQuestion` to present questions one at a time or as a batch.

For each question, provide:
- Clear question text
- 2-4 options with descriptions
- Mark your recommended option (if any)

---

## Step 4: Save Context

Write decisions to `thoughts/CONTEXT.md`:

```markdown
# Briefing Context

**Topic**: [topic from $ARGUMENTS]
**Date**: YYYY-MM-DD
**Status**: Active

## Decisions

### Scope
[Decision and rationale]

### Style
[Decision and rationale]

### Priority
[Decision and rationale]

### Constraints
[Any constraints identified]

## Additional Notes
[Any other context from the conversation]
```

If `thoughts/CONTEXT.md` already exists, **append** a new section rather than overwriting:

```markdown
---

## Briefing: [topic] (YYYY-MM-DD)

### Decisions
...
```

---

## Step 5: Suggest Next Step

Based on the decisions made, recommend the logical next step:

| Situation | Suggestion |
|-----------|------------|
| Complex feature, no plan | `/create-plan` |
| Plan exists, ready to go | `/execute-plan` |
| Needs spec first | `/spec` |
| Quick task | `/quick` |
| Needs research | `/research --deep` |

---

## Examples

```bash
# Briefing before a feature
/briefing user authentication

# Briefing before a refactor
/briefing migrate from REST to GraphQL

# Briefing for a complex task
/briefing redesign the notification system
```

---

## Tips

1. **Don't over-ask** — 3 questions is often enough
2. **Be concrete** — "Option A: Redis cache, Option B: in-memory Map" not "caching approach?"
3. **Reference existing code** — "The current pattern in `src/auth/` uses X, should we follow that?"
4. **Skip if clear** — If the user already gave detailed instructions, just confirm and save
