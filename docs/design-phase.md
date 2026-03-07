# Design Phase

devtronic includes a structured design phase that bridges product requirements and implementation. It is tool-agnostic — all skills work from plain text specifications in `thoughts/design/`. MCP integrations (Figma, Paper) are optional enhancements.

## When to Use the Design Phase

- Building a feature with significant UI/UX surface
- Greenfield projects that need a design system from scratch
- Auditing existing UIs for UX and accessibility issues
- Maintaining consistency across a growing codebase

## Workflow Position

```
/brief → /design --research → /design --define → /design --ia → /design --wireframe
       → /design-system --define → /spec → /create-plan → /generate-tests
       → /execute-plan → /design-review → /post-review
```

## Skills Reference

| Skill | Purpose | Input | Output |
|-------|---------|-------|--------|
| `/design` | Phase orchestrator | flags or auto-detect | routes to sub-skills |
| `/design-research` | Discovery & competitive analysis | spec + user input | `thoughts/design/research.md` |
| `/design-define` | Personas, journeys, HMW | research.md | `thoughts/design/define.md` |
| `/design-ia` | Information architecture | define.md | `thoughts/design/ia.md` |
| `/design-wireframe` | Screen specifications | ia.md | `thoughts/design/wireframes.md` |
| `/design-system` | Design system router | flags | routes to sub-skills |
| `/design-system-define` | Create/extract design system | user input or CSS | `thoughts/design/design-system.md` |
| `/design-system-audit` | Detect design system drift | codebase + design-system.md | `thoughts/design/design-system-audit.md` |
| `/design-system-sync` | Sync tokens to project config | design-system.md | tailwind.config / CSS vars |
| `/design-audit` | UX heuristics + accessibility | wireframes or code | `thoughts/design/audit.md` |
| `/design-review` | Implementation vs design QA | code + wireframes.md | findings report |
| `/design-spec` | Developer handoff spec | all design artifacts | `thoughts/design/spec.md` |

## Agents Reference

| Agent | Model | Role | Invoked by |
|-------|-------|------|-----------|
| `ux-researcher` | sonnet | Personas, journeys, competitive analysis | research, define |
| `ia-architect` | sonnet | Navigation structure, user flows | ia |
| `design-critic` | sonnet | Nielsen's 10 heuristics evaluation | audit |
| `a11y-auditor` | haiku | WCAG 2.1 AA compliance | audit |
| `design-token-extractor` | haiku | Extract and normalize design tokens | system-define, sync |
| `design-system-guardian` | haiku | Detect design system drift (read-only) | system-audit, post-review |
| `visual-qa` | sonnet | Implementation vs design screenshot comparison | review |

## Design Artifacts

```
thoughts/design/
├── design.md              ← Session log and phase state
├── research.md            ← Competitive analysis and target audience
├── define.md              ← Personas, journeys, HMW questions
├── ia.md                  ← Sitemap, navigation, user flows
├── wireframes.md          ← Screen specifications
├── design-system.md       ← Design tokens and components (source of truth)
├── design-system-audit.md ← Drift report
├── audit.md               ← UX + accessibility findings
└── spec.md                ← Developer handoff document
```

## Common Workflows

### Greenfield project
```
/design-research → /design-define → /design-ia → /design-wireframe → /design-system --define → /design-spec
```

### Audit existing UI
```
/design-audit --code → /design-system --audit
```

### Maintain design system
```
/design-system --sync   (after token changes)
/design-system --audit  (before releases)
```

### Quick wireframe-to-code
```
/design-wireframe → /design-system --define → /create-plan
```

## Tool Integrations (Optional)

The design phase is tool-agnostic. If you have MCP servers configured:

- **Paper Design MCP**: Use `write_html` to materialize wireframes in Paper, `get_jsx` to extract components.
- **Figma MCP**: Use `get_design_context` to extract tokens and component specs, then run `/design-system --extract`.

Without any MCP, all skills work purely from text specifications in `thoughts/design/`.

## Tips

- Start with `/design` (no flags) — it detects your current state and proposes the next step.
- You don't need to complete every phase — enter at the right level for your task.
- Design artifacts accumulate — each skill reads previous artifacts, so running them in order builds context.
- `design-system-guardian` runs automatically from `/post-review` — keeps drift in check without manual audits.
