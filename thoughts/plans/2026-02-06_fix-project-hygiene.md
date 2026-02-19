# Implementation Plan: Fix Project Hygiene Issues

**Date**: 2026-02-06
**Status**: Draft

---

## Overview

Fix 3 real issues found during project analysis: broken lint script, deprecated setup.sh, and missing test infrastructure for the CLI package.

## Requirements

- [ ] `npm run lint` works correctly in `packages/cli/`
- [ ] `setup.sh` removed from repository root
- [ ] Basic test infrastructure with vitest for CLI package
- [ ] At least smoke tests for the main CLI commands

---

## Implementation Phases

### Phase 1: Fix ESLint (broken lint script)

**Problem**: `package.json` has `"lint": "eslint src/"` but eslint is not installed and has no config.

**Approach**: Install eslint with TypeScript support using flat config (modern `eslint.config.js`).

#### Task 1.1: Install ESLint dependencies

```bash
cd packages/cli
npm install -D eslint @eslint/js typescript-eslint
```

**Why these packages**:
- `eslint` — the linter itself
- `@eslint/js` — ESLint recommended rules
- `typescript-eslint` — TypeScript parser + rules (replaces deprecated `@typescript-eslint/*` packages)

#### Task 1.2: Create `packages/cli/eslint.config.js`

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/'],
  }
);
```

Minimal config. No Prettier, no extra rules. Just catch real errors.

#### Task 1.3: Run lint and fix any errors

```bash
npm run lint
```

Fix whatever comes up. Likely minimal since typecheck already passes with strict mode.

---

### Phase 2: Remove deprecated setup.sh

**Problem**: `setup.sh` in root is deprecated, replaced by CLI. It references `ide-configs/` directory that doesn't exist anymore and IDEs that are no longer supported (Windsurf, Continue, JetBrains).

#### Task 2.1: Delete `setup.sh`

Just delete it. No migration needed — the CLI (`npx @tutellus/agentic-architecture init`) fully replaces it.

#### Task 2.2: Check for references to setup.sh

Search docs for mentions of `setup.sh` and remove/update any references.

---

### Phase 3: Add test infrastructure with vitest

**Problem**: 3,800+ lines of TypeScript CLI code with zero tests. The CLI does file operations, merging, stack detection, and code generation — all testable logic.

**Approach**: Add vitest (fast, native ESM support, zero-config for TypeScript) with smoke tests for the most critical paths.

#### Task 3.1: Install vitest

```bash
cd packages/cli
npm install -D vitest
```

Add test script to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

#### Task 3.2: Create test for analyzers (highest value)

**File**: `packages/cli/src/analyzers/__tests__/stack.test.ts`

The stack analyzer detects frameworks, state management, ORMs, etc. by checking `package.json` dependencies. This is pure logic, easy to test, and high-value because bugs here affect every user.

Tests:
- Detects Next.js from dependencies
- Detects React without Next.js
- Detects Express/NestJS for backend
- Returns empty for unknown stack
- Handles missing dependencies gracefully

**File**: `packages/cli/src/analyzers/__tests__/project.test.ts`

Tests:
- Detects available scripts (typecheck, lint, test)
- Detects package manager from lockfiles
- Handles missing package.json

**File**: `packages/cli/src/analyzers/__tests__/architecture.test.ts`

Tests:
- Detects clean architecture (domain/application/infrastructure folders)
- Detects MVC pattern
- Detects feature-based structure
- Returns "flat" for unrecognized structures

#### Task 3.3: Create test for merge utility (critical logic)

**File**: `packages/cli/src/utils/__tests__/merge.test.ts`

The merge utility handles intelligent file merging during `init` and `update`. Bugs here can corrupt user files.

Tests:
- Merges markdown files correctly
- Preserves user customizations
- Handles missing source/target files
- Handles empty files

#### Task 3.4: Verify all tests pass

```bash
npm test
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/cli/eslint.config.js` | Create | ESLint flat config |
| `packages/cli/package.json` | Modify | Add eslint + vitest deps, test script |
| `setup.sh` | Delete | Remove deprecated file |
| `packages/cli/src/analyzers/__tests__/stack.test.ts` | Create | Stack detection tests |
| `packages/cli/src/analyzers/__tests__/project.test.ts` | Create | Project analysis tests |
| `packages/cli/src/analyzers/__tests__/architecture.test.ts` | Create | Architecture detection tests |
| `packages/cli/src/utils/__tests__/merge.test.ts` | Create | Merge utility tests |

---

## Risk Analysis

### Low Risk
- ESLint config is additive, doesn't change code
- Deleting setup.sh is safe (deprecated, references non-existent directories)
- Adding vitest is additive, no impact on build

### Edge Cases
- ESLint might flag things TypeScript already catches → just disable those specific rules
- Tests need to mock filesystem for analyzers → use vitest's mock utilities or test with temp directories

---

## Verification

```bash
cd packages/cli
npm run typecheck && npm run lint && npm test
```

All three should pass green.
