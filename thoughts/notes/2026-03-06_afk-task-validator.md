# Notes: AFK Task Validator

**Date**: 2026-03-06
**Branch**: feat/auto-devtronic-addon

---

## What Worked Well

1. **Tests-as-DoD before code** — Having test structure (even as `it.todo()`) clarified expected API before implementation
2. **Regex-based heuristics** — Fast, no-dependency scoring for clarity/scope/dependency
3. **5-dimension weighting** — Clean separation makes each scorer independently testable
4. **`it.skip()` vs `it.todo()`** — Using skip for integration tests prevents false "pending" counts

## Gotchas

1. **Rogue quote in regex** — `description.match(/[a-z0-9/_-]+\.(ts|tsx|js|jsx)'/gi)` — the trailing `'` makes it never match. Always test regex literals with a real input before trusting them.

2. **Clarity score saturation** — Inline criteria (Returns X, Validates Y) without an explicit "acceptance criteria" header only scores ~50. The algorithm requires the header for `criteriaScore = 80`. Tasks described in natural language won't always have headers.

3. **Test name vs expectation drift** — If you loosen a test assertion to make it pass, also update the test name. Leaving "should score high (85+)" while the expectation is `>=50` misleads future readers.

## Known Limitations (Acceptable for now)

- **Precedent scoring** returns neutral 50 — requires codebase grep integration (Phase 3+)
- **Coverage scoring** returns 0 — requires vitest --coverage execution (Phase 3+)
- Clarity scorer doesn't reward inline acceptance criteria without the header

## Patterns

- For heuristic validators: write the formula and thresholds in a comment above the function, then test at the boundary values
- Integration stubs (precedent, coverage) should have `// eslint-disable-next-line @typescript-eslint/no-unused-vars` on the line before the function signature to survive lint
