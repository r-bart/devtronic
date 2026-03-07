---
name: design-audit
description: UX audit — evaluates designs against Nielsen's 10 heuristics and WCAG 2.1 AA accessibility. Consolidates findings with severity.
allowed-tools: Task, Read, Glob, Write, Bash
argument-hint: "[--wireframes|--code|--both]"
---

# Design:Audit - UX Heuristics & Accessibility

Evaluates design artifacts or implementation against UX heuristics and accessibility standards.

## When to Use
- After wireframing — audit the spec before building
- Before a release — audit the implementation
- When onboarding to a codebase with unknown UX quality
- Proactively during design review cycles

## Modes

| Flag | Input | What runs |
|------|-------|----------|
| `--wireframes` | `thoughts/design/wireframes.md` | Heuristics only (no code) |
| `--code` | Source files (src/, app/) | Heuristics + accessibility on code |
| `--both` | Wireframes + code | Full audit |
| no flag | auto-detect | Checks what exists |

---

## Process

```
1. LOAD CONTEXT
   ├── Detect mode from $ARGUMENTS or auto-detect
   └── Load thoughts/design/wireframes.md and/or source files

2. PARALLEL AUDIT
   ├── Invoke design-critic (heuristic evaluation)
   └── Invoke a11y-auditor (accessibility checks)

3. CONSOLIDATE
   └── Merge findings, deduplicate, sort by severity

4. GENERATE REPORT
   └── Write thoughts/design/audit.md
   └── Print summary
```

## Step 2: What each agent checks

**design-critic** evaluates:
- Nielsen's 10 heuristics applied to screen flows and interactions
- Works on text wireframe specs or UI code descriptions
- Returns severity: blocker / warning / suggestion per heuristic

**a11y-auditor** checks (WCAG 2.1 AA):
- Color contrast (4.5:1 text, 3:1 large text, 3:1 UI components)
- Touch targets minimum 44x44px
- Alt text on images
- Form labels and associations
- Keyboard navigation and focus order
- ARIA roles and landmark regions
- Reduced motion support

## Output: `thoughts/design/audit.md`

```markdown
# UX Audit: [Feature/Product]

**Date**: YYYY-MM-DD
**Mode**: wireframes | code | both
**Status**: N blockers, M warnings, K suggestions

---

## Heuristic Evaluation

| # | Heuristic | Status | Finding | Recommendation |
|---|-----------|--------|---------|----------------|
| 1 | Visibility of system status | pass | - | - |
| 4 | Consistency and standards | warn | Navigation labels differ between mobile and desktop | Unify labels |
| 8 | Aesthetic and minimalist design | blocker | Dashboard shows 14 metrics on first load | Prioritize top 5, collapse rest |

## Accessibility

| Check | Status | Finding | Fix |
|-------|--------|---------|-----|
| Color contrast | fail | Button text #999 on #FFF = 2.85:1 (need 4.5:1) | Use #767676 minimum |
| Touch targets | warn | Icon buttons are 32x32px | Increase to 44x44px |
| Form labels | pass | All inputs have associated labels | - |

---

## Consolidated Findings

### Blockers (must fix before launch)
1. [Finding with file:line if from code]

### Warnings (should fix)
1. [Finding]

### Suggestions (nice to have)
1. [Finding]

---

## Next Steps
- Fix blockers before proceeding to implementation
- Warnings can be filed as issues and addressed in parallel
```

## Tips
- Run `--wireframes` early — cheaper to fix in spec than in code
- Run `--code` before PR — catches what code review misses
- Blockers from accessibility are non-negotiable for public-facing products
