---
name: design
description: Orchestrates the design phase. Detects context and delegates to the right sub-skill.
allowed-tools: Task, Read, Glob, AskUserQuestion, Write
argument-hint: "[--research|--define|--ia|--wireframe|--system|--audit|--review|--spec]"
---

# Design - Design Phase Orchestrator

Entry point for the full UX/UI design phase. Detects current state and routes to the right sub-skill.

## When to Use

- Starting or continuing the design phase of a feature
- After `/spec` is done and before `/create-plan`
- Resuming mid-phase after previous design work

**Skip for:** Quick bug fixes or tasks with no UI component.

---

## Routing

| Flag | Delegates to | When |
|------|-------------|------|
| `--research` | `/design:research` | Discovery, competitive analysis |
| `--define` | `/design:define` | Personas, journeys, HMW |
| `--ia` | `/design:ia` | Information architecture, flows |
| `--wireframe` | `/design:wireframe` | Screen wireframe specs |
| `--system` | `/design:system` | Design system (add --define/--audit/--sync) |
| `--audit` | `/design:audit` | UX heuristics + accessibility |
| `--review` | `/design:review` | QA implementation vs design |
| `--spec` | `/design:spec` | Dev handoff spec |

## Context Detection (no flag)

1. Read `thoughts/design/design.md` — what phase are we in?
2. Check which `thoughts/design/*.md` files exist
3. Propose the logical next step:
   - No files → suggest `--research` or `--define`
   - Has research + define → suggest `--ia`
   - Has ia + wireframes → suggest `--system`
   - Has design system → suggest `/create-plan`
   - Post-implementation → suggest `--review`

## Output

Appends to `thoughts/design/design.md` — log of decisions and phase state.
