# Implementation Plan: `/architecture-audit` Skill

## Overview

Create a skill for deep analysis of architectural violations across the entire codebase, generating actionable reports with specific fixes.

## Requirements

### Must Have
- Scan full codebase (not just recent changes)
- Detect Clean Architecture layer violations
- Detect dependency direction violations
- Generate prioritized report with file:line references
- Suggest concrete fixes for each violation

### Should Have
- Support different architecture patterns (per-feature, per-layer)
- Detect DDD violations (entities, value objects, services)
- Configurable scope (full, module, directory)
- Severity levels (critical, major, minor)

### Won't Have (this version)
- Automatic fixing (too risky)
- CI/CD integration
- Historical tracking

---

## Approach Comparison

### Approach A: Static Analysis with Grep/Glob

**Description**: Use regex patterns to find import violations by analyzing import statements.

**Pros**:
- Fast execution
- No dependencies
- Works on any TypeScript/JavaScript project

**Cons**:
- Limited to pattern matching
- May have false positives
- Can't understand runtime behavior

**Complexity**: Medium

### Approach B: AST-based Analysis

**Description**: Parse files to AST and analyze dependency graph.

**Pros**:
- More accurate
- Can detect complex patterns
- Better understanding of code structure

**Cons**:
- Requires parser setup
- Slower execution
- More complex implementation

**Complexity**: High

### Recommendation

**Approach A (Static Analysis)** - Simpler, faster, good enough for 90% of cases. Can be enhanced later.

---

## Detection Rules

Based on `.claude/rules/architecture.md`, these are the violations to detect:

### 1. Layer Dependency Violations

| From Layer | Cannot Import From |
|------------|-------------------|
| Domain | Infrastructure, Presentation, Application (external deps) |
| Application | Infrastructure, Presentation |
| Presentation | Infrastructure (direct) |

**Detection patterns**:
```
# Domain importing infrastructure
domain/**/*.ts importing from **/infrastructure/**
domain/**/*.ts importing from @prisma/client, pg, mongoose, etc.

# Domain importing presentation
domain/**/*.ts importing from **/presentation/**
domain/**/*.ts importing from react, vue, angular, etc.

# Application importing presentation
application/**/*.ts importing from **/presentation/**

# UI importing DB directly
presentation/**/*.ts importing from @prisma/client, pg, etc.
components/**/*.tsx importing from @prisma/client, pg, etc.
pages/**/*.tsx importing database client
```

### 2. Business Logic Location Violations

```
# Business logic in API routes
api/**/*.ts containing validation logic
routes/**/*.ts containing business rules

# Business logic in components
components/**/*.tsx containing complex calculations
pages/**/*.tsx containing domain logic
```

### 3. Interface Segregation Violations

```
# Implementations in domain
domain/**/*.ts containing 'implements' with external deps
domain/repositories/**/*.ts containing actual DB calls

# Interfaces in infrastructure
infrastructure/**/*.ts containing 'interface' declarations
```

### 4. External Dependencies in Domain

Known infrastructure packages to flag in domain:
- `@prisma/client`
- `pg`, `mysql2`, `mongodb`
- `axios`, `fetch` (HTTP clients)
- `express`, `fastify` (web frameworks)
- `react`, `vue`, `angular` (UI frameworks)
- `fs`, `path` (Node.js modules)
- `aws-sdk`, `@aws-sdk/*`

---

## Files to Create

| File | Action | Purpose |
|------|--------|---------|
| `.claude/skills/architecture-audit.md` | Create | Main skill definition |
| `packages/cli/templates/claude-code/.claude/skills/architecture-audit/SKILL.md` | Create | Template for CLI distribution |

---

## Implementation Steps

### Phase 1: Skill Definition

**File**: `.claude/skills/architecture-audit.md`

