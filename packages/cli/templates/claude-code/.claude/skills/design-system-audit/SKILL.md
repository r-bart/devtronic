---
name: design-system-audit
description: Audits the codebase for design system drift — finds hardcoded values, unused tokens, and components that bypass the system.
allowed-tools: Task, Read, Glob, Grep, Write, Bash
argument-hint: "[--files path/to/dir]"
---

# Design:System-Audit - Design System Drift Detection

Scans the codebase against `thoughts/design/design-system.md` to detect drift: hardcoded values, unused tokens, and components that bypass the design system.

## When to Use
- Before a PR or release — catch drift before it merges
- After onboarding new developers — check for style habits that bypass the system
- Periodically on growing codebases
- When run from `/post-review` automatically

---

## Process

```
1. LOAD DESIGN SYSTEM
   └── Read thoughts/design/design-system.md (required — abort if missing, suggest --define)

2. DISCOVER SCOPE
   └── $ARGUMENTS --files → specific directory
   └── No args → scan src/ or app/ or equivalent

3. INVOKE design-system-guardian
   └── Finds violations across all files in scope

4. GENERATE REPORT
   └── Write thoughts/design/design-system-audit.md
   └── Print summary to console
```

## What Gets Checked

### 1. Hardcoded Color Values
Grep for hex colors, rgb(), rgba(), hsl() that should be CSS variables or tokens.

**Violation**: `color: #3B82F6` when `--color-primary: #3B82F6` exists in design system.
**Fix**: Replace with `color: var(--color-primary)` or the framework equivalent.

### 2. Hardcoded Spacing
Grep for arbitrary px/rem values where a spacing token exists.

**Violation**: `padding: 16px` when `space.4` = 16px exists.
**Fix**: Replace with `p-4` (Tailwind) or `var(--space-4)` (CSS vars).

### 3. Unused Tokens
Tokens defined in design-system.md but never referenced in source files.

**Output**: List of unused tokens to consider removing from the design system.

### 4. Rogue Styles
Components with inline styles or non-token CSS for properties covered by the design system.

### 5. Component Inventory
For each component in design-system.md: is it actually implemented? Does it expose the correct variants/states?

## Output: `thoughts/design/design-system-audit.md`

```markdown
# Design System Audit: [Date]

**Design system**: thoughts/design/design-system.md
**Scope**: [files scanned]
**Status**: N violations found

## Violations

### Hardcoded Colors (N)

| File | Line | Found | Should be |
|------|------|-------|-----------|
| src/Button.tsx | 12 | #3B82F6 | var(--color-primary) |

### Hardcoded Spacing (N)

| File | Line | Found | Should be |
|------|------|-------|-----------|
| src/Card.tsx | 8 | padding: 16px | space.4 |

### Unused Tokens (N)
- color.secondary.light — defined but never used
- shadow.xl — defined but never used

### Components Missing Implementation (N)
- Badge — in design system but no component file found

## Coverage
- Files scanned: N
- Files with violations: M
- Design system compliance: X%

## Recommended Actions
1. [Highest priority fix]
2. [Second priority]
```

## Tips
- Run `--files src/components` to audit just the component library
- Compliance % is a lagging indicator — track it over time
- Unused tokens accumulate — prune them in design:system-sync
