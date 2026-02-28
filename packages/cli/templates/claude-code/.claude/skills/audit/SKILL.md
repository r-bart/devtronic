---
name: audit
description: "Comprehensive codebase audit (SonarQube lite): architecture, code smells, complexity, security, coverage, and technical debt."
allowed-tools: Read, Grep, Glob, Bash, Task, Write, AskUserQuestion
argument-hint: "[--architecture|--code|--complexity|--security|--quick|directory]"
---

# Audit - Comprehensive Codebase Scanner

One-stop skill for auditing codebase health: architecture, code quality, code smells, complexity, security, test coverage, and technical debt. Parse `$ARGUMENTS` for mode flags (--architecture, --code, --complexity, --security, --quick) or a specific directory to scope the audit.

## Modes

| Mode | Command | What it checks |
|------|---------|----------------|
| **Full** | `/audit` | Everything (architecture + code + smells + complexity + security + coverage) |
| **Architecture** | `/audit --architecture` | Layer violations, dependency direction |
| **Code** | `/audit --code` | TODOs, unused code, duplicates, consistency, code smells |
| **Complexity** | `/audit --complexity` | Cyclomatic + cognitive complexity per function |
| **Security** | `/audit --security` | Secrets, vulnerable deps, OWASP basics |
| **Quick** | `/audit --quick` | Critical issues only + functions >20 complexity + god files >800 lines (fast) |
| **Scoped** | `/audit src/features/auth` | Audit specific directory only |

---

## When to Use

- Periodically (weekly/monthly) to maintain codebase health
- Before major refactoring
- Before releases
- Onboarding to assess codebase quality
- After rapid development sprints

**Different from `/post-review`**: That checks recent changes only. This scans the full codebase.

---

## Full Audit Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FULL AUDIT WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DETECT ARCHITECTURE                                         │
│     └── Read docs/ARCHITECTURE.md or auto-detect                │
│     └── Detect PM (lockfiles), find coverage reports            │
│                                                                 │
│  2. PARALLEL SCANS (5 Task agents)                              │
│     ├── A: Architecture violations                              │
│     ├── B: Code quality grep (TODOs, console.logs, commented)   │
│     ├── C: Code smells + duplication (file analysis)            │
│     ├── D: Complexity analysis (per directory)                  │
│     └── E: Security checks                                      │
│                                                                 │
│  3. COVERAGE INTEGRATION                                        │
│     └── Parse coverage report if exists                         │
│                                                                 │
│  4. ANALYZE & CATEGORIZE                                        │
│     └── Critical > Major > Minor                                │
│                                                                 │
│  5. CALCULATE TECHNICAL DEBT                                    │
│     └── Hours estimate per severity                             │
│                                                                 │
│  6. GENERATE REPORT                                             │
│     └── Save to thoughts/audit/YYYY-MM-DD_audit.md              │
│                                                                 │
│  7. CALCULATE HEALTH SCORE                                      │
│     └── 0-100 rating (with complexity + coverage penalties)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Audit (`--architecture`)

### What It Checks

| Violation | Example | Severity |
|-----------|---------|----------|
| Domain importing infrastructure | `@prisma/client` in domain | Critical |
| UI accessing database | Component importing DB client | Critical |
| Application importing presentation | Use case importing React | Major |
| Business logic in API routes | Complex validation in route | Major |
| Wrong dependency direction | Infrastructure -> Presentation | Major |

### Detection Rules by Pattern

| Pattern | Indicators | Layer Rules |
|---------|------------|-------------|
| **clean** | `src/domain`, `src/application`, `src/infrastructure` | Domain -> nothing, App -> Domain, Infra -> Domain+App |
| **feature-based** | `src/features/*/domain` | Same as clean, per feature |
| **mvc** | `src/models`, `src/views`, `src/controllers` | Models -> nothing |

### Parallel Scans

Launch 4 Explore agents simultaneously:

1. **Domain Layer**: Check for infrastructure/presentation imports
2. **Application Layer**: Check for presentation imports
3. **Presentation Layer**: Check for direct DB access
4. **Business Logic**: Find misplaced logic in routes/components

---

## Code Quality Audit (`--code`)

### What It Checks

| Issue | How Detected | Severity |
|-------|--------------|----------|
| FIXME/HACK comments | Grep | Critical |
| TODO comments | Grep | Normal |
| Unused imports | Lint/Grep | Minor |
| Console.logs | Grep | Minor |
| Duplicated code | Pattern matching | Major |
| Naming inconsistency | Manual review | Minor |

### Scans

```bash
# TODOs and FIXMEs
Grep "TODO|FIXME|HACK|XXX|TEMP" --type ts -C 1

# Console.logs left behind
Grep "console\.(log|debug|info)" --type ts

# Commented out code (potential dead code)
Grep "^\\s*//.*function|^\\s*//.*const|^\\s*//.*class" --type ts
```

