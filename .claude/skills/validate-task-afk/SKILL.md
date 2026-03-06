---
name: validate-task-afk
description: Validates GitHub issues and task descriptions for AFK-readiness. Calculates viability score and guides refinement before autonomous execution.
allowed-tools: Agent, Bash, Read, Grep, Glob
argument-hint: "<github-issue-url or task-description>"
---

# Validate Task for AFK Mode

Pre-flight validation for autonomous (`--afk`) task execution. Analyzes task quality, calculates viability score (0-100), detects gaps, and guides refinement.

## When to Use

- Before invoking `/auto-devtronic <issue> --afk`
- Uncertain if a task is suitable for autonomous execution
- Want to improve a task description before attempting `--afk`
- Need guidance on making a task more AFK-ready

**Skip for:** Tasks already running via `/auto-devtronic` (use `--validate` flag instead).

---

## Quick Start

```bash
/validate-task-afk https://github.com/user/repo/issues/42
/validate-task-afk "Add email validation to User entity"
/validate-task-afk --refine   # Interactive refinement mode
```

---

## What It Analyzes

The validator scores your task across **5 dimensions**:

1. **Clarity (25%)** — Are acceptance criteria measurable?
   - ✅ "Returns user object with id=42"
   - ❌ "Make it work"

2. **Scope (25%)** — Is the task limited to 1-4 files?
   - ✅ "Modify domain/value-objects/Email.ts"
   - ❌ "Refactor entire architecture"

3. **Precedent (20%)** — Does a similar pattern exist in codebase?
   - ✅ "Email validation" (Phone pattern exists)
   - ❌ "Completely new pattern"

4. **Coverage (20%)** — Is test coverage sufficient (>70%)?
   - ✅ "87% coverage in domain/value-objects/"
   - ❌ "42% coverage, tests missing"

5. **Dependencies (10%)** — Is the task self-contained?
   - ✅ "No external dependencies"
   - ❌ "Blocked by PR #42"

---

## How to Use

### Option 1: Standalone Validation (Recommended)

```bash
/validate-task-afk https://github.com/user/repo/issues/123
```

**Output**:
```
# AFK Viability Analysis

Score: 87/100 ✅ AFK Viable

## Dimensions
✅ Clarity: 90/100
✅ Scope: 85/100
⚠️  Coverage: 72/100
✅ Precedent: 80/100
✅ Dependencies: 100/100

## Recommendation
Mode: AFK Viable
→ Run: /auto-devtronic https://github.com/user/repo/issues/123 --afk --max-retries 5

## Gaps Found
None — ready to proceed!
```

### Option 2: Interactive Refinement

```bash
/validate-task-afk "Add feature X" --refine
```

**Flow**:
1. Validator analyzes task
2. Detects gaps (if any)
3. Asks clarifying questions
4. You provide answers
5. Re-scores and confirms readiness

**Example**:
```
Initial Score: 35/100 ❌ Needs Refinement

Gap 1: Missing Acceptance Criteria
  "Add feature X" — what's the expected behavior?

  Examples:
  - "Returns user object when given email"
  - "Validates email format"
  - "Throws error if invalid"

Your answer: Returns paginated results with { data, total, page, limit }

Re-scoring...
Updated Score: 78/100 ✅ AFK Viable — Ready to go!
```

---

## Interpretation Guide

### Score Ranges

| Score | Status | Recommendation |
|-------|--------|-----------------|
| **70-100** | ✅ AFK Viable | Run with `/auto-devtronic --afk` |
| **40-70** | ⚠️ Medium Risk | Use `/auto-devtronic --hitl` (human gates) |
| **0-40** | ❌ Needs Work | Refine and re-validate |

### Gaps & Fixes

| Gap Type | What It Means | How to Fix |
|----------|--------------|-----------|
| **Missing Criteria** | No measurable outcomes | Add "Returns X", "Validates Y", "Throws error Z" |
| **Low Coverage** | Tests <70% in affected files | Write tests first, or use HITL mode |
| **Scope Creep** | Affects 5+ files or multiple features | Split into separate tasks |
| **Architectural Risk** | Includes keywords like "refactor", "migrate" | Break into smaller, scoped tasks |
| **External Dependency** | Blocked by PRs, other issues | Wait for dependency, or split independent part |

