# Test Manifest: Design Phase Skills & Agents

**Date**: 2026-03-04
**Plan**: thoughts/plans/2026-03-04_design-phase.md
**Status**: generated — 60 failing, 0 passing

---

## Traceability Matrix

| Spec Item | Test | File | Status |
|-----------|------|------|--------|
| All skills | skill file exists | design-skills.test.ts | failing |
| All skills | valid frontmatter (name, description, allowed-tools, argument-hint) | design-skills.test.ts | failing |
| Dispatchers (design, design-system) | ≤ 80 lines | design-skills.test.ts | failing |
| Non-dispatchers | ≤ 500 lines | design-skills.test.ts | failing |
| design dispatcher | documents all --flags | design-skills.test.ts | failing |
| design:system dispatcher | documents --define, --audit, --sync | design-skills.test.ts | failing |
| Research/define/ia/wireframe/system-define/audit skills | output artifact path in content | design-skills.test.ts | failing |
| All agents | agent file exists | design-skills.test.ts | failing |
| All agents | valid frontmatter (name, description, tools, model) | design-skills.test.ts | failing |
| design-system-guardian | disallowedTools includes Edit, Write | design-skills.test.ts | failing |

## Test File

| File | Tests | Todos | Layer |
|------|-------|-------|-------|
| `packages/cli/src/commands/__tests__/design-skills.test.ts` | 60 (failing) | 0 | CLI/Structural |

## Coverage Summary

- **Total spec items**: 21 tasks (12 skills + 7 agents + 2 docs)
- **Tests generated**: 60 (all failing — files don't exist yet)
- **Spec coverage**: 100% of file structure requirements have tests

## Note

Tests validate structural requirements (existence, frontmatter, size constraints) rather than runtime behavior — appropriate for markdown-based deliverables. Runtime behavior is validated manually by invoking the skills.
