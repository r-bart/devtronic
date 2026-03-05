---
name: auto-devtronic
description: Autonomous engineering loop. Takes a GitHub issue or description, runs the full spec→test→plan→execute→review→PR pipeline, and self-corrects via failing tests until done. Two modes: --hitl (human gates, default) and --afk (fully autonomous).
allowed-tools: Task, Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
argument-hint: "[issue-url|description] [--hitl|--afk] [--max-retries N] [--skip-spec] [--branch name] [--dry-run]"
---

# auto-devtronic — Autonomous Engineering Loop

Execute the full devtronic pipeline autonomously for `$ARGUMENTS`.

The key innovation over a manual pipeline: the **execute-verify-correct loop**. Instead of stopping at test failures, the agent analyzes what broke, amends the plan, and retries — up to `--max-retries` times (default: 3).

## Modes

| Mode | Flag | Human gates | Use when |
|------|------|-------------|----------|
| **HITL** | `--hitl` (default) | Brief, tests, each retry, PR | Unfamiliar codebase, risky changes |
| **AFK** | `--afk` | None | Routine issues, high test coverage, trusted scope |

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--hitl` | yes | Pause at key gates for human approval |
| `--afk` | no | Fully autonomous, no pauses |
| `--max-retries N` | 3 | Max loop iterations before escalating |
| `--skip-spec` | no | Skip spec interview, auto-generate from brief |
| `--branch name` | auto | Branch name (auto-derived from issue) |
| `--dry-run` | no | Run everything but skip PR creation |

## Pipeline Position

```
INPUT (issue URL or description)
  │
  ▼
1. INTAKE      — parse issue, extract structured brief
  │
  ▼
2. BRIEF       — 3-layer PRD: context → tasks → validation
  │           [HITL gate: confirm brief]
  ▼
3. TESTS       — generate tests-as-DoD from brief
  │           [HITL gate: confirm tests]
  ▼
4. PLAN        — implementation plan with task dependencies
  │
  ▼
5. EXECUTE LOOP ◄──────────────────────┐
  │  execute-plan                      │
  │  run quality checks                │
  │  if FAIL → failure-analyst ────────┘ (amend plan + retry)
  │  if PASS → continue
  │           [HITL gate on each retry: confirm strategy]
  ▼
6. REVIEW      — /post-review --quick
  │
  ▼
7. PR          — gh pr create, link to issue
               [HITL gate: confirm PR body]
```

---

## Step 1: Parse Input

### Detect input type

**If `$ARGUMENTS` contains a GitHub issue URL** (e.g. `https://github.com/org/repo/issues/42`):

```bash
gh issue view <number> --repo <org/repo> --json title,body,labels,comments,assignees,milestone
```

Extract:
- Title
- Body (full description)
- Labels (used to infer type: bug/feature/chore)
- Comments (may contain acceptance criteria refinements)

**If `$ARGUMENTS` is a plain description** (no URL): use it directly as raw brief input.

**If no `$ARGUMENTS`**: ask the user for the issue URL or description before proceeding.

### Detect branch state

```bash
git status --short
git branch --show-current
```

If there are uncommitted changes, warn in HITL mode. In AFK mode, stash and continue:
```bash
git stash push -m "auto-devtronic: stash before run"
```

### Create working branch

If `--branch` is not specified, derive from issue:
- From URL: `feat/issue-42-<slug>` where slug = first 4 words of title, kebab-cased
- From description: `feat/<slug>` where slug = first 4 words, kebab-cased

```bash
git checkout -b <branch-name>
```

---

## Step 2: Generate Brief (issue-parser agent)

Invoke the **issue-parser** subagent with the raw issue data:

```
Parse this GitHub issue into a structured 3-layer brief.

RAW ISSUE:
Title: <title>
Body: <body>
Labels: <labels>
Comments: <comments>

Output the brief in the format specified in your instructions.
```

The agent outputs a `thoughts/auto-devtronic/brief.md` file with the 3-layer structure:

```markdown
# Brief: <issue title>

**Source**: <issue URL or "manual input">
**Type**: bug | feature | chore
**Branch**: <branch-name>

## Layer 1: Context

[What the system currently does. What files/modules are relevant. Why this matters.]

## Layer 2: Tasks

Atomic implementation steps, ordered by dependency:

1. [Task description — specific enough to implement without ambiguity]
2. [Task description]
...

## Layer 3: Validation

Acceptance criteria as testable assertions:

- [ ] [Criterion 1 — observable, binary outcome]
- [ ] [Criterion 2]
...
```