### Categorization

- **Critical**: FIXME, HACK (immediate attention)
- **Normal**: TODO (should plan)
- **Low**: XXX, TEMP, minor style issues

### Code Smells Detection

Launch a Task agent (subagent_type: general-purpose) to detect code smells by reading source files:

| Smell | Warning | Critical | Detection |
|-------|---------|----------|-----------|
| God Files | >500 lines | >800 lines | Count lines per file (exclude tests, generated) |
| Long Functions | >50 lines | >100 lines | Find function/method bodies, count lines |
| Deep Nesting | >4 levels | >6 levels | Count nested `if/for/while/switch` depth |
| Too Many Params | >5 params | >8 params | Check function signatures |
| Large Classes | >300 lines / >20 methods | >500 lines / >30 methods | Analyze class definitions |
| Semantic Duplication | 2-3 similar blocks | 4+ similar blocks | Compare functions >10 lines with similar structure |

**Duplication detection strategy**: Agent reads functions of 10+ lines, groups by similar line count (within 20%), compares structure (stripping names/literals). >70% structural similarity = duplicate.

---

## Complexity Audit (`--complexity`)

### Cyclomatic Complexity

Starting at 1, add 1 for each decision point:

| Construct | Count |
|-----------|-------|
| `if` | +1 |
| `else if` | +1 |
| `for` / `for...of` / `for...in` | +1 |
| `while` / `do...while` | +1 |
| `case` (in switch) | +1 |
| `catch` | +1 |
| `&&` | +1 |
| `\|\|` | +1 |
| `??` | +1 |
| `? :` (ternary) | +1 |

**Thresholds**:
- OK: 1-10
- Warning: 11-20
- Critical: >20

### Cognitive Complexity

Like cyclomatic, but nesting depth acts as a multiplier:

```
cognitive_increment = base_increment * (1 + nesting_depth)
```

Each `if/for/while/switch/catch` at nesting level N adds (1 + N) instead of 1.
`else if` adds 1 (no nesting penalty). `else` adds 1 (no nesting penalty).
`&&`, `||`, `??` add 1 (no nesting penalty, but sequences of the same operator count as 1).

**Thresholds**:
- OK: 1-15
- Warning: 16-25
- Critical: >25

### Analysis Strategy

Launch up to 5 Task agents in parallel (subagent_type: general-purpose), one per top-level source directory. Each agent:

1. Reads source files in its directory (skip `node_modules`, `dist`, `build`, `coverage`, `.next`, generated files)
2. Identifies functions/methods (named functions, arrow functions assigned to variables, class methods)
3. Counts cyclomatic and cognitive complexity
4. Reports ONLY functions that exceed warning threshold (cyclomatic >10 OR cognitive >15)

---

## Security Audit (`--security`)

### What It Checks

| Issue | How Detected | Severity |
|-------|--------------|----------|
| Hardcoded secrets | Grep patterns | Critical |
| Vulnerable dependencies | npm audit | Critical/Major |
| SQL injection vectors | Pattern matching | Critical |
| Missing input validation | Code review | Major |
| Exposed sensitive data | Grep | Critical |

### Package Manager Detection

Before running audit commands, detect the PM by checking lockfiles:
- `pnpm-lock.yaml` -> Use `pnpm audit`
- `yarn.lock` -> Use `yarn audit`
- `bun.lockb` -> Use `bunx npm-audit`
- `package-lock.json` or none -> Use `npm audit`

### Scans

```bash
# Hardcoded secrets
Grep "password\s*=\s*['\"]|api_key\s*=\s*['\"]|secret\s*=\s*['\"]" --type ts -i

# Private keys or tokens
Grep "-----BEGIN|sk_live_|pk_live_|ghp_|AKIA" --type ts

# Environment variables in code (should be in .env)
Grep "process\.env\." --type ts
```

### Dependency Audit

Invoke the **dependency-checker** agent for the dependency-related checks (vulnerabilities, outdated packages, unused deps, licenses). It produces a structured report that you integrate into the security section of the audit output.

If the dependency-checker agent is not available, fall back to:
```bash
<pm> audit --audit-level=moderate 2>/dev/null || echo "Run audit manually"
```

### OWASP Quick Check

- [ ] Input validation on all user inputs
- [ ] No SQL string concatenation
- [ ] Authentication on protected routes
- [ ] No sensitive data in logs
- [ ] HTTPS enforced

---

## Test Coverage Integration

### Finding Coverage Reports

Search for existing coverage reports in this order:
1. `**/coverage-summary.json` (Jest/Istanbul JSON summary)
2. `**/lcov.info` (LCOV format)
3. `**/coverage-final.json` (Istanbul detailed)

Use Glob to find them. Skip `node_modules`.

### Parsing

