# Implementation Plan: AFK Task Validator

**Date**: 2026-03-06
**Status**: Draft
**Spec**: thoughts/specs/2026-03-06_afk-task-validator.md

---

## Overview

Implement `/validate-task-afk` skill + `afk-task-validator` subagent to validate GitHub issues/task descriptions before AFK execution. Detects quality gaps, calculates viability score (0-100), and guides users toward clarity through interactive refinement.

## Requirements

- [ ] Skill `/validate-task-afk` accepts GitHub issue URL or plain text description
- [ ] Subagent `afk-task-validator` analyzes input across 5 dimensions (clarity, scope, precedent, coverage, dependencies)
- [ ] Calculates weighted score (0-100) with clear interpretation bands
- [ ] Detects gaps (missing acceptance criteria, unclear scope, architectural risk, low coverage)
- [ ] Asks clarifying questions with templates when gaps detected
- [ ] Generates markdown report with score + recommendations
- [ ] Integrates as optional step 0 in `/auto-devtronic --validate`
- [ ] Thorough analysis (30-40s acceptable, includes coverage reports)

---

## Approach Analysis

### Option A: Lightweight Heuristics + NLP
**Description**: Fast pattern matching (regex, keyword detection) + basic NLP sentiment analysis. No code execution.

**Pros**:
- Fast (<5s)
- No dependencies on project state
- Works on any issue format

