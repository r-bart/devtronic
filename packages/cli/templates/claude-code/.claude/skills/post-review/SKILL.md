---
name: post-review
description: Post-feature review before PR. Checks requirements, architecture, quality, and captures lessons. Auto-invoke after completing a plan implementation. Use --strict for senior engineer mode.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Task
argument-hint: "[--strict|--quick|files...]"
---

# Post-Feature Review

Comprehensive review of implemented changes before PR creation. If `$ARGUMENTS` specifies files or flags (--strict, --quick), apply accordingly.

## Modes

| Mode | Command | Purpose |
|------|---------|---------|
| **Standard** | `/post-review` | Full review with lessons learned |
| **Strict** | `/post-review --strict` | Senior engineer "grill me" mode |
| **Quick** | `/post-review --quick` | Automated checks only |
| **Files** | `/post-review src/file.ts` | Review specific files |

**Note**: For GitHub PR review, use Claude Code's built-in `/review` command.

---

## When to Use

**Standard mode (default):**
- After completing a feature implementation
- After fixing a bug
- After a refactor
- Before creating a PR

**Strict mode (`--strict`):**
- Want rigorous challenge on your approach
- Need to catch subtle issues
- Preparing for a critical PR

**Quick mode (`--quick`):**
- Small changes
- Just need automated verification

---

## Standard Review Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    STANDARD REVIEW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. GATHER CONTEXT                                              │
│     └── git diff, git log, understand changes                   │
│                                                                 │
│  2. REQUIREMENTS CHECK                                          │
│     └── Did we deliver what was asked?                          │
│                                                                 │
│  3. ARCHITECTURE CHECK                                          │
│     └── Clean Architecture, project patterns                    │
│                                                                 │
│  4. QUALITY CHECK                                               │
│     └── Types, lint, tests passing                              │
│                                                                 │
│  5. CHANGE ANALYSIS                                             │
│     └── Are changes proportional?                               │
│                                                                 │
│  6. IDENTIFY ISSUES                                             │
│     └── Bugs, security, performance, maintainability            │
│                                                                 │
│  7. LESSONS LEARNED                                             │
│     └── What patterns worked? What didn't?                      │
│                                                                 │
│  8. CLAUDE.MD UPDATE                                            │
│     └── Add rules to prevent future mistakes                    │
│                                                                 │
│  9. VERDICT                                                     │
│     └── Ready for PR or needs fixes                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Gather Context

```bash
# What changed?
git diff main...HEAD --stat

# What commits were made?
git log main..HEAD --oneline

# Full diff
git diff main...HEAD
```

---

## Step 2: Requirements Check (with Done Criteria)

### 2a. Find Active Plan

Look for the most recent plan file:
```bash
ls -t thoughts/plans/*.md 2>/dev/null | head -5
```

Also check `thoughts/STATE.md` for an `Active Plan` reference.

### 2b. Extract Done Criteria

If a plan with `## Done Criteria` is found, extract and validate each criterion:

```markdown
## Done Criteria Validation

**Plan**: `thoughts/plans/[file].md`

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | [text] | PASS/FAIL | [how verified] |
| 2 | [text] | PASS/FAIL | [how verified] |

**Result**: X/Y criteria met
```

### 2c. Fallback (No Plan Found)

If no plan with done criteria exists, use the manual requirements checklist:

```markdown
## Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| [Req 1] | ✅ Done | |
| [Req 2] | ⚠️ Partial | [what's missing] |
| [Req 3] | ❌ Not done | [why] |
```

---

## Step 3: Architecture Check (Automated)

**Spawn the `architecture-checker` subagent** to validate compliance on changed files:

```
Use the Task tool with:
  subagent_type: "architecture-checker"
  model: "sonnet"
  prompt: "Check architecture compliance on these changed files: [file list from Step 1]"
```

The subagent reads architecture rules from `CLAUDE.md`, `docs/ARCHITECTURE.md`, or `.claude/architecture-rules.md`, then:
1. Categorizes changed files by architecture layer
2. Checks layer dependency direction, domain purity, pattern compliance
3. Returns a structured report with violations (file:line) and a PASS/FAIL verdict

**If the subagent returns FAIL:**
- List each violation in the review
- Mark the review as NEEDS FIXES
- Violations MUST be resolved before proceeding

**If the subagent is unavailable** (e.g., Task tool not available), fall back to manual checklist:

```markdown
## Architecture Compliance (manual fallback)

### Clean Architecture
- [ ] Domain has no external dependencies
- [ ] Use cases in application layer
- [ ] Infrastructure implements domain interfaces
- [ ] UI only calls application layer

### Project Patterns
- [ ] Follows naming conventions
- [ ] Uses established state management
- [ ] Repository pattern for data access
- [ ] Error handling follows standards
```