**coverage-summary.json**: Read the `total` key for line/branch/function percentages.

**lcov.info**: Parse `LF:` (lines found) and `LH:` (lines hit) entries, calculate `(total_LH / total_LF) * 100`.

**coverage-final.json**: Aggregate statement coverage across all files.

### Coverage Thresholds

| Coverage | Severity | Action |
|----------|----------|--------|
| < 20% | Critical | Urgent: add tests for critical paths |
| 20-49% | Major | Plan test sprint |
| 50-79% | Minor | Gradually improve |
| >= 80% | OK | Maintain |

### No Coverage Report

If no coverage report is found, output an informational note:

```
> No coverage report found. Run your test suite with coverage enabled
> (e.g., `npm test -- --coverage`) to include coverage in the audit.
> No coverage penalty applied to health score.
```

**No penalty is applied to the health score when coverage data is unavailable.**

---

## Technical Debt Estimation

Always included in the audit report summary. Calculated from all findings.

### Calculation

```
debt_hours = (critical_count * 4h) + (major_count * 1h) + (minor_count * 0.25h)
```

### Debt Rating

| Debt (hours) | Rating | Interpretation |
|--------------|--------|----------------|
| 0-8h | Low | Healthy codebase |
| 9-40h | Moderate | 1-2 sprint allocation recommended |
| 41-160h | High | Dedicated tech debt initiative needed |
| >160h | Very High | Systemic issues, consider major refactor |

### Trend Comparison

If a previous audit exists in `thoughts/audit/`, compare:

```markdown
### Debt Trend

| Metric | Previous (YYYY-MM-DD) | Current | Delta |
|--------|----------------------|---------|-------|
| Critical | 5 | 3 | -2 (improved) |
| Major | 12 | 14 | +2 (regressed) |
| Minor | 30 | 25 | -5 (improved) |
| Debt Hours | 52h | 41h | -11h (improved) |
| Health Score | 55 | 68 | +13 (improved) |
```

---

## Quick Mode (`--quick`)

Fast check for critical issues only:

1. Domain importing infrastructure packages
2. UI importing database clients
3. Hardcoded secrets
4. FIXME/HACK comments
5. npm audit critical vulnerabilities
6. **Functions with cyclomatic complexity >20**
7. **God files >800 lines**

Uses single agent, completes in ~30 seconds.

---

## Report Template

Save to: `thoughts/audit/YYYY-MM-DD_audit.md`

Use the full template from [report-template.md](report-template.md). Key sections: Summary table, Technical Debt Summary (with trend), Complexity Report (top 10 + distribution), Code Smells table, Test Coverage, Issues by severity, Recommendations, Next Steps.

---

## Health Score Calculation

```
base = 100 - (critical * 15) - (major * 5) - (minor * 1)

# Complexity penalty: up to 20 points
complexity_penalty = min(20, critical_complexity_functions * 3)

# Coverage penalty: only if coverage data exists
# 0 if no report, otherwise penalize low coverage (max 20 points)
coverage_penalty = 0           (if no coverage data)
coverage_penalty = max(0, (50 - avg_coverage%) / 2.5)  (if data exists)

score = max(0, min(100, base - complexity_penalty - coverage_penalty))
```

| Score | Rating |
|-------|--------|
| 90-100 | Excellent |
| 70-89 | Good |
| 50-69 | Needs Attention |
| < 50 | Critical |

---

## Edge Cases

- **No source files found**: Skip analysis, report informational note
- **Monorepo**: Detect multiple `package.json`, run per-package where applicable
- **No `docs/ARCHITECTURE.md`**: Auto-detect pattern from directory structure
- **Previous audit missing**: Skip trend comparison, note "first audit"
- **Coverage report stale** (>30 days old): Warn but still parse
- **Very large codebase** (>10k files): Increase agent count, limit depth per agent
- **No package manager lockfile**: Default to `npm`, note in report

---

## Examples

```bash
/audit                        # Full audit (all checks including complexity + coverage)
/audit --architecture         # Only layer violations
/audit --code                 # TODOs, duplicates, code smells
/audit --complexity           # Cyclomatic + cognitive complexity analysis
/audit --security             # Only security checks
/audit --quick                # Fast critical-only scan (includes complexity >20, god files)
/audit src/features/auth      # Audit specific directory
/audit --architecture --code  # Combine modes
/audit --complexity --code    # Complexity + code smells together
```

---

## Tips

1. **Run monthly** to catch drift early
2. **Fix critical first** - they compound
3. **Track score over time** to measure improvement
4. **Before releases**, run full audit
5. **After major refactors**, always audit
6. **Use scoped mode** for faster feedback during development
7. **Compare debt trends** between audits to validate improvement efforts
8. **Address complexity hotspots** first - they cause the most bugs
9. **Enable coverage** in your test suite to get the full health picture
