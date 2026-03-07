---
name: generate-tests
description: Generate failing tests from a spec before implementation (Tests-as-DoD). Creates test files encoding acceptance criteria as executable tests, plus a traceability manifest.
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: "[--from-spec|spec-path]"
---

# Generate Tests - Tests as Definition of Done

Generate failing tests from a spec for `$ARGUMENTS` BEFORE implementation begins. Encodes acceptance criteria, functional requirements, and edge cases as executable tests.

## When to Use

- After a spec is approved (via `/spec`)
- Before creating an implementation plan (via `/create-plan`)
- When you want tests to define "done" before writing production code

**Skip for:** Bug fixes with obvious test scope, pure refactoring with existing coverage.

---

## Pipeline Position

```
/spec → /generate-tests → /create-plan → /execute-plan → /post-review
         ^^^^^^^^^^^^^^
         YOU ARE HERE
```

---

## Process

```
1. LOCATE SPEC
   └── Find latest in thoughts/specs/ or use provided path

2. PARSE SPEC
   ├── User Stories → Acceptance Criteria (US-N/AC-M)
   ├── Functional Requirements (FR-N)
   └── Edge Cases (EC-N)

3. DETECT TEST SETUP
   ├── Scan existing tests for framework (Vitest, Jest, Mocha, etc.)
   ├── Identify patterns (describe/it nesting, assertion style)
   ├── Detect test file locations and naming conventions
   └── Check for test utilities, factories, fixtures

4. PLAN TESTS
   └── Show mapping: spec items → test cases → architecture layer

5. GENERATE TESTS
   ├── Write test files with traceability headers
   ├── Use it.todo() for tests that can't compile yet
   └── Follow detected project patterns exactly

6. VERIFY COMPILATION
   └── Run typecheck — convert failures to it.todo()

7. WRITE MANIFEST
   └── Save to thoughts/tests/YYYY-MM-DD_[slug].md

8. SUGGEST NEXT
   └── Direct to /create-plan --from-spec
```

---

## Step 1: Locate Spec

If `$ARGUMENTS` is `--from-spec` or empty:
```bash
ls -t thoughts/specs/*.md 2>/dev/null | head -1
```

If `$ARGUMENTS` is a path, use it directly.

Read the spec file and confirm with the user:
```markdown
Found spec: thoughts/specs/YYYY-MM-DD_[feature].md
Title: [spec title]
Status: [draft|reviewed|approved]

Generating tests from this spec. Proceed?
```

---

## Step 2: Parse Spec

Extract testable items from the spec, assigning IDs if not present:

### User Stories & Acceptance Criteria
```
US-1: As a [user], I want to [action]
  AC-1: [criterion 1]
  AC-2: [criterion 2]
US-2: As a [user], I want to [action]
  AC-1: [criterion 1]
```

### Functional Requirements
```
FR-1: [requirement description]
FR-2: [requirement description]
```

### Edge Cases
```
EC-1: [edge case description]
EC-2: [edge case description]
```

If the spec uses different labeling, map to the closest equivalent. The goal is a complete, enumerated list of testable behaviors.

---

## Step 3: Detect Test Setup

Scan the project to understand existing test conventions:

### Framework Detection
```bash
# Check package.json for test dependencies
grep -E "vitest|jest|mocha|ava|tap" package.json

# Find existing test files
find . -name "*.test.*" -o -name "*.spec.*" | head -20
```

### Pattern Detection
Read 2-3 existing test files and extract:
- **Framework**: Vitest / Jest / Mocha / etc.
- **Style**: `describe`/`it` nesting depth, `test()` vs `it()`
- **Assertions**: `expect().toBe()`, `assert.*`, `chai`
- **Mocking**: `vi.mock`, `jest.mock`, manual mocks
- **File naming**: `*.test.ts`, `*.spec.ts`, `__tests__/*.ts`
- **File location**: co-located, `__tests__/`, top-level `tests/`
- **Test utilities**: factories, fixtures, helpers, custom matchers
- **Architecture layers**: separate tests per layer (domain, API, etc.)

### If No Tests Exist
Use sensible defaults:
- Vitest with `describe`/`it`
- `expect()` assertions
- Co-located `*.test.ts` files
- Ask user to confirm

---

## Step 4: Plan Tests

Show the mapping before generating:

```markdown
## Test Plan

**Spec**: thoughts/specs/YYYY-MM-DD_[feature].md
**Framework**: [detected]
**Total test cases**: N

### Domain Layer Tests
| Spec Item | Test Case | File |
|-----------|-----------|------|
| US-1/AC-1 | should create X with valid input | src/domain/__tests__/X.test.ts |
| US-1/AC-2 | should reject X without required field | src/domain/__tests__/X.test.ts |
| FR-1 | should calculate Y correctly | src/domain/__tests__/Y.test.ts |

### API Layer Tests
| Spec Item | Test Case | File |
|-----------|-----------|------|
| US-2/AC-1 | POST /api/x returns 201 | src/api/__tests__/x.test.ts |
| EC-1 | POST /api/x returns 400 for invalid | src/api/__tests__/x.test.ts |

### [Other Layers as needed]

Proceed with test generation?
```

