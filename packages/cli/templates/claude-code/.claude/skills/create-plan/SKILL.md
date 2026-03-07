---
name: create-plan
description: Strategic planning for complex tasks. Default creates phased implementation plan. Use --detailed for task-level pseudocode breakdown.
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion, Write
argument-hint: "[feature] [--detailed|--from-spec]"
---

# Strategic Planning

Create a detailed implementation plan for `$ARGUMENTS` before writing any code.

## Modes

| Mode | Command | Output |
|------|---------|--------|
| **Strategic** | `/create-plan [feature]` | Phased plan with architecture decisions |
| **Detailed** | `/create-plan [task] --detailed` | Pseudocode, file changes, test cases |
| **From Spec** | `/create-plan --from-spec` | Generate plan from existing spec |

---

## When to Use

**Strategic mode (default):**
- Starting a complex feature
- Task involves 3+ files
- Multiple implementation approaches exist
- You want to avoid rework

**Detailed mode (`--detailed`):**
- A task from a plan needs granular breakdown
- You want pseudocode before writing real code
- Task involves multiple files with dependencies
- You're unsure about implementation approach

**Skip for:** Simple single-file changes, obvious bug fixes.

---

## Core Principle

> "Pour your energy into the plan so Claude can 1-shot the implementation."

A good plan means:
- No ambiguity during implementation
- Fewer back-and-forth iterations
- Better architectural decisions
- Easier to verify correctness

---

## Strategic Mode Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRATEGIC PLANNING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. UNDERSTAND REQUIREMENTS                                     │
│     └── What exactly needs to be built?                         │
│                                                                 │
│  2. RESEARCH CODEBASE                                           │
│     └── Existing patterns, related code, constraints            │
│                                                                 │
│  2.5 CHECK FOR SPEC TESTS                                       │
│      └── If thoughts/tests/ manifest exists, integrate          │
│                                                                 │
│  3. DESIGN APPROACH                                             │
│     └── Consider 2+ options, recommend one                      │
│                                                                 │
│  4. IDENTIFY RISKS                                              │
│     └── Edge cases, potential issues, unknowns                  │
│                                                                 │
│  5. CREATE PHASED PLAN                                          │
│     └── Step-by-step with files and changes                     │
│                                                                 │
│  6. GET APPROVAL                                                │
│     └── Confirm plan before implementation                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Check for Pre-existing Spec Tests

Before designing the approach, check if `/generate-tests` has already been run:

1. Look for `thoughts/tests/` manifest matching the spec slug
2. If found:
   - Read the manifest to understand what tests exist and what spec items they cover
   - Add test files to the "Files to Create/Modify" table with action **"Make pass"**
   - Add `All spec tests pass: <pm> test -- [test-files]` to Done Criteria
   - Add `No spec test files were modified (immutability preserved)` to Done Criteria
3. If not found: proceed normally (recommend running `/generate-tests` first)

---

### Strategic Plan Template

Save to: `thoughts/plans/YYYY-MM-DD_[feature-slug].md`

```markdown
# Implementation Plan: [Feature Name]

**Date**: YYYY-MM-DD
**Status**: Draft | Approved | In Progress | Complete

---

## Overview

[1-2 sentence summary]

## Requirements

- [ ] [Requirement 1]
- [ ] [Requirement 2]
- [ ] [Requirement 3]

---

## Approach Analysis

### Option A: [Name]

**Description**: [How it works]

**Pros**: [List]
**Cons**: [List]
**Complexity**: Low/Medium/High

### Option B: [Name]

**Description**: [How it works]

**Pros**: [List]
**Cons**: [List]
**Complexity**: Low/Medium/High

### Recommendation

[Option X] because [reasoning]

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| src/domain/entities/X.ts | Create | Domain entity |
| src/application/usecases/Y.ts | Create | Business logic |
| src/infrastructure/repos/Z.ts | Modify | Add new method |

---

## Implementation Phases

### Phase 1: Domain Layer

#### Task 1.1: Create Entity
**File**: `src/domain/entities/X.ts`
```typescript
// Exact code to write
export interface X {
  id: string;
  name: string;
}
```

#### Task 1.2: Create Repository Interface
**File**: `src/domain/repositories/XRepository.ts`
```typescript
// Exact code to write
```

### Phase 2: Application Layer
[...]

### Phase 3: Infrastructure Layer
[...]

### Phase 4: Presentation Layer
[...]

---

## Task Dependencies

Define the dependency graph for parallel execution with `/execute-plan`.

```yaml
dependencies:
  1.1: []           # No dependencies — Phase 1
  1.2: []           # No dependencies — Phase 1
  2.1: [1.1, 1.2]  # Needs both — Phase 2
  2.2: [1.1]        # Needs entity only — Phase 2
  3.1: [2.1, 2.2]  # Needs app layer — Phase 3
