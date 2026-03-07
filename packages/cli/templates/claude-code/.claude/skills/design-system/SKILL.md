---
name: design-system
description: Design system router — delegates to define, audit, or sync based on flag. Manages design tokens, components, and style guide lifecycle.
allowed-tools: Task, AskUserQuestion
argument-hint: "[--define|--audit|--sync]"
---

# Design:System - Design System Router

Routes to the right design system sub-skill based on the flag provided.

## When to Use
- `--define`: Creating or extracting a design system for the first time
- `--audit`: Checking if the codebase drifts from the design system
- `--sync`: Updating project config files when tokens change

---

## Routing

| Flag | Delegates to | Purpose |
|------|-------------|---------|
| `--define` | `/design:system-define` | Create or extract design tokens and components |
| `--audit` | `/design:system-audit` | Find drift, unused tokens, hardcoded values |
| `--sync` | `/design:system-sync` | Sync design-system.md → tailwind/CSS vars/tokens.json |
| no flag | ask | Prompt user to choose |

## No Flag Behavior

When invoked without a flag, ask:
- Do you want to define a new design system or extract from existing code? → `--define`
- Do you want to audit for drift or inconsistencies? → `--audit`
- Do you want to sync tokens from the design system to project config? → `--sync`

## Source of Truth

All three sub-skills share `thoughts/design/design-system.md` as the canonical design system document.

The sync direction is always: `thoughts/design/design-system.md` → project config files (never the reverse).