```markdown
---
name: architecture-audit
description: Deep scan of codebase for Clean Architecture and DDD violations. Generates prioritized report with fixes.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Task, Write
---

# Architecture Audit - Deep Violation Scanner

Comprehensive analysis of architectural violations across the entire codebase.

## When to Use

- Periodically (weekly/monthly) to maintain architecture health
- Before major refactoring
- Onboarding to assess codebase quality
- After rapid development sprints
- When you suspect architectural drift

**Different from `/post-feature-review`**: That checks recent changes only. This scans the full codebase.

---

## Workflow

┌─────────────────────────────────────────────────────────────────┐
│                ARCHITECTURE AUDIT WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. DETECT STRUCTURE                                              │
│     └── Identify architecture pattern (per-feature/per-layer)    │
│                                                                   │
│  2. SCAN LAYERS (parallel)                                        │
│     ├── Domain layer violations                                   │
│     ├── Application layer violations                              │
│     ├── Infrastructure boundary issues                            │
│     └── Presentation layer violations                             │
│                                                                   │
│  3. ANALYZE DEPENDENCIES                                          │
│     └── Map import graph, find wrong directions                   │
│                                                                   │
│  4. CATEGORIZE & PRIORITIZE                                       │
│     └── Critical > Major > Minor                                  │
│                                                                   │
│  5. GENERATE REPORT                                               │
│     └── Save to thoughts/architecture/                            │
│                                                                   │
│  6. SUGGEST FIXES                                                 │
│     └── Concrete refactoring steps                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

---

## Phase 1: Detect Structure

First, identify the project's architecture pattern:

### Per-Feature Structure
```
src/
├── features/
│   └── [feature]/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
```

### Per-Layer Structure
```
src/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

### Hybrid/Module Structure
```
src/
├── modules/
│   └── [module]/
│       ├── domain/
│       └── ...
```

**Detection**:
```bash
# Check for per-feature
ls -d src/features/*/domain 2>/dev/null

# Check for per-layer
ls -d src/domain src/application 2>/dev/null

# Check for modules
ls -d src/modules/*/domain 2>/dev/null
```

---

## Phase 2: Scan Layers

Launch parallel scans using Task tool:

### Scan A: Domain Layer Violations

```markdown
**Task**: Find domain layer violations

Search for files in domain/ or */domain/ that import from:
1. Infrastructure packages: @prisma/client, pg, mysql2, mongodb, mongoose
2. Presentation packages: react, vue, angular, @tanstack/react-query
3. HTTP clients: axios, node-fetch
4. Framework code: express, fastify, next/server
5. Relative imports from ../infrastructure/ or ../presentation/

For each violation, return:
- File path
- Line number
- Import statement
- Violation type

Limit: Report all findings
```

### Scan B: Application Layer Violations

```markdown
**Task**: Find application layer violations

Search for files in application/ or */application/ that import from:
1. Presentation packages
2. Direct infrastructure implementations (not interfaces)
3. Framework-specific code

Return file:line with violation type.
```

### Scan C: Presentation Layer Violations

```markdown
**Task**: Find presentation layer violations

Search for files in:
- presentation/, components/, pages/, app/
- *.tsx, *.jsx files

That import:
1. Database clients directly
2. Infrastructure implementations
3. Domain services directly (should go through hooks/use-cases)

Return file:line with violation type.
```

### Scan D: Business Logic Location

```markdown
**Task**: Find misplaced business logic

Search for:
1. API routes with complex validation logic
2. Components with domain calculations
3. Controllers with business rules

Patterns to find:
- if/else chains in routes
- Complex transformations in components
- Database queries in UI code

Return file:line with description.
```

---

## Phase 3: Analyze Dependencies

Create a simplified dependency map:

```bash
# Find all imports in domain
Grep "^import.*from" --type ts domain/ application/ infrastructure/ presentation/

# Group by source layer and target
```

Build matrix:

| From \ To | Domain | Application | Infrastructure | Presentation |
|-----------|--------|-------------|----------------|--------------|
| Domain | ✅ | ❌ | ❌ | ❌ |
| Application | ✅ | ✅ | ❌ | ❌ |
| Infrastructure | ✅ | ✅ | ✅ | ❌ |
| Presentation | ✅ | ✅ | ❌ | ✅ |

Flag any ❌ violations found.

---