```

Rules:
- Task IDs must match "Task X.Y" headers in Implementation Phases
- Empty array `[]` = no dependencies (first phase)
- Only direct dependencies (not transitive)

---

## Risk Analysis

### Edge Cases
- [ ] What if input is empty/null?
- [ ] What if API fails?

### Technical Risks
- [ ] Performance implications?
- [ ] Breaking changes?

---

## Testing Strategy

- Unit tests for: [list]
- Integration tests for: [list]
- Manual verification: [steps]

---

## Done Criteria

Verifiable checklist — each item must be testable with a command or concrete observation.

### Phase 1: [Phase Name]
- [ ] [Criterion]: [How to verify]
- [ ] [Criterion]: [How to verify]

### Phase 2: [Phase Name]
- [ ] [Criterion]: [How to verify]

### Spec Tests (if generated via /generate-tests)
- [ ] All spec tests pass: `<pm> test -- [test-files]`
- [ ] No spec test files were modified (immutability preserved)

### Overall
- [ ] All phases complete
- [ ] Quality checks pass: `<pm> run typecheck && <pm> run lint && <pm> test`
- [ ] No TODO/FIXME/HACK in new code
- [ ] Architecture compliance (no layer violations)

### Writing Good Done Criteria

Each criterion must be **verifiable** and **specific**:

**Good**: `GET /api/users` returns 200 with JSON array
**Bad**: API works correctly

**Good**: `npm run typecheck` passes with zero errors
**Bad**: Types are fine

---

## Verification

Detect package manager first (check lockfiles: pnpm-lock.yaml → pnpm, yarn.lock → yarn, bun.lockb → bun, else npm).

After implementation:
1. Run `<pm> run typecheck`
2. Run `<pm> test`
3. Manual test: [specific flow]
4. Run `/post-review` (auto-invoked after plan completion)
```

---

## Detailed Mode Workflow (`--detailed`)

Use when a specific task needs granular breakdown with pseudocode.

```
┌─────────────────────────────────────────────────────────────────┐
│                    DETAILED TASK PLANNING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. IDENTIFY TASK                                               │
│     └── Reference from plan (e.g., "Task 2.3")                  │
│                                                                 │
│  2. UNDERSTAND CONTEXT                                          │
│     └── Read plan, related files, dependencies                  │
│                                                                 │
│  3. DESIGN PSEUDOCODE                                           │
│     └── File-by-file changes, function signatures               │
│                                                                 │
│  4. DEFINE TEST CASES                                           │
│     └── Unit, integration, manual tests                         │
│                                                                 │
│  5. SAVE DOCUMENT                                               │
│     └── thoughts/plans/[feature]_[task]_detailed.md             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Plan Template

Save to: `thoughts/plans/[feature]-[task-code]_detailed.md`

```markdown
# Task Plan: [Task Name]

**Date**: YYYY-MM-DD
**Parent Plan**: thoughts/plans/[plan-file].md
**Task**: [Task code, e.g., 2.3]

---

## Goal

[What this task accomplishes]

## Dependencies

- **Requires**: [Previous tasks that must be complete]
- **Enables**: [Tasks that depend on this one]

---

## Files to Modify

### 1. `path/to/file.ts`

**Purpose**: [Why this file changes]

**Current state**:
```typescript
// Relevant existing code
```

**Changes**:
```typescript
// Pseudocode for changes
// Add: [description]
// Modify: [description]
```

---

## New Files

### `path/to/new/file.ts`

**Purpose**: [What this file does]

**Structure**:
```typescript
// Pseudocode outline

// Imports
import { ... } from '...'

// Types
interface ... {
  ...
}

// Main logic
export function ... {
  // Step 1: ...
  // Step 2: ...
}
```

---

## Implementation Steps

1. [ ] [First concrete step]
2. [ ] [Second step]
3. [ ] [Third step]

---

## Test Cases

### Unit Tests

| Test | Input | Expected Output |
|------|-------|-----------------|
| [Test name] | [Input] | [Output] |

### Integration Tests

- [ ] [Scenario 1]
- [ ] [Scenario 2]

---

## Edge Cases

| Case | How to Handle |
|------|---------------|
| [Edge case] | [Handling] |

---

## Done Criteria

- [ ] [Specific criterion for this task]
- [ ] [Verification command]

---

## Verification

Detect package manager (pnpm-lock.yaml → pnpm, yarn.lock → yarn, bun.lockb → bun, else npm):

```bash
<pm> run typecheck && <pm> run lint && <pm> test
```
```

---

## When Things Go Sideways

If implementation hits problems:

1. **Stop immediately** - Don't keep pushing
2. **Re-enter plan mode**: "Enter plan mode and re-plan"
3. **Document what went wrong**
4. **Create new plan** with lessons learned

---

## Tips

1. **Spend 30% planning, 70% implementing** - But don't skimp on planning
2. **Include exact code snippets** - No "implement X here" placeholders
3. **Use `--detailed` for complex tasks** - When a phase task needs breakdown
4. **Save plans to `thoughts/plans/`** - Reference them later
5. **Consider 2+ approaches** - Don't jump to first solution

---

## Examples

```bash
/create-plan user-authentication          # Strategic plan for feature
/create-plan task-2.3 --detailed          # Detailed pseudocode for specific task
/create-plan --from-spec                  # Generate plan from thoughts/specs/
```
