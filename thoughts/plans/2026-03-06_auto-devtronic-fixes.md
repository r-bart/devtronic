# Implementation Plan: auto-devtronic Addon Fixes

**Date**: 2026-03-06
**Status**: Draft
**Branch**: `feat/auto-devtronic-addon` (current)

---

## Overview

Fix 10 identified gaps in the auto-devtronic addon: 3 bugs in TypeScript code, 1 missing agent, 4 SKILL.md content gaps, 1 missing test file, and 1 stale comment.

---

## Requirements

- [ ] Fix hardcoded `rules/design-quality.md` in `addFileBasedAddon`
- [ ] Fix `parseAddonManifest` losing `agents` field
- [ ] Add missing `quality-runner` agent to addon
- [ ] Create `auto-devtronic.test.ts` content validation tests
- [ ] Fix `--skip-spec` flag — add implementation section to SKILL.md
- [ ] Fix `gh pr create` — add `--base` flag
- [ ] Fix AFK stash — add recovery path on error/completion
- [ ] Fix stale comment in `isFileBasedAddon`
- [ ] Validate core skills dependency at runtime (note in SKILL.md)
- [ ] Clarify `--dry-run` semantics in SKILL.md

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/cli/src/commands/addon.ts` | Modify | Fix hardcoded fileList + stale comment |
| `packages/cli/src/addons/registry.ts` | Modify | Fix `parseAddonManifest` missing agents |
| `packages/cli/src/addons/auto-devtronic/agents/quality-runner.md` | **Create** | Missing agent |
| `packages/cli/src/addons/auto-devtronic/manifest.json` | Modify | Declare quality-runner in files.agents |
| `packages/cli/src/addons/auto-devtronic/skills/auto-devtronic/SKILL.md` | Modify | Fix --skip-spec, --base, stash recovery, --dry-run, deps |
| `packages/cli/src/addons/__tests__/auto-devtronic.test.ts` | **Create** | Content validation tests |

---

## Implementation Phases

### Phase 1: TypeScript Code Fixes

Three bugs in infrastructure code. No new functionality — pure corrections.

#### Task 1.1: Fix `addFileBasedAddon` hardcoded fileList

**File**: `packages/cli/src/commands/addon.ts`

**Problem**: `fileList.push('rules/design-quality.md')` is hardcoded, only correct for design-best-practices.

**Fix**: Build `fileList` dynamically from the addon manifest — read `manifest.files` to determine what gets tracked. Skills and agents get tracked; rules only if they exist in the manifest.

```typescript
// Replace the static fileList build (lines ~311-313) with:
const addonManifest = JSON.parse(
  readFileSync(join(addonSourceDir, 'manifest.json'), 'utf-8')
);
const fileList: string[] = [
  ...(addonManifest.files.skills ?? []).map((s: string) => `skills/${s}`),
  ...(addonManifest.files.agents ?? []).map((a: string) => `agents/${a}.md`),
  ...(addonManifest.files.rules ?? []).map((r: string) => `rules/${r}`),
];
```

**Import needed**: `readFileSync` from `node:fs` and `join` from `node:path` — both already imported.

#### Task 1.2: Fix stale comment in `isFileBasedAddon`

**File**: `packages/cli/src/commands/addon.ts`

**Problem**: Comment says "orchestration uses plugin mode; design-best-practices uses file mode" — doesn't mention auto-devtronic.

**Fix**: Update comment to be accurate for all three addons.

```typescript
/**
 * Returns true if the addon uses the file-based system.
 * orchestration → plugin mode (legacy)
 * design-best-practices, auto-devtronic → file-based mode
 */
function isFileBasedAddon(addonName: AddonName): boolean {
  return addonName !== 'orchestration';
}
```

#### Task 1.3: Fix `parseAddonManifest` missing `agents` field

**File**: `packages/cli/src/addons/registry.ts`

**Problem**: The returned object omits `agents` from `files`, silently losing agent data for any consumer of `parseAddonManifest`.

**Fix**: Include `agents` in the returned `files` object.

```typescript
files: {
  skills: files.skills as string[],
  agents: (files.agents as string[]) ?? undefined,
  reference: (files.reference as string[]) ?? undefined,
  rules: (files.rules as string[]) ?? undefined,
},
```

---

### Phase 2: Add `quality-runner` Agent

The execute loop in `SKILL.md` references a `quality-runner` agent that doesn't exist. Without it, Step 5b degrades to the main agent running quality checks inline — which works but loses the clean separation of concerns. Adding the agent formalizes the interface.

#### Task 2.1: Create `quality-runner.md`

**File**: `packages/cli/src/addons/auto-devtronic/agents/quality-runner.md`

**Content**: A focused agent that runs `typecheck + lint + test`, returns structured pass/fail output with full error details. The main auto-devtronic skill reads this output to decide retry vs proceed.

```markdown
---
name: quality-runner
description: Runs all quality checks (typecheck, lint, test) for the auto-devtronic loop. Returns structured pass/fail output for failure-analyst to process.
tools: Bash
model: haiku
---