---

## Step 5: Generate Tests

### File Header

Every generated test file MUST include:

```typescript
/**
 * @generated-from thoughts/specs/YYYY-MM-DD_[feature].md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 * If a test seems wrong, update the spec and regenerate — don't edit tests directly.
 */
```

### Test Structure

```typescript
describe('[Feature Name]', () => {
  describe('US-1: [user story summary]', () => {
    it('AC-1: should [acceptance criterion]', () => {
      // Spec: US-1/AC-1
      // Arrange
      const input = { /* realistic test data */ };

      // Act
      const result = someFunction(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.field).toBe(expected);
    });

    it('AC-2: should [acceptance criterion]', () => {
      // Spec: US-1/AC-2
      // ... test body
    });
  });

  describe('Edge Cases', () => {
    it('EC-1: should handle [edge case]', () => {
      // Spec: EC-1
      // ... test body
    });
  });
});
```

### Rules

1. **Every test gets a `// Spec: XX-N/AC-M` comment** for traceability
2. **Tests MUST fail** — they test behavior that doesn't exist yet
3. **Use realistic test data** — not placeholder `"test"` strings
4. **Follow detected patterns exactly** — match the project's style
5. **Mock at boundaries** — mock repos/APIs, not internal logic
6. **One assertion concept per test** — keep tests focused
7. **Group by spec structure** — mirror User Stories / FRs / ECs

### Handling Missing Types

If a test references types/functions that don't exist yet:

```typescript
// Type doesn't exist yet — will be created during implementation
it.todo('AC-3: should validate athlete username format');
// Spec: US-2/AC-3
// When AthleteUsername VO exists:
// expect(AthleteUsername.create('')).toEqual(err('Username cannot be empty'))
```

Use `it.todo()` with a comment showing the intended test body. This ensures:
- Tests compile (no import errors)
- Intent is documented
- Implementation knows exactly what to build

---

## Step 6: Verify Compilation

```bash
# Run typecheck to verify tests compile
<pm> run typecheck
```

If any test file fails to compile:
1. Identify the failing imports/references
2. Convert those specific tests to `it.todo()` with the intended body in comments
3. Re-run typecheck until clean

**Goal**: All test files compile, failing tests are real assertion failures (not compile errors).

---

## Step 7: Write Manifest

Save to: `thoughts/tests/YYYY-MM-DD_[feature-slug].md`

```markdown
# Test Manifest: [Feature Name]

**Date**: YYYY-MM-DD
**Spec**: thoughts/specs/YYYY-MM-DD_[feature].md
**Status**: generated | partially-passing | all-passing

---

## Traceability Matrix

| Spec Item | Description | Test File | Test Name | Status |
|-----------|-------------|-----------|-----------|--------|
| US-1/AC-1 | [description] | path/to/test.ts | should X | failing |
| US-1/AC-2 | [description] | path/to/test.ts | should Y | todo |
| FR-1 | [description] | path/to/test.ts | should Z | failing |
| EC-1 | [description] | path/to/test.ts | should W | failing |

---

## Test Files

| File | Tests | Todos | Layer |
|------|-------|-------|-------|
| path/to/domain.test.ts | N | M | Domain |
| path/to/api.test.ts | N | M | API |

---

## Coverage Summary

- **Total spec items**: N
- **Tests generated**: M (failing)
- **Tests as todo**: K (missing types)
- **Spec coverage**: X% of acceptance criteria have tests

---

## Next Steps

Run `/create-plan --from-spec` to create the implementation plan.
The plan will automatically detect this manifest and include "make tests pass" in its done criteria.
```

---

## Step 8: Suggest Next

```markdown
## Tests Generated

**Manifest**: thoughts/tests/YYYY-MM-DD_[feature].md
**Test files**: [list]
**Total tests**: N failing, M todo

All tests are currently FAILING — this is expected.
Implementation should make them pass without modifying the test files.

### Next Steps
1. `/create-plan --from-spec` — The plan will detect these tests and include them in done criteria
2. `/execute-plan` — Implementation tasks will target making tests green

### Immutability Rule
These test files are marked `@immutable`. If a test seems wrong:
1. Update the spec first
2. Re-run `/generate-tests` to regenerate
3. Never edit generated test files directly
```

---

## Tips

1. **Parse thoroughly** — Every AC, FR, and EC should map to at least one test
2. **Match project style** — Generated tests should be indistinguishable from hand-written ones
3. **Prefer `it.todo()` over compile errors** — A todo test is better than a broken test file
4. **Use realistic data** — Tests serve as documentation; realistic data makes intent clear
5. **Don't over-mock** — Mock at architecture boundaries, not internal implementation
6. **One spec item can have multiple tests** — An AC might need happy path + error path tests
