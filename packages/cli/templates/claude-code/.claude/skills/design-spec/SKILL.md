---
name: design-spec
description: Generates a developer-ready design specification from design artifacts. Bridges design phase and implementation planning.
allowed-tools: Task, Read, Write, Glob
argument-hint: "[screen-name|--all]"
---

# Design:Spec - Developer Handoff Specification

Generates a structured design specification from `thoughts/design/` artifacts, consumable by `/create-plan` and developers.

## When to Use
- After design phase is complete (wireframes + design system defined)
- Before `/create-plan` — spec informs component breakdown
- When handing off design to a developer unfamiliar with the design decisions

---

## Process

```
1. LOAD DESIGN ARTIFACTS
   ├── thoughts/design/wireframes.md (screen layouts, components, states)
   ├── thoughts/design/design-system.md (tokens, component specs)
   ├── thoughts/design/define.md (personas, for context)
   └── thoughts/design/ia.md (navigation, for routing)

2. SCOPE
   └── $ARGUMENTS: specific screen name, or --all for full spec

3. GENERATE SPEC
   Per screen:
   ├── Component breakdown (what to build)
   ├── Props and variants for each component
   ├── Token references (which tokens to use, not raw values)
   ├── Interaction specs (hover, click, keyboard behavior)
   ├── State specs (all 4 states with expected behavior)
   └── Edge cases (empty, error, boundary conditions)

4. WRITE
   └── thoughts/design/spec.md (full handoff document)
```

## Output: `thoughts/design/spec.md`

```markdown
# Design Specification: [Feature/Product]

**Date**: YYYY-MM-DD
**Personas**: [from define.md]
**Status**: ready-for-implementation

---

## Component Inventory

| Component | Screen(s) | Variants | Priority |
|-----------|-----------|----------|----------|
| Button | All | primary, secondary, ghost, destructive | P0 |
| Card | Dashboard, List | default, selected, loading | P0 |
| EmptyState | List, Search | with-cta, without-cta | P1 |

---

## Screen: [Name]

**Route**: /[path]
**Persona**: [primary user]

### Components

#### [ComponentName]

**Purpose**: [what it does in this screen]

**Props**:
| Prop | Type | Values | Default |
|------|------|--------|---------|
| variant | string | 'primary' \| 'secondary' | 'primary' |
| size | string | 'sm' \| 'md' \| 'lg' | 'md' |
| disabled | boolean | true \| false | false |

**Tokens**:
- Background: `color.primary`
- Text: `color.neutral.50`
- Padding: `space.4` (vertical) × `space.6` (horizontal)
- Border radius: `radius.md`

**Interactions**:
| Trigger | Action |
|---------|--------|
| Hover | Background → `color.primary.hover` |
| Focus | Outline `color.primary` 2px offset |
| Click | [what happens] |
| Keyboard Enter/Space | Same as click |

**States**:
| State | Appearance | Behavior |
|-------|-----------|----------|
| Default | [description] | [behavior] |
| Hover | [description] | [behavior] |
| Loading | Spinner replaces label | Disabled interactions |
| Error | [description] | [behavior] |
| Success | [description] | [behavior] |
| Disabled | 40% opacity | No interactions |

**Edge Cases**:
- Long text: truncate with ellipsis at 200px
- [Other edge cases]

---

## Routing & Navigation

[From ia.md — summarized for implementation]

---

## Implementation Notes

- [Key decisions or constraints developers should know]
- [Known tradeoffs made in the design]
- [Anything that deviates from common patterns and why]

---

## Next Step

Run `/create-plan` — this spec file can be passed as context to inform the component breakdown.
```

## Tips
- Specs should be implementation-ready — no ambiguity about what to build
- Token references not raw values — let the token system handle theming
- Edge cases are the most valuable part — developers often skip them
- Keep it concise — long specs don't get read