You are a quality check executor for the auto-devtronic pipeline.

## Your Role

Run typecheck, lint, and test checks. Report results in a structured format
that the auto-devtronic skill and failure-analyst can parse.

## Process

### 1. Detect package manager

Check for lockfiles in the project root:
- `pnpm-lock.yaml` → `pnpm`
- `yarn.lock` → `yarn`
- `bun.lockb` → `bun`
- Otherwise → `npm`

### 2. Run checks in sequence

```bash
<pm> run typecheck 2>&1
<pm> run lint 2>&1
<pm> test 2>&1
```

Stop on first failure if typecheck fails (no point running tests with type errors).
Run lint even if typecheck fails (separate concerns).

### 3. Count results

For test output, extract:
- Total tests run
- Passing
- Failing
- Test names of failures

## Output Format

Print directly (do not save to file):

```markdown
## Quality Check Results

### Typecheck
**Status**: PASS | FAIL
```
<full typecheck output if FAIL, "No errors" if PASS>
```

### Lint
**Status**: PASS | FAIL
```
<full lint output if FAIL, "No issues" if PASS>
```

### Tests
**Status**: PASS | FAIL
**Passing**: N
**Failing**: M

```
<failing test names and errors if FAIL>
```

---
**Overall**: PASS | FAIL
**Blocking issues**: N
```

## Critical Rules

- **Never fix code** — only run and report
- **Full output on failures** — do not truncate error messages
- **Exit codes matter** — if a command exits non-zero, status is FAIL even if output looks ok
```

#### Task 2.2: Update `manifest.json` to declare `quality-runner`

**File**: `packages/cli/src/addons/auto-devtronic/manifest.json`

```json
{
  "name": "auto-devtronic",
  "description": "Autonomous engineering loop. Runs the full spec→test→plan→execute→PR pipeline and self-corrects via failing tests. HITL and AFK modes.",
  "version": "1.0.0",
  "license": "MIT",
  "files": {
    "skills": [
      "auto-devtronic"
    ],
    "agents": [
      "issue-parser",
      "failure-analyst",
      "quality-runner"
    ]
  }
}
```

---

### Phase 3: SKILL.md Content Fixes

Four content gaps in `SKILL.md`. All changes are surgical — no restructuring.

#### Task 3.1: Fix `--skip-spec` — add implementation section

**Problem**: The flag is documented but no section of the pipeline describes what changes when it's active.

**Fix**: Add a conditional block after the HITL gate in Step 2. `--skip-spec` should skip the HITL confirmation gate (the brief is auto-approved) and not start a spec interview. Rename reasoning: "skip spec confirmation" is more accurate.

Add to Step 2, after the HITL gate block:

```markdown
**If `--skip-spec`**: Skip the HITL confirmation gate above. Treat the
issue-parser output as approved and proceed directly to Step 3.
Note: `--skip-spec` does not change brief generation — it only bypasses
the human review gate. Equivalent to AFK mode for this one step only.
```

#### Task 3.2: Fix `gh pr create` — add `--base`

**Problem**: Without `--base`, PRs go to the repo's default branch, which may not match the project's workflow (e.g., `develop` branch).

**Fix**: Detect base branch before creating PR, and add `--base` to the command.

Replace the `gh pr create` block in Step 7:

```bash
# Detect base branch (default branch of the repo)
BASE_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")

git push -u origin <branch-name>

gh pr create \
  --title "<issue title>" \
  --body "<pr-description>" \
  --head <branch-name> \
  --base "$BASE_BRANCH"
```

#### Task 3.3: Fix AFK stash — add recovery path

**Problem**: Step 1 stashes uncommitted changes in AFK mode but never pops the stash. If the run fails, changes are lost in the stash.

**Fix**: Add two things:
1. A note to pop the stash at the end of a successful run (Step 8)
2. An escalation note that mentions the stash if the run aborts

Add to Step 1 (AFK stash section):

```markdown
> **Note**: The stash will be popped automatically at the end of Step 8
> (Report). If the run is aborted or escalated before completion, run
> `git stash pop` manually to restore your changes.
```

Add to Step 8 (Report), before the final output:

```markdown
### Restore stash (AFK mode only)

