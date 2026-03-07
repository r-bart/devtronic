---
name: design-review
description: QA visual review — compares implementation against wireframe specs and design system. Surfaces deviations with severity.
allowed-tools: Task, Read, Glob, Bash, Write
argument-hint: "[component-name|--all]"
---

# Design:Review - Implementation vs Design QA

Compares what was built against what was designed. Uses `thoughts/design/wireframes.md` and `thoughts/design/design-system.md` as ground truth.

## When to Use
- After `/execute-plan` completes UI implementation
- Before PR — catch design deviations before code review
- In the post-review step of the workflow

**This is NOT a code quality review** — use `/post-review` for that. This reviews visual/UX fidelity.

---

## Process

```
1. LOAD GROUND TRUTH
   ├── Read thoughts/design/wireframes.md (layout, components, states)
   └── Read thoughts/design/design-system.md (tokens, components)

2. DETERMINE SCOPE
   └── $ARGUMENTS: specific component name or --all
   └── If --all: review all screens from wireframes

3. PER COMPONENT/SCREEN:
   ├── Read implementation file(s)
   ├── Compare: components present? layout correct? tokens used?
   ├── Check: all states implemented? (empty/loading/error/success)
   └── Invoke visual-qa if screenshots are available

4. CONSOLIDATE FINDINGS
   └── Severity: blocker / warning / suggestion

5. OUTPUT
   └── Print findings per component
   └── Overall compliance summary
```

## Step 3: What Gets Compared

For each screen/component from wireframes.md:

| Aspect | Check |
|--------|-------|
| **Components present** | All listed components exist in implementation |
| **Content hierarchy** | Order of elements matches spec priority |
| **Interactive elements** | All buttons/inputs present with correct labels |
| **States** | Empty, loading, error, success all handled |
| **Token usage** | No hardcoded values that should be tokens |
| **Responsive** | Does it break at mobile widths? |
| **Copy** | Placeholder copy replaced with real or meaningful copy |

## Step 3b: visual-qa (when screenshots available)

If the user provides screenshot paths or URLs:
- Pass design screenshot vs implementation screenshot to visual-qa
- visual-qa returns a diff table: element | expected | found | severity

## Severity

- **Blocker**: Missing component, broken state, wrong primary action
- **Warning**: Minor layout deviation, token not used, missing state
- **Suggestion**: Copy tweak, spacing polish, animation missing

## Output Format

```
## Design Review: [Component/Screen]

**Spec**: thoughts/design/wireframes.md#[screen]
**File**: src/components/[File]
**Status**: N blockers, M warnings

### Blockers
- [ ] Error state not implemented (spec requires: "Show inline error below field")

### Warnings
- [ ] Button uses `#3B82F6` instead of `var(--color-primary)`
- [ ] Card padding is 12px, spec says 16px (space.4)

### Passing
- ✓ All form fields present
- ✓ Loading skeleton implemented
- ✓ Empty state with CTA present

---
```

## Tips
- Run immediately after `/execute-plan` — easier to fix before PR
- Blockers from design review → add to current PR
- Warnings → file as follow-up issues, don't block the PR