### HITL gate: confirm brief

**In HITL mode only:**

```markdown
## Brief Generated

[display brief.md contents]

Does this brief accurately capture what needs to be done?

Options:
1. Yes, proceed to test generation
2. No, let me describe what's missing → [amend brief]
3. Abort
```

Wait for user response before continuing.

---

## Step 3: Generate Tests

Follow the same process as `/generate-tests`:

Read `thoughts/auto-devtronic/brief.md`, specifically the **Validation** layer, and generate failing tests that encode each acceptance criterion.

Save to:
- Test files in the appropriate test directory (detect from project structure)
- `thoughts/auto-devtronic/tests-manifest.md` — traceability: criterion → test name → file

**Test naming convention**: `[feature].[criterion-slug].test.ts` or follow existing conventions.

**Verify tests fail** before implementation:
```bash
<pm> test --filter <test-pattern>
```

Expected: all new tests fail (red). If any pass without implementation, flag it — either the criterion is already satisfied (mention it) or the test is incorrect.

### HITL gate: confirm tests

**In HITL mode only:**

```markdown
## Tests Generated

[list of test files and test names]
[X tests failing as expected — red ✓]

Do these tests correctly encode the acceptance criteria?

Options:
1. Yes, proceed to planning
2. No, describe what's wrong → [revise tests]
3. Abort
```

---

## Step 4: Create Plan

Follow the same process as `/create-plan`, using:
- `thoughts/auto-devtronic/brief.md` as the spec
- `thoughts/auto-devtronic/tests-manifest.md` as the DoD

Save plan to `thoughts/auto-devtronic/plan.md`.

The plan **must include**:
- `## Task Dependencies` YAML block (required for parallel execution)
- `## Done Criteria` section referencing the test names from the manifest

---

## Step 5: Execute Loop

This is the RALPH core. Runs until tests pass or retries are exhausted.

### Initialize loop state

```
attempt     = 1
max_retries = N (from --max-retries, default 3)
last_failure = null
plan_path   = thoughts/auto-devtronic/plan.md
```

### Loop body

```
WHILE attempt <= max_retries:

  ── 5a. Execute Plan ────────────────────────────────────
  Follow the /execute-plan process for plan_path.
  Include last_failure context in subagent prompts (if attempt > 1).

  ── 5b. Run Quality Checks ──────────────────────────────
  Invoke the quality-runner agent:
  "Run all quality checks (typecheck, lint, test)"

  ── 5c. Evaluate Result ─────────────────────────────────
  IF all checks pass:
    → BREAK (proceed to Step 6)

  IF checks fail:
    last_failure = {
      attempt: N,
      output: <quality-runner output>,
      affected_files: <list from git diff>
    }

    ── 5d. Analyze Failure ───────────────────────────────
    Invoke the failure-analyst agent with last_failure.
    Agent outputs:
      - root_cause: [description]
      - affected_tasks: [task IDs from plan]
      - fix_strategy: [specific changes needed]
      - confidence: high | medium | low
      - recommend: retry | escalate

    IF recommend == escalate OR attempt == max_retries:
      → ESCALATE (see below)

    IF recommend == retry:

      [HITL gate only]:
      Show failure analysis and ask:
      "Retry attempt N with this fix strategy? (yes / modify / abort)"
      Wait for user response.

      Amend plan_path with fix_strategy context:
      - Update affected tasks with failure context
      - Add note: "Attempt N failed: <root_cause>. Fix: <fix_strategy>"

      attempt++
      → CONTINUE loop
```

### Escalation

When retries are exhausted or analyst recommends escalating:

```markdown
## auto-devtronic: Cannot Self-Correct ⚠️

**Attempts**: N / max_retries
**Last failure**: [quality-runner output summary]

**Failure analysis**:
- Root cause: [description]
- Affected: [files/tasks]

**Why retrying won't help**: [analyst reasoning]

**Options**:
1. Increase max-retries and continue (risky)
2. Show me the failing tests so I can fix manually
3. Abort — reset branch to start

What would you like to do?
```

Wait for user input regardless of mode (always escalate to human).

### Loop progress display

After each attempt:

```
● Loop attempt 2/3
  ✖ typecheck — 3 errors in auth/session.ts
  ✖ tests — 2/5 passing
  → Analyzing failures...
  → Amending plan: patch session.ts type signatures
  → Starting attempt 3...
```

---

## Step 6: Review

Once the loop exits with all checks passing:

Follow the `/post-review --quick` process:
- Run quality checks one final time (full suite)
- Verify done criteria from the test manifest
- Check no regressions (compare test count to baseline if available)

Output:

```markdown
## Review: PASS ✅

- Types: ✅
- Lint: ✅
- Tests: ✅ (N new, 0 regressions)

### Done Criteria
| # | Criterion | Test | Status |
|---|-----------|------|--------|
| 1 | [text] | [test name] | ✅ PASS |
| 2 | [text] | [test name] | ✅ PASS |

**All criteria met. Ready for PR.**
```

---

## Step 7: Create PR

### Build PR description

```markdown
## <issue title>

**Closes**: #<issue-number> (or "Resolves: <issue-url>")
**Branch**: <branch-name>
**Attempts**: N (auto-devtronic)

### What changed

[Summary of implementation based on plan phases completed]

### Tests

- N new tests added
- All acceptance criteria covered

### Acceptance criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | [text] | ✅ |
| 2 | [text] | ✅ |

🤖 Generated with [auto-devtronic](https://github.com/devtronic/devtronic)
```

### HITL gate: confirm PR

**In HITL mode only:**

```
## PR Ready

[display PR description above]

Create this PR?
1. Yes
2. Edit title/body first
3. No (I'll create manually)
```

### Create PR

```bash
git push -u origin <branch-name>

gh pr create \
  --title "<issue title>" \
  --body "<pr-description>" \
  --head <branch-name>
```

If `--dry-run`: skip `gh pr create`, print PR body to stdout instead.

---

## Step 8: Report

Final summary after PR creation:

```markdown
## auto-devtronic: Complete ✅

**Issue**: <title> (<url>)
**PR**: <pr-url>
**Branch**: <branch-name>
**Loop attempts**: N

### Stats
- Files changed: X
- Tests added: Y
- Loop retries needed: N-1
- Duration: [phase count] phases

### Files
| File | Change |
|------|--------|
| `path/to/file.ts` | Added / Modified |

### Session artifacts
- Brief: `thoughts/auto-devtronic/brief.md`
- Tests manifest: `thoughts/auto-devtronic/tests-manifest.md`
- Plan: `thoughts/auto-devtronic/plan.md`
```

---

## Error Handling

### No tests in project

If the project has no test runner configured:
- In HITL: warn and ask "Continue without test validation?"
- In AFK: skip test generation and loop, go directly to plan → execute → review → PR

### Branch already exists

```bash
git branch -a | grep <branch-name>
```

If exists:
- HITL: ask user (use existing / rename / abort)
- AFK: append `-2`, `-3` etc. until unique

### `gh` CLI not authenticated

```bash
gh auth status
```

If fails:
- Always escalate to human: "Run `gh auth login` before using auto-devtronic"

### Merge conflicts during execution

If a subagent task fails due to conflicts:
- Pass conflict context to failure-analyst
- Analyst recommends: rebase first or resolve conflicts manually
- Always escalate to human for conflict resolution

---

## Examples

```bash
# Standard HITL run from a GitHub issue
/auto-devtronic https://github.com/myorg/myapp/issues/42

# Fully autonomous run
/auto-devtronic https://github.com/myorg/myapp/issues/42 --afk

# From a plain description
/auto-devtronic "Add rate limiting to /api/auth/login, max 5 requests per minute per IP"

# Increase retries for complex issue
/auto-devtronic https://github.com/myorg/myapp/issues/88 --afk --max-retries 5

# Preview without creating PR
/auto-devtronic https://github.com/myorg/myapp/issues/42 --dry-run

# Skip spec interview (auto-generate from issue body)
/auto-devtronic https://github.com/myorg/myapp/issues/42 --skip-spec
```

---

## Notes

- **Requires devtronic core skills** — auto-devtronic uses the same logic as `/generate-tests`, `/create-plan`, and `/execute-plan`. Those skills must be installed.
- **Requires `gh` CLI** — authenticated with repo write access.
- **AFK is not magic** — it reduces friction, not mistakes. Start with HITL on unfamiliar codebases.
- **Session artifacts** — all intermediate files are saved to `thoughts/auto-devtronic/`. Do not delete them until the PR is merged.