If a stash was created in Step 1, pop it now:
```bash
git stash list | grep "auto-devtronic" && git stash pop
```
```

#### Task 3.4: Clarify `--dry-run` semantics

**Problem**: `--dry-run` is described as "skip PR creation" but this differs from typical dry-run semantics (no changes at all). A user might expect no code to be written.

**Fix**: Clarify in the flags table:

```
| `--dry-run` | no | Run everything including code changes, but skip `gh pr create`. Prints PR body to stdout instead. Use when you want to inspect results before publishing. |
```

#### Task 3.5: Add core skills dependency check to Step 1

**Problem**: The addon requires `/generate-tests`, `/create-plan`, and `/execute-plan` to be installed, but this is only mentioned in a footer note. A user in AFK mode could hit a silent failure.

**Fix**: Add an explicit check at the start of Step 1:

```markdown
### Verify core skills

Check that the required devtronic core skills are installed:

```bash
ls .claude/skills/ 2>/dev/null | grep -E "generate-tests|create-plan|execute-plan"
```

If any are missing:
- HITL: Warn and ask "Some required skills are missing. Continue anyway?"
- AFK: Escalate to human — "Required skills missing. Install devtronic core first."
```

---

### Phase 4: Tests

#### Task 4.1: Create `auto-devtronic.test.ts`

**File**: `packages/cli/src/addons/__tests__/auto-devtronic.test.ts`

Model after `design-best-practices.test.ts`. Tests are content-validation only (no logic tests).

Covers:
- Addon source directory exists
- `manifest.json` is valid JSON with correct name/version/license
- `manifest.json` declares the skill (`auto-devtronic`)
- `manifest.json` declares all 3 agents (`issue-parser`, `failure-analyst`, `quality-runner`)
- `skills/auto-devtronic/SKILL.md` exists
- SKILL.md has required frontmatter fields (`name`, `description`, `allowed-tools`)
- SKILL.md describes HITL and AFK modes
- Each agent `.md` file exists
- Each agent has `name` and `tools` frontmatter
- `failure-analyst` has `model: sonnet` (quality model for analysis)
- `issue-parser` has `model: haiku` (cost-efficient for parsing)
- `quality-runner` has `model: haiku` (just runs commands)

---

## Task Dependencies

```yaml
phases:
  - phase: 1
    name: TypeScript fixes
    tasks: [1.1, 1.2, 1.3]
    depends_on: []
    parallel: true

  - phase: 2
    name: Add quality-runner agent
    tasks: [2.1, 2.2]
    depends_on: []
    parallel: false  # 2.2 depends on 2.1 existing

  - phase: 3
    name: SKILL.md content fixes
    tasks: [3.1, 3.2, 3.3, 3.4, 3.5]
    depends_on: [2]  # references quality-runner
    parallel: true   # all edit different parts of SKILL.md, but apply sequentially

  - phase: 4
    name: Tests
    tasks: [4.1]
    depends_on: [1, 2]  # tests validate fixed code and new agent
    parallel: false
```

Phases 1 and 2 can run in parallel with each other. Phase 3 must wait for Phase 2 (quality-runner must exist before SKILL.md can correctly reference it). Phase 4 must wait for Phases 1 and 2.

---

## Done Criteria

- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors
- [ ] `npm test` — all tests pass, including new `auto-devtronic.test.ts`
- [ ] `devtronic addon add auto-devtronic` installs 3 agents (not 2)
- [ ] `devtronic addon remove auto-devtronic` removes all 3 agents cleanly
- [ ] `devtronic addon add auto-devtronic` does NOT write `rules/design-quality.md` entry in config
- [ ] `parseAddonManifest` called on auto-devtronic manifest returns `files.agents` with 3 entries
- [ ] SKILL.md has `--base` in `gh pr create`
- [ ] SKILL.md has `git stash pop` in Step 8

---

## Risk Analysis

### Breaking changes
- `parseAddonManifest` now returns `agents` — additive, not breaking (was `undefined` before, now populated)
- `addFileBasedAddon` fileList change — the config entry for design-best-practices will now NOT include `rules/design-quality.md` as a skills entry... wait, actually `rules/design-quality.md` IS in design-best-practices manifest `files.rules`. The dynamic build from manifest will include it as `rules/design-quality.md`. So it's actually correct for both addons. No regression.

### Edge cases
- What if `manifest.json` read fails in `addFileBasedAddon`? Already handled by `getAddonSourceDir` which throws if dir doesn't exist. The JSON.parse could throw — but `readManifest` in `addonFiles.ts` already does this without error handling, so consistent.
- `quality-runner` agent: if the project has no test command, `pnpm run test` will fail. The agent should handle this gracefully — catch exit code 127 (command not found) and report "No test runner configured".

---

## Verification

Package manager: `pnpm` (check `pnpm-lock.yaml` in repo root).

```bash
pnpm run typecheck && pnpm run lint && pnpm test
```
