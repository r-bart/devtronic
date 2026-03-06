# PRD: AFK Task Validator

**Date**: 2026-03-06
**Status**: draft
**Feature**: `/validate-task-afk` skill + `afk-task-validator` subagent

---

## Executive Summary

Enable high-quality autonomous (`--afk`) sessions by validating GitHub issues and task descriptions **before** execution. The validator analyzes input for AFK-readiness, detects quality gaps, suggests refinements, and guides users toward executable task definitions. Prevents wasted retries and ensures `auto-devtronic --afk` works on well-formed inputs.

---

## Problem Statement

### Current State
- User invokes `/auto-devtronic <issue> --afk`
- Issue has vague acceptance criteria, unclear scope, or missing technical context
- Pipeline attempts execution → fails (tests fail, lint fails, ambiguous requirements)
- `failure-analyst` retries up to `--max-retries` (default 3) → exhausts retries → escalates to human
- Result: wasted tokens, burned retries, frustrated user

### Pain Points
1. **Ambiguous inputs** — "Improve performance", "Make it better"
2. **Missing acceptance criteria** — "Add feature X" with no measurable outcome
3. **Architectural scope creep** — "Refactor everything" → unsuitable for AFK
4. **Weak test coverage** — Validator can't catch it, tests pass falsely
5. **No pre-flight validation** — Discover problems during execution, not before

---

## Goals & Non-Goals

### Goals
1. **Validate before execution** — Analyze GitHub issues/descriptions for AFK-readiness
2. **Detect quality gaps** — Identify vague criteria, architectural risks, scope ambiguity
3. **Guide toward clarity** — Ask questions, suggest templates, help user refine input
4. **Score viability** — Output 0-100 score with clear interpretation (0-40: needs work, 40-70: HITL, 70-100: AFK-ready)
5. **Support both flows** — Standalone (`/validate-task-afk`) + integrated in `/auto-devtronic --validate`
6. **Thorough analysis** — Check code patterns, test coverage, precedents (accept ~30-40s latency)

### Non-Goals
- Automatically rewrite issues (user owns refinement)
- Reject issues outright (only recommend + ask confirmation)
- Machine-readable output only (markdown first, human-focused)
- Support non-code tasks (only software engineering tasks)

---

## User Stories

### User Story 1: Pre-flight Validation
**As a** developer
**I want to** validate a GitHub issue before attempting `--afk`
**So that** I can understand if it's suitable and refine it if needed

**Acceptance Criteria:**
- [ ] User invokes `/validate-task-afk <github-issue-url>`
- [ ] Validator analyzes issue (scope, criteria, coverage, risks)
- [ ] Returns markdown report with score (0-100) + recommendations
- [ ] Report includes specific gaps and how to fix them
- [ ] User can decide to refine or proceed

### User Story 2: Auto-detected Refinement
**As a** developer
**I want to** get interactive guidance if my task description lacks clarity
**So that** I can improve it before running `--afk`

**Acceptance Criteria:**
- [ ] Validator detects missing acceptance criteria
- [ ] Asks: "What's the expected behavior? (examples: 'Returns X', 'Validates Y', 'Throws error Z')"
- [ ] Provides template for acceptance criteria
- [ ] Re-analyzes refined input
- [ ] Confirms readiness

### User Story 3: Integration with auto-devtronic
**As a** developer
**I want to** use `--validate` flag with `/auto-devtronic`
**So that** low-viability tasks pause for HITL confirmation

**Acceptance Criteria:**
- [ ] User invokes `/auto-devtronic <issue> --afk --validate`
- [ ] Internally runs validator (step 0, before INTAKE)
- [ ] If score >= 70: proceeds silently
- [ ] If score < 70: pauses, reports score + gaps, asks "Proceed in HITL instead?"
- [ ] User confirms or cancels

### User Story 4: Coverage Detection
**As a** developer
**I want to** know test coverage in areas affected by the task
**So that** I can trust that VERIFY will catch failures

**Acceptance Criteria:**
- [ ] Validator identifies files mentioned in issue
- [ ] Runs `vitest --coverage` on those files
- [ ] Reports coverage % (if < 70%, flags as risk)
- [ ] Recommends: "Consider writing integration tests first"

