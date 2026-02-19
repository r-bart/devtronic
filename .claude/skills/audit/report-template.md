# Audit Report Template

Save to: `thoughts/audit/YYYY-MM-DD_audit.md`

```markdown
# Codebase Audit Report

**Date**: YYYY-MM-DD
**Mode**: [full|architecture|code|complexity|security|quick]
**Scope**: [full codebase | specific directory]

---

## Summary

| Category | Critical | Major | Minor |
|----------|----------|-------|-------|
| Architecture | X | Y | Z |
| Code Quality | X | Y | Z |
| Code Smells | X | Y | Z |
| Complexity | X | Y | Z |
| Security | X | Y | Z |
| **Total** | **X** | **Y** | **Z** |

**Health Score**: XX/100 ([Excellent|Good|Needs Attention|Critical])

---

## Technical Debt Summary

| Severity | Count | Estimated Effort |
|----------|-------|-----------------|
| Critical | X | X * 4h = Xh |
| Major | X | X * 1h = Xh |
| Minor | X | X * 0.25h = Xh |
| **Total** | **X** | **Xh** |

**Debt Rating**: [Low|Moderate|High|Very High]

[If previous audit exists]
### Trend vs Previous Audit (YYYY-MM-DD)
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Health Score | X | Y | +/-Z |
| Debt Hours | Xh | Yh | +/-Zh |

---

## Complexity Report

### Most Complex Functions (Top 10)

| Function | File | Cyclomatic | Cognitive | Rating |
|----------|------|------------|-----------|--------|
| `functionName()` | `path/to/file.ts:line` | X | Y | [Warning|Critical] |

### Complexity Distribution

| Range | Count | % |
|-------|-------|---|
| 1-10 (OK) | X | X% |
| 11-20 (Warning) | X | X% |
| >20 (Critical) | X | X% |

---

## Code Smells

| Smell | Count | Severity | Worst Offenders |
|-------|-------|----------|-----------------|
| God Files | X | [Warning|Critical] | `file.ts` (X lines), ... |
| Long Functions | X | [Warning|Critical] | `func()` (X lines), ... |
| Deep Nesting | X | [Warning|Critical] | `func()` (X levels), ... |
| Too Many Params | X | [Warning|Critical] | `func(a,b,c,d,e,f)`, ... |
| Large Classes | X | [Warning|Critical] | `ClassName` (X lines), ... |
| Duplication | X | [Warning|Critical] | `funcA()` ~ `funcB()`, ... |

---

## Test Coverage

[If coverage report found]

| Metric | Value | Rating |
|--------|-------|--------|
| Line Coverage | X% | [OK|Minor|Major|Critical] |
| Branch Coverage | X% | [OK|Minor|Major|Critical] |
| Function Coverage | X% | [OK|Minor|Major|Critical] |

### Low Coverage Files (Bottom 5)

| File | Line % | Branch % |
|------|--------|----------|
| `path/to/file.ts` | X% | Y% |

[If no coverage report]
> No coverage report found. Run tests with `--coverage` to include in audit.

---

## Critical Issues (Fix Immediately)

### [Issue Title]
- **File**: `path/to/file.ts:line`
- **Category**: [Architecture|Code Quality|Complexity|Security|Code Smell]
- **Issue**: [Description]
- **Fix**: [Specific action]

---

## Major Issues (Fix Soon)

[Same format]

---

## Minor Issues (Consider)

[Same format]

---

## Recommendations

1. [Most impactful fix first]
2. [Second priority]
3. [...]

---

## Next Steps

- [ ] Fix critical issues before next release
- [ ] Address major issues in next sprint
- [ ] Schedule minor fixes for tech debt sessions
- [ ] Re-run `/audit` after fixes
```
