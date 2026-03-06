# Tutorial 07: Design-First Workflow

How to use the design phase to define UX and visual direction before writing code.

---

## Objective

By the end of this tutorial:
- You'll understand when the design phase adds value
- You'll have walked through the full design workflow
- You'll know how design artifacts connect to implementation

---

## Prerequisites

- devtronic installed (Tutorial 01 or 02)
- A feature or product to design

---

## When to Use the Design Phase

Use it when **what** to build and **how it should feel** are still open questions:

| Situation | Recommendation |
|-----------|---------------|
| New product / major feature | Full design phase (`research → spec → wireframes`) |
| UI-heavy feature | At least `--wireframe` and `--system` |
| Backend-only feature | Skip — design phase is for UI/UX |
| Quick fix or small change | Skip — use Tutorial 03 standard workflow |

The design phase adds leverage before implementation. A design error (wrong UX) is cheaper to fix than a coding error (wrong implementation).

---

## The Design-First Workflow

```
/devtronic:design --research      →  Understand users and competitive landscape
/devtronic:design --define        →  Personas, journeys, HMW questions
/devtronic:design --ia            →  Sitemap, navigation, user flows
/devtronic:design --wireframe     →  Screen specs (text-based, tool-agnostic)
/devtronic:design-system --define →  Extract or create design tokens + style guide
        │
/devtronic:spec [feature]         →  Define requirements (informed by design)
/devtronic:create-plan [feature]  →  Implementation phases
/devtronic:generate-tests         →  Encode acceptance criteria as tests
/devtronic:execute-plan           →  Implement in parallel phases
        │
/devtronic:design-review          →  QA implementation vs wireframes + design system
/devtronic:design-system --audit  →  Check for design drift
/devtronic:summary [feature]      →  Document what changed
/devtronic:post-review            →  Final quality verification
```

---

## Phase 0: Orientation

```
/devtronic:brief [product or feature name]
```

Claude will scan `thoughts/design/`, `thoughts/specs/`, and git for existing design work.

---

## Phase 1: Research

```
/devtronic:design --research
```

Claude will invoke the `ux-researcher` agent to analyze:
- Target audience and user segments
- Competitive landscape (3-5 competitors)
- Current pain points and opportunities
- Business context and constraints

**Output**: `thoughts/design/research.md`

**Review before continuing** — research defines the foundation for everything else.

---

## Phase 2: Define

```
/devtronic:design --define
```

From research, Claude synthesizes:
- **Personas** (2-3 primary user types, realistic)
- **User journey maps** (current state, ideal state)
- **HMW questions** ("How might we...") — reframe problems as opportunities

**Output**: `thoughts/design/define.md`

---

## Phase 3: Information Architecture

```
/devtronic:design --ia
```

The `ia-architect` agent builds:
- **Sitemap** — full navigation structure
- **Navigation model** — primary, secondary, utility
- **User flows** — key task sequences with decision points
- **Dead-end detection** — flags screens with no logical exit

**Output**: `thoughts/design/ia.md`

**Review**: Is the navigation intuitive? Are flows complete?

---

## Phase 4: Wireframes

```
/devtronic:design --wireframe
```

Screen-by-screen wireframe specs (text-based, tool-agnostic):

```
## Screen: Dashboard

Layout: sidebar (240px) + main content area
Header: logo, nav, user avatar + dropdown

### Sidebar
- Navigation items (from IA)
- Active state: highlighted background + left border

### Main Content
- Page title (H1)
- Action bar: primary CTA (right-aligned)
- Content area: [feature-specific]
```

**Output**: `thoughts/design/wireframes.md`

These specs drive `/devtronic:design-review` after implementation.

---

## Phase 5: Design System

```
/devtronic:design-system --define
```

The `design-token-extractor` agent either:
- **Creates** a new design system from scratch (color palettes, typography, spacing, radii, shadows)
- **Extracts** existing tokens from Tailwind/CSS config

**Output**: `thoughts/design/design-system.md` — the single source of truth.

```markdown
## Colors

primary.500: #3B82F6
primary.600: #2563EB
neutral.900: #111827

## Typography

font.sans: Inter, system-ui, sans-serif
text.base: 16px / 1.5
text.sm: 14px / 1.4

## Spacing

space.4: 16px
space.8: 32px

## Radii

radius.md: 6px
radius.lg: 12px
```

### Sync to Config

```
/devtronic:design-system --sync
```

Propagates tokens to `tailwind.config.ts`, CSS custom properties, or `tokens.json` (auto-detected).

---

## Phase 6: Specification

Now that UX is defined, write a technical spec:

```
/devtronic:spec [feature]
```

The spec will reference design artifacts automatically:
- Personas and journeys from `define.md`
- IA flows as user stories
- Screen behavior from wireframes

---

## Phase 7: Implementation

Standard implementation workflow:

```
/devtronic:create-plan [feature]
/devtronic:generate-tests
/devtronic:execute-plan
```

During implementation, `design-system-guardian` monitors for drift (invoked automatically by `/devtronic:post-review`).

---

## Phase 8: Design Review

After implementation:

```
/devtronic:design-review
```

The `visual-qa` agent compares:
- Implementation vs wireframe specs (text-based comparison)
- Color and spacing usage vs design system tokens
- Component behavior vs spec

**Output**: Severity-ranked deviations (blocker / warning / suggestion).

### Audit for Drift

```
/devtronic:design-system --audit
```

The `design-system-guardian` finds hardcoded values, unused tokens, and components bypassing the system.

---

## Design Artifacts in thoughts/

After a complete design phase:

```
thoughts/design/
├── research.md          ← competitive analysis, user segments
├── define.md            ← personas, journeys, HMW
├── ia.md                ← sitemap, flows
├── wireframes.md        ← screen specs
├── design-system.md     ← tokens (source of truth)
├── design-system-audit.md  ← drift report (from /devtronic:design-system --audit)
├── audit.md             ← UX heuristics + a11y findings
└── spec.md              ← developer handoff (from /devtronic:design-spec)
```

---

## Shortcuts: Partial Design Phase

You don't have to run everything. Common partial workflows:

### Just Wireframes

```
/devtronic:design --wireframe
/devtronic:design-review        (after implementation)
```

### Just Design System

```
/devtronic:design-system --define
/devtronic:design-system --sync
/devtronic:design-system --audit  (after implementation)
```

### UX Audit on Existing UI

```
/devtronic:design --audit
```

---

## Tips

1. **Start early** — design artifacts are most valuable before implementation begins
2. **Tool-agnostic** — skills work without Figma, Paper.design, or any external tool
3. **Artifacts persist** — `thoughts/design/` survives context clears; reference them in new sessions
4. **Guardian is always watching** — `/devtronic:post-review` invokes `design-system-guardian` automatically
5. **Iterate** — re-run any phase when requirements evolve; artifacts update in place

---

## Next Step

→ [Tutorial 08: Parallel Sessions with Worktrees](./08-worktrees.md) *(coming soon)*

Or go deeper into the design workflow:
- [Design Phase Reference](../design-phase.md) — full skill and agent reference
- [Agents Reference](../agents.md#design-agents) — design agent details
