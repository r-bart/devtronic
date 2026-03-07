---
name: design-system-define
description: Creates or extracts a design system — tokens, components, and style guide — persisted to thoughts/design/design-system.md.
allowed-tools: Task, Read, Write, Edit, AskUserQuestion, Bash, Glob
argument-hint: "[--extract]"
---

# Design:System-Define - Create or Extract Design System

Two modes:
- **Interactive** (default): define a design system from scratch through guided questions
- **Extract** (`--extract`): read existing CSS, Tailwind config, or component files and normalize into tokens

## When to Use
- Starting a new project with no design system
- Inheriting a codebase with implicit styles that need to be made explicit
- After `/design:wireframe` — wireframes reveal what tokens are needed

---

## Process

### Mode: Interactive (default)

```
1. ASK about existing constraints
   └── Does a brand guide exist? Any existing color palette or typography?

2. GUIDED TOKEN DEFINITION
   ├── Colors: primary, secondary, neutral scale, semantic (success/error/warning/info)
   ├── Typography: font families, size scale, weight, line-height
   ├── Spacing: base unit and scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
   ├── Borders: radius scale, border widths
   ├── Shadows: elevation levels (0-5)
   └── Motion: duration scale, easing functions

3. COMPONENT INVENTORY
   └── From wireframes (thoughts/design/wireframes.md), list components needed
   └── For each: variants, states (default/hover/active/disabled/focus)

4. INVOKE design-token-extractor
   └── Normalize tokens to agnostic format

5. PERSIST → thoughts/design/design-system.md
```

### Mode: Extract (`--extract`)

```
1. DISCOVER project config
   ├── Glob for: tailwind.config.*, tokens.json, *.css with :root { }
   └── Read relevant files

2. INVOKE design-token-extractor
   └── Extract and normalize all tokens found

3. IDENTIFY GAPS
   └── What's missing vs. what wireframes need?

4. PERSIST → thoughts/design/design-system.md
```

## Output: `thoughts/design/design-system.md`

```markdown
# Design System: [Project]

**Date**: YYYY-MM-DD
**Source**: defined | extracted from [files]

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| color.primary | #... | Primary actions, links |
| color.primary.hover | #... | Hover state |
| color.neutral.100 | #... | Lightest background |
| color.neutral.900 | #... | Body text |
| color.success | #... | Success states |
| color.error | #... | Error states |
| color.warning | #... | Warning states |

## Typography

| Token | Value |
|-------|-------|
| font.family.base | Inter, system-ui, sans-serif |
| font.size.sm | 14px |
| font.size.md | 16px |
| font.size.lg | 18px |
| font.weight.normal | 400 |
| font.weight.semibold | 600 |
| font.weight.bold | 700 |

## Spacing

Base unit: 4px

| Token | Value |
|-------|-------|
| space.1 | 4px |
| space.2 | 8px |
| space.4 | 16px |
| space.6 | 24px |
| space.8 | 32px |
| space.12 | 48px |

## Borders

| Token | Value |
|-------|-------|
| radius.sm | 4px |
| radius.md | 8px |
| radius.lg | 16px |
| radius.full | 9999px |

## Shadows

| Token | Value |
|-------|-------|
| shadow.sm | 0 1px 2px rgba(0,0,0,0.05) |
| shadow.md | 0 4px 6px rgba(0,0,0,0.07) |

## Components

### [ComponentName]

**Variants**: [default, primary, secondary, ghost]
**States**: [default, hover, active, disabled, focus]
**Props**: [key configurable aspects]

## Next Steps

- Run `/design:system --sync` to apply tokens to project config files
- Run `/design:system --audit` to check existing code against this system
```

## Tips
- Start with a minimal token set — add tokens when you need them, not in advance
- Use semantic token names (color.error) not literal ones (color.red)
- Every component needs its disabled and focus states defined