---

## Functional Requirements

### Feature 1: Issue Analysis
**Description**: Parse GitHub issue or task description, extract structure
**Behavior**:
- Accepts GitHub issue URL or free-form text description
- Extracts: title, description, acceptance criteria, scope, risks
- Normalizes into structured format
- Identifies: explicit criteria vs implicit requirements

**Edge cases**:
- URL is invalid/404 → graceful error message
- Issue is >2000 chars → summarize or truncate
- No acceptance criteria provided → flag as gap

### Feature 2: Viability Scoring
**Description**: Calculate 0-100 score based on quality criteria
**Behavior**:
- **Clarity (25%)**: Acceptance criteria are measurable + executable
  - ✅ "Returns { user, total }" — high clarity
  - ❌ "Make it work better" — low clarity
- **Scope (25%)**: Limited to 2-4 files, single feature
  - ✅ "Add email validation to User entity" — narrow scope
  - ❌ "Refactor architecture" — too broad
- **Precedent (20%)**: Similar pattern exists in codebase
  - ✅ Finds `Email.ts` pattern, "validation already done for Phone"
  - ❌ Completely new pattern (risky for AFK)
- **Coverage (20%)**: Test coverage in affected files
  - ✅ >80% coverage → good (failures will be caught)
  - ❌ <60% coverage → risk (false negatives possible)
- **No Dependencies (10%)**: Task is self-contained
  - ✅ No external PRs, no waiting for other issues
  - ❌ "Depends on PR #42 to merge"

**Scoring**:
```
score = (clarity×0.25) + (scope×0.25) + (precedent×0.2) + (coverage×0.2) + (no_deps×0.1)
Each dimension: 0-100 points

Recommendation:
- 0-40: ❌ Needs refinement (missing critical information)
- 40-70: ⚠️  Medium risk (HITL recommended)
- 70-100: ✅ AFK viable
```

### Feature 3: Gap Detection & Guidance
**Description**: Identify missing information and guide user toward clarity
**Behavior**:
- **Missing Acceptance Criteria**
  - Detects: no measurable outcomes
  - Asks: "What should the system do? (e.g., 'Returns user with id=42', 'Validates email format')"
  - Provides template: "- [ ] Returns X when given Y input"
- **Unclear Scope**
  - Detects: mentions of multiple features, layers, or services
  - Asks: "Can you limit this to a single feature? List files affected."
- **Architectural Risk**
  - Detects: keywords like "refactor", "migrate", "rewrite", "architecture"
  - Warns: "This task affects system design. HITL mode recommended."
- **Low Coverage**
  - Detects: coverage <70% in files
  - Asks: "Should we write integration tests first?"

### Feature 4: Codebase Analysis
**Description**: Search codebase for patterns, coverage, precedents
**Tools**:
- `grep` to find similar implementations (precedent detection)
- `vitest --coverage` on affected files (coverage analysis)
- `read` CLAUDE.md for architectural patterns
- Pattern matching: regex for architectural violations

**Output**: Links examples, recommends: "Similar pattern found in `domain/value-objects/Email.ts`"

### Feature 5: Report Generation
**Description**: Output markdown report with score, gaps, recommendations
**Format**:
```markdown
# AFK Viability Analysis

**Score: 87/100** ✅ AFK Viable

## Assessment

✅ Clarity: 95/100 (Excellent)
  → 5 explicit acceptance criteria, measurable outcomes

✅ Scope: 90/100 (Excellent)
  → Affects 2 files: domain/value-objects/Email.ts, application/use-cases/

⚠️  Coverage: 72/100 (Fair)
  → Current coverage in value-objects/ is 72%. Recommend: write integration tests.

✅ Precedent: 85/100 (Good)
  → Similar pattern found in Phone.ts

✅ No Dependencies: 100/100

---

## Recommendation

**Mode: AFK Viable**

→ Run: `/auto-devtronic <issue> --afk --max-retries 5`

## If You Disagree

- Low score but want to try AFK anyway? Use `--hitl` flag for human gates
- High score but concerned? Ask validator to investigate specific area
```