**Cons**:
- Coverage detection unreliable (can't run vitest)
- Precedent detection limited (simple grep only)
- Score less accurate

**Complexity**: Low

### Option B: Full Analysis with Coverage (RECOMMENDED)
**Description**: Parse issue, run vitest coverage on affected files, grep codebase for patterns, analyze all 5 dimensions, interactive refinement.

**Pros**:
- Accurate score (real coverage data)
- Detects actual precedents in codebase
- Interactive refinement improves input quality
- Matches spec requirement for "thorough analysis"

**Cons**:
- Slower (30-40s with coverage reports)
- Requires git repo + vitest
- More complex implementation

**Complexity**: Medium

### Recommendation

**Option B** because:
- Spec explicitly requests "Thorough analysis" accepting 30-40s latency
- Real coverage + codebase context > heuristics
- Interactive refinement justifies the extra time
- Users benefit from accuracy over speed here

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `.claude/skills/validate-task-afk/SKILL.md` | Create | Skill entry point |
| `.claude/agents/afk-task-validator.md` | Create | Subagent for analysis |
| `.claude-plugins/devtronic/skills/validate-task-afk/SKILL.md` | Create | Plugin version (if plugin mode) |
| `.claude-plugins/devtronic/agents/afk-task-validator.md` | Create | Plugin version (if plugin mode) |

---

## Implementation Phases

### Phase 1: Subagent Core (afk-task-validator)

#### Task 1.1: Define Subagent Metadata
**File**: `.claude/agents/afk-task-validator.md`

Frontmatter:
```markdown
---
name: afk-task-validator
description: Analyzes GitHub issues and task descriptions for AFK-readiness. Calculates viability score, detects gaps, provides guidance for refinement.
tools: Bash, Read, Grep, Glob
model: haiku
---
```

Core sections:
- When to Invoke
- Analysis Framework (5 dimensions)
- Scoring Algorithm
- Gap Detection & Guidance
- Interactive Refinement Process
- Output Format

#### Task 1.2: Implement Analysis Framework
**Scoring dimensions** (defined in agent instructions):

```
1. CLARITY (25%) — Acceptance criteria are measurable + executable
   Score = 100 if "Returns X", "Validates Y", "Throws Z"
   Score = 50 if "Add feature X" (vague)
   Score = 0 if "Make it better" (unmeasurable)

2. SCOPE (25%) — Limited to 2-4 files, single feature
   Files mentioned: count them from description
   Layers touched: domain/application/infrastructure? (risk if >2)
   Keywords risk: "refactor", "migrate", "rewrite", "architecture" → penalty

3. PRECEDENT (20%) — Similar pattern exists in codebase
   Use grep to search for similar implementations
   Example: if "email validation" mentioned, search domain/value-objects/*.ts
   Score = 100 if found exact pattern
   Score = 50 if similar pattern
   Score = 20 if unique (new pattern)

4. COVERAGE (20%) — Test coverage in affected files
   Extract filenames from issue/description
   Run `vitest --coverage` on those files
   Score = 100 if >90% coverage
   Score = 75 if 70-90%
   Score = 50 if 50-70%
   Score = 20 if <50%
   Score = 0 if coverage unknown/failed

5. NO_DEPENDENCIES (10%) — Task is self-contained
   Keywords risk: "depends on", "PR #", "requires", "after" → penalty
   Score = 100 if none
   Score = 50 if external dependency mentioned
```

#### Task 1.3: Gap Detection Logic
**Missing Acceptance Criteria**
```
Pattern: If issue lacks lines like:
- "Returns X when..."
- "Validates Y..."
- "Throws error if..."
- "Should do X..."

Action: Flag gap, ask: "What's the expected behavior?"
```

**Unclear Scope**
```
Pattern: If issue mentions multiple features or layers
Action: Flag gap, ask: "Can you narrow this to a single feature?"
```

**Architectural Risk**
```
Pattern: Keywords: "refactor architecture", "migrate", "redesign system"
Action: Flag risk, recommend HITL
```

**Low Coverage**
```
Pattern: Coverage <60% in affected files
Action: Flag risk, ask: "Should we write tests first?"
```

#### Task 1.4: Interactive Refinement
**Process**:
1. Detect gap (e.g., missing acceptance criteria)
2. Ask clarifying question with example
3. If user provides answer: incorporate + re-score
4. If user doesn't know: offer template
5. Ask: "Anything else you'd like to refine?"
6. Final score + recommendation

---

### Phase 2: Skill Interface (validate-task-afk)

#### Task 2.1: Create Skill Directory & SKILL.md
**File**: `.claude/skills/validate-task-afk/SKILL.md`

Frontmatter:
```markdown
---
name: validate-task-afk
description: Validates GitHub issues and task descriptions for AFK-readiness. Calculates viability score and guides refinement.
allowed-tools: Agent, Bash, Read, Glob, Grep, WebFetch
argument-hint: "<github-issue-url or task-description>"
---
```

#### Task 2.2: Implement Skill Flow
**High-level logic**:
```
1. PARSE INPUT
   ├─ If starts with "http" → GitHub issue URL
   │  └─ Fetch issue title + body via GitHub API (gh CLI)
   │  └─ Fallback: ask user to paste issue description
   │
   └─ Else → Treat as plain text description

2. INVOKE SUBAGENT
   └─ afk-task-validator analyzes
   └─ Returns: score + gaps + recommendations

3. DISPLAY REPORT
   ├─ Score (0-100) with emoji + interpretation
   ├─ Per-dimension breakdown
   ├─ Gaps detected + how to fix
   └─ Recommendation: "AFK viable" or "HITL recommended"

4. PROMPT FOR ACTION
   ├─ "Refine input?" (no → done)
   ├─ If yes → back to step 2 (re-analyze)
   └─ Or: "Ready to use with /auto-devtronic"?
```

#### Task 2.3: Report Template (Markdown)
```markdown
# AFK Viability Analysis

**Score: 87/100** ✅ AFK Viable

## Dimensions

✅ Clarity: 95/100 (Excellent)
   → 5 explicit acceptance criteria

✅ Scope: 90/100 (Excellent)
   → Affects 2 files

⚠️  Coverage: 72/100 (Fair)
   → Current coverage in domain/value-objects/ is 72%

✅ Precedent: 85/100 (Good)
   → Similar pattern in Phone.ts

✅ No Dependencies: 100/100

---

## Recommendation

Mode: **AFK Viable**

Use:
```bash
/auto-devtronic <issue> --afk --max-retries 5
```

## Gaps Found

None — ready to proceed!

(Or if gaps):
- Missing: Acceptance criteria for error case
- Suggestion: Add "Returns 400 if email invalid"
```

---

### Phase 3: Integration with `/auto-devtronic` (Optional)

#### Task 3.1: Add `--validate` Flag to `/auto-devtronic`
**Where**: auto-devtronic skill (addon or main)

**Logic**:
```
/auto-devtronic <issue> --afk --validate
  │
  ├─ Step 0: Call afk-task-validator
  │  └─ score = result
  │
  ├─ If score >= 70: proceed silently to step 1 (INTAKE)
  │
  └─ If score < 70:
     ├─ Report score + gaps
     ├─ Ask: "Low score detected. Use HITL mode instead? [y/n]"
     ├─ If y: proceed in HITL (with human gates)
     └─ If n: proceed in AFK anyway (user's choice)
```

#### Task 3.2: Update Pipeline Diagram
**In `/auto-devtronic` skill**:
```
INPUT
  ↓
0. VALIDATE (new, if --validate flag)
  │ (via afk-task-validator)
  │ score < 70? → ask HITL confirmation
  ↓
1. INTAKE
2. SPEC
... (rest)
```

---

## Risk Analysis

### Edge Cases

| Case | Handling |
|------|----------|
| GitHub URL is 404 | Graceful error: "Issue not found. Paste description instead?" |
| Issue >5000 chars | Summarize first 2000 chars, ask for clarification |
| No acceptance criteria | Interactive: ask "What's expected?" + provide template |
| Coverage report fails | Fallback: "Coverage unknown, proceed with caution" |
| Multiple unrelated tasks | Warn: "Looks like 3 features. Can you split them?" |

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| vitest --coverage slow | 30-40s latency | Accept per spec; offer `--quick` flag later |
| GitHub API rate limit | Validation fails if no auth | Use `gh` CLI (already authenticated) |
| Grep finds too many matches | Analysis paralyzed | Limit grep results to 5 + summarize |
| User ignores low score | Does `--afk` on risky task anyway | Respect choice; user can learn from failure |

### Dependency Risks

- **Requires**: `vitest` in project (for coverage)
- **Requires**: `git` CLI (for codebase context)
- **Requires**: `gh` CLI authenticated (for GitHub issues)
- **Fallback**: If any missing → graceful degradation (estimate coverage, use heuristics)

---

## Testing Strategy

### Unit Tests
- [ ] Scoring algorithm: each dimension scores correctly
- [ ] Gap detection: identifies missing criteria, low coverage, scope issues
- [ ] Report generation: markdown is valid, score displayed correctly

### Integration Tests
- [ ] Full flow: GitHub URL → analysis → report
- [ ] Full flow: Plain text description → analysis → report
- [ ] Interactive refinement: user answer → re-score → score improves
- [ ] Integration with `/auto-devtronic`: `--validate` flag works, pauses if score low

### Manual Verification
- [ ] Test with real GitHub issue (complex + AFK-viable)
- [ ] Test with vague issue (should ask for refinement)
- [ ] Test with architectural issue (should warn HITL)
- [ ] Test with high-coverage issue (should pass)
- [ ] Test with low-coverage issue (should warn)

---

## Verification

After implementation:

```bash
# Detect PM (pnpm-lock.yaml → pnpm, yarn.lock → yarn, etc.)
yarn run typecheck && yarn run lint && yarn test

# Manual test
yarn devtronic:dev /validate-task-afk <test-issue>
```

---

## Success Criteria

- [ ] `/validate-task-afk` invokable, accepts URL or text
- [ ] Subagent analyzes issue across 5 dimensions
- [ ] Score calculates correctly (0-100)
- [ ] Report displays clearly with gaps + recommendations
- [ ] Interactive refinement works (asks + re-scores)
- [ ] Integration with `/auto-devtronic --validate` works
- [ ] All tests pass
- [ ] Documentation updated

---

## Timeline

| Phase | Effort | Duration |
|-------|--------|----------|
| 1: Subagent Core | Medium | 4-6h |
| 2: Skill Interface | Medium | 3-4h |
| 3: Integration | Small | 1-2h |
| Testing + Polish | Medium | 2-3h |
| **Total** | — | **10-15h** |

---

## Next Steps

1. ✅ Spec approved
2. → Implement Phase 1 (subagent)
3. → Implement Phase 2 (skill)
4. → Test thoroughly
5. → Integrate with `/auto-devtronic` (Phase 3, optional)
6. → Update docs (README, skills.md)
7. → Commit + PR