---

## Step 4: Quality Check

### Package Manager Detection

First, detect the project's package manager by checking for lockfiles:
- `pnpm-lock.yaml` → Use `pnpm`
- `yarn.lock` → Use `yarn`
- `bun.lockb` → Use `bun`
- `package-lock.json` or none → Use `npm`

Then run quality checks with the detected PM:

```bash
<pm> run typecheck && <pm> run lint && <pm> test
```

```markdown
## Quality Metrics

| Check | Status |
|-------|--------|
| TypeScript | ✅ Pass |
| Lint | ✅ Pass |
| Tests | ✅ Pass (X new) |
```

---

## Step 5: Change Analysis

```markdown
## Change Analysis

**Files**: X changed
**Lines**: +Y / -Z

### Red Flags to Check
- [ ] No huge changes for small feature
- [ ] No unrelated files modified
- [ ] No console.logs left behind
- [ ] No commented code
```

---

## Step 6: Identify Issues

| Severity | Description | Action |
|----------|-------------|--------|
| 🔴 Blocker | Bug, security issue | Must fix |
| 🟠 Major | Logic flaw, bad pattern | Should fix |
| 🟡 Minor | Style, naming | Consider |
| 🟢 Nitpick | Optional enhancement | Optional |

---

## Step 7: Lessons Learned

```markdown
## Lessons Learned

### What Worked Well
1. [Effective pattern/approach]

### What Was Difficult
1. [Challenge and how solved]

### Patterns Discovered
- **Pattern**: [Description]
- **When to use**: [Conditions]
```

Save to: `thoughts/notes/YYYY-MM-DD_[feature-name].md`

---

## Step 8: CLAUDE.md Update

If mistakes were made that should be prevented:

```markdown
## CLAUDE.md Updates Needed?

- [ ] New pattern worth documenting
- [ ] Mistake to prevent
- [ ] Clarification needed

If yes → Update CLAUDE.md with new rule
```

---

## Step 9: Verdict

### ✅ Ready for PR
```markdown
## Review: READY FOR PR ✅

**Summary**: [1-2 sentences]

### Quality
- Types: ✅ | Lint: ✅ | Tests: ✅

### Architecture
- Clean Architecture: ✅
- Project patterns: ✅

### Lessons Captured
- Notes saved to: `thoughts/notes/...`
- CLAUDE.md: [Updated / No changes needed]

**Proceed with PR creation.**
```

### 🔄 Needs Fixes
```markdown
## Review: NEEDS FIXES 🔄

### Must Fix
1. `file.ts:45` - [Issue description]

### Should Fix
1. [Issue]

**Fix and re-run `/post-review`.**
```

---

## Strict Mode (`--strict`)

Senior engineer mode that challenges every decision.

### Additional Steps

**Grill the Developer:**
- "What happens if `user` is null here?"
- "Why this approach over X?"
- "How did you test the error path?"
- "What's the rollback plan?"

**The Test:**
```markdown
Before I approve, answer:

1. What edge case is most likely to cause bugs?
2. If this fails in production, how will you debug it?
3. What would you change if you had more time?
```

**Verdicts:**
- ✅ **APPROVED** - Ready to merge
- 🔄 **CHANGES REQUESTED** - Fix blockers
- 🚫 **BLOCKED** - Needs rearchitecting

---

## Quick Mode (`--quick`)

Abbreviated review for small changes:

1. Run automated checks (typecheck, lint, test)
2. Quick architecture scan
3. One-liner summary

```markdown
## Quick Review

- Types: ✅ | Lint: ✅ | Tests: ✅
- Architecture: ✅ No violations
- **Ready for PR**
```

---

## Output Template

```markdown
# Code Review

**Feature**: [name]
**Branch**: [branch]
**Date**: [date]

---

## Summary

[1-2 sentence overview]

---

## Requirements

| Requirement | Status |
|-------------|--------|
| [Req 1] | ✅ |
| [Req 2] | ✅ |

---

## Quality

| Check | Status |
|-------|--------|
| Types | ✅ |
| Lint | ✅ |
| Tests | ✅ |

---

## Architecture

- ✅ Clean Architecture respected
- ✅ Project patterns followed

---

## Issues Found

### 🔴 Blockers
[None / List]

### 🟠 Major
[None / List]

### 🟡 Minor
[None / List]

---

## Lessons Learned

1. [Key learning]

---

## Verdict

[READY FOR PR / NEEDS FIXES / BLOCKED]

## Next Steps

- [ ] [Action items]
```

---

## Tips

1. **Run before PR creation** - Catch issues early
2. **Be honest about difficulties** - That's where learning happens
3. **Update CLAUDE.md** when you find patterns worth documenting
4. **Use `--strict`** for critical features
5. **Keep notes** for future reference