### Feature 6: Interactive Refinement (if gaps detected)
**Description**: Ask clarifying questions and help user improve input
**Flow**:
1. Validator detects gap (e.g., missing acceptance criteria)
2. Asks: "What's the expected behavior when X happens?"
3. User provides answer
4. Validator re-scores and reports improvement
5. Confirms: "Ready to proceed?" or "Any other changes?"

**Edge case**: User doesn't know how to answer
- Provide template: "Here are examples of good acceptance criteria..."
- Offer option: "I can skip this gap and score the rest. Continue?"

---

## Technical Considerations

### Architecture
```
/validate-task-afk (SKILL)
  └─ invokes
     afk-task-validator (SUBAGENT)
     ├── Tools:
     │   ├── grep (codebase patterns)
     │   ├── bash (vitest --coverage)
     │   ├── read (file analysis)
     │   └── git (commit history for context)
     └── Output:
         ├── score (0-100)
         ├── gap analysis
         └── recommendations
```

### Integration Points
1. **Standalone**: `/validate-task-afk <input>` → analysis + recommendations
2. **In `/auto-devtronic`**: Invoked automatically as step 0 when `--validate` flag present
3. **In `/auto-devtronic`**: Can be skipped with `--skip-validate`

### Performance
- **Lightweight analysis** (grep, pattern matching): <5s
- **Full analysis** (coverage reports): 30-40s acceptable
- Parallelizable: coverage + grep + pattern matching in parallel via subagent

### Data
- Input: GitHub issue URL or plain text
- Storage: No persistence (stateless validation)
- Output: Markdown report (ephemeral)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Reduces wasted retries** | 40% fewer retries in AFK mode | Compare retry counts before/after |
| **User adoption** | >70% of `--afk` users validate first | Track `/validate-task-afk` invocations |
| **Accuracy of score** | 85%+ of "AFK viable" (70+) issues complete without retry | Run `--afk` on scored issues, track success |
| **Clarity improvement** | Users refine issues after validator guidance | Track "before" vs "after" scores |
| **Speed** | <40s per validation | Time full analysis flow |

---

## Edge Cases & Risks

### Edge Cases
1. **Malformed GitHub URLs** → Detect and ask user to paste description instead
2. **Very large issues** (>5000 chars) → Summarize first 2000 chars, ask for clarification
3. **No acceptance criteria** → Validator asks clarifying questions interactively
4. **Coverage report fails** → Fall back to "coverage unknown, proceed with caution"
5. **Multiple unrelated tasks in one issue** → Warn: "This looks like 3 features. Can you split them?"

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| **Over-confidence in score** | User trusts score=90 but task fails anyway | Emphasize: "Score is guidance, not guarantee" |
| **False negatives** (score=80 but risky) | Tasks fail despite high score | Always recommend HITL for architectural changes |
| **Slow analysis** | 40s latency discourages use | Offer `--quick` mode (fast heuristics only) |
| **Requires codebase context** | Works only with git repo + package.json | Error message if not in project root |
| **User ignores recommendations** | Invokes `--afk` on low-score task anyway | Respect choice, let user learn |

---

## Open Questions

- [ ] Should validator suggest `--max-retries 5` for high-coverage tasks vs `--max-retries 2` for low-coverage?
- [ ] When analyzing GitHub issue, should we fetch PR history to understand patterns?
- [ ] Should we cache coverage reports (30s latency) or always run fresh?
- [ ] For interactive refinement, should we limit to 3 questions or allow unlimited back-and-forth?

---

## Dependencies

- `vitest` (for coverage analysis)
- `git` CLI (for codebase context)
- GitHub API access (for fetching issues if URL provided)
- Existing subagent framework (to define `afk-task-validator`)

---

## Implementation Phases

### Phase 1: Core Validation
- Parse issue/description
- Implement scoring algorithm
- Generate markdown report
- Save: `/validate-task-afk` skill + `afk-task-validator` subagent

### Phase 2: Gap Detection
- Implement question-asking for missing criteria
- Add template suggestions
- Interactive refinement loop

### Phase 3: Integration
- Add `--validate` flag to `/auto-devtronic`
- Pause flow when score < 70
- Ask HITL confirmation

### Phase 4: Optimization
- Add `--quick` mode (fast heuristics)
- Implement coverage caching
- Performance tuning