## Phase 4: Categorize & Prioritize

### Critical (Must Fix)
- Domain importing infrastructure (breaks dependency rule fundamentally)
- UI accessing database directly (security + architecture)
- Business logic in API routes (untestable, unmaintainable)

### Major (Should Fix)
- Application importing presentation
- Infrastructure types leaking to domain
- Missing repository interfaces

### Minor (Consider Fixing)
- Naming inconsistencies
- Files in wrong directories
- Missing barrel exports

---

## Phase 5: Generate Report

Output format:

```markdown
# Architecture Audit Report

**Date**: YYYY-MM-DD
**Scope**: [Full codebase | Module X | Directory Y]
**Pattern**: [Per-feature | Per-layer | Hybrid]

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | X |
| Major | Y |
| Minor | Z |

**Health Score**: X/100 (based on violation density)

---

## Critical Violations

### 1. Domain Importing Infrastructure

| File | Line | Import | Fix |
|------|------|--------|-----|
| `src/domain/services/UserService.ts` | 3 | `@prisma/client` | Move to infrastructure, use interface |

**Pattern detected**: Direct DB access in domain

**Suggested refactor**:
1. Create interface in `domain/repositories/UserRepository.ts`
2. Move implementation to `infrastructure/repositories/`
3. Inject via constructor

### 2. UI Accessing Database

[...]

---

## Major Violations

[...]

---

## Minor Violations

[...]

---

## Dependency Graph

```
Domain ──────────────────────────────────────
   │
   │ ❌ imports @prisma/client (3 files)
   │
Application ─────────────────────────────────
   │
   │ ✅ correctly imports Domain only
   │
Infrastructure ──────────────────────────────
   │
   │ ✅ implements Domain interfaces
   │
Presentation ────────────────────────────────
   │
   │ ❌ imports Infrastructure directly (2 files)
```

---

## Recommended Fix Order

1. **First**: Fix critical domain violations (highest impact)
2. **Then**: Fix UI → Infrastructure violations
3. **Finally**: Address major/minor issues

---

## Next Steps

- [ ] Fix critical violations immediately
- [ ] Create tasks for major violations
- [ ] Schedule minor fixes for refactoring sprint
- [ ] Re-run audit after fixes to verify
```

Save to: `thoughts/architecture/YYYY-MM-DD_audit.md`

---

## Quick Mode

For a fast check:

```
/architecture-audit quick
```

Only checks:
1. Domain importing infrastructure packages
2. UI importing database clients
3. Most critical violations only

---

## Scope Options

```bash
/architecture-audit                    # Full codebase
/architecture-audit src/features/auth  # Specific directory
/architecture-audit --module users     # Specific module
```

---

## Tips

1. Run monthly to catch drift early
2. Fix critical violations before they spread
3. Use report to prioritize refactoring
4. Share report with team for awareness
5. Track health score over time
```

---

## Testing Strategy

### Manual Verification
1. Run on this codebase (ai-agentic-architecture)
2. Run on a sample project with known violations
3. Verify false positive rate is acceptable

### Edge Cases
- Empty directories
- No domain layer (flat structure)
- Mixed patterns (some features, some flat)
- Monorepo with multiple apps

---

## Verification After Implementation

1. Test skill invocation: `/architecture-audit`
2. Test quick mode: `/architecture-audit quick`
3. Test scoped: `/architecture-audit src/features/`
4. Verify report is saved correctly
5. Verify detection patterns work

---

## Risks

| Risk | Mitigation |
|------|------------|
| False positives | Document common false positives, add exceptions |
| Slow on large codebases | Use parallel scans, implement quick mode |
| Different project structures | Detect structure first, adapt patterns |
| Too many violations | Prioritize clearly, suggest fix order |

---

## Plan Ready for Review

**Summary**: Create `/architecture-audit` skill for deep codebase analysis of Clean Architecture violations.

**Files to create**: 2 (skill + template)
**Estimated lines**: ~400
**Risk level**: Low (read-only analysis)

**Ready to implement?**
- Yes: I'll create the skill files
- No: Tell me what to adjust