---

## Examples

### ✅ Good Task (AFK-Ready)

```
Add pagination to users list endpoint

Acceptance Criteria:
- GET /users?page=1&limit=20 returns { data: [...], total: number, page: number }
- Default limit=20 if not provided
- Returns 400 Bad Request if page < 1
- Maintains backward compatibility (existing /users still works)

Affected files:
- application/use-cases/ListUsersUseCase.ts
- infrastructure/repositories/UserRepository.ts

Precedent: Similar pagination exists in Orders feature
Coverage: 88% in ListUsersUseCase
No external dependencies
```

**Expected Score**: 85-90/100 ✅ AFK Viable

---

### ⚠️ Medium-Risk Task (HITL Recommended)

```
Improve user authentication

Current coverage: 62% in auth module
Missing some edge cases in error handling
Depends on initial setup but fairly scoped
```

**Expected Score**: 55-65/100 ⚠️ Use HITL mode

---

### ❌ Poor Task (Needs Refinement)

```
Make the system better
```

**Issues**:
- No acceptance criteria (what does "better" mean?)
- Undefined scope (which system?)
- No measurable outcomes

**Expected Score**: 10-20/100 ❌ Needs refinement

**To improve**:
- "Add what specific feature?"
- "How will you measure success?"
- "Which files will it affect?"

---

## Tips for AFK Success

1. **Be Specific**
   - ✅ "Add email validation with RFC 5322 format"
   - ❌ "Add validation"

2. **List Acceptance Criteria**
   - ✅ Write as: "Returns X when Y", "Validates Z", "Throws error if..."
   - ❌ Vague descriptions like "Handle all cases"

3. **Keep Scope Tight**
   - ✅ "Modify 2-3 related files"
   - ❌ "Refactor entire codebase"

4. **Mention Files Affected**
   - Helps validator assess scope
   - Shows you've thought through the change

5. **High Test Coverage Wins**
   - AFK mode relies on tests to catch failures
   - Low coverage = higher risk = recommend HITL

---

## Comparison with `/auto-devtronic --validate`

| Aspect | `/validate-task-afk` | `/auto-devtronic --validate` |
|--------|-------|-------|
| **When** | Before starting work | Integrated in pipeline (step 0) |
| **Input** | Issue URL or description | Same |
| **Output** | Score + report | Score + pause if low |
| **Interaction** | Optional refinement loop | Pauses, asks HITL confirmation if score <70 |
| **Use Case** | Pre-flight check before committing to AFK | Integrated quality gate in autonomous execution |

**Recommendation**: Use `/validate-task-afk` first, then run with `/auto-devtronic --afk` once validated.

---

## If Score Is Low

Don't give up! Here's how to improve:

1. **Add Acceptance Criteria**
   - Current: "Add email field"
   - Better: "Add email field with validation: returns true for valid RFC 5322, false otherwise"

2. **Limit Scope**
   - Current: "Update authentication system"
   - Better: "Add email field to User entity in domain/entities/User.ts and update CreateUser use case"

3. **Write Tests First**
   - If coverage is low, write tests BEFORE running AFK
   - AFK mode needs tests to catch failures

4. **Use HITL Mode**
   - `/auto-devtronic <issue> --hitl`
   - Human gates at: brief, tests, retries, PR review
   - Better for risky or complex tasks

---

## Integration with `/auto-devtronic`

You can also validate inline during autonomous execution:

```bash
/auto-devtronic https://github.com/user/repo/issues/42 --afk --validate
```

**Flow**:
1. Validator runs as step 0
2. If score >= 70: proceeds silently
3. If score < 70: pauses and asks "Use HITL mode instead? [y/n]"
4. You confirm or adjust mode

---

## Next Steps

### If Score >= 70 (AFK Viable)
```bash
/auto-devtronic <issue> --afk --max-retries 5
```

### If Score 40-70 (Medium Risk)
```bash
/auto-devtronic <issue> --hitl
# Human gates at: brief, tests, retries, PR
```

### If Score < 40 (Needs Work)
1. Use `--refine` flag to get interactive guidance
2. Improve task description based on suggestions
3. Re-validate with `/validate-task-afk`
4. Once score >= 40, proceed with HITL

