# auto-devtronic Addon

The auto-devtronic addon adds an autonomous engineering loop to devtronic. It takes a GitHub issue or task description and executes the full pipeline — spec → tests → plan → implement → quality check → PR — self-correcting on failures.

## Install

```bash
npx devtronic addon enable auto-devtronic
```

Installs into `.claude/skills/` and `.claude/agents/`. Works with any devtronic installation (standalone or plugin mode).

## What gets installed

| Type | Name | Purpose |
|------|------|---------|
| Skill | `/devtronic` | Main entry point — orchestrates the full pipeline |
| Skill | `/devtronic:validate-task-afk` | Pre-flight viability validator — scores tasks 0-100 across 5 dimensions |
| Agent | `issue-parser` | Extracts structured brief from GitHub issues or descriptions |
| Agent | `failure-analyst` | Diagnoses test/lint failures, proposes targeted fixes |
| Agent | `quality-runner` | Runs typecheck, lint, and tests; returns structured pass/fail |
| Agent | `afk-task-validator` | Analyzes task descriptions for AFK-readiness, detects quality gaps |

## Usage

```bash
/devtronic https://github.com/org/repo/issues/42
/devtronic "Add pagination to the users list"
/devtronic <issue-url> --afk
/devtronic <issue-url> --afk --validate
/devtronic <issue-url> --dry-run

# Pre-flight check before committing to AFK
/devtronic:validate-task-afk https://github.com/org/repo/issues/42
/devtronic:validate-task-afk "Add pagination to the users list"
/devtronic:validate-task-afk "Add feature" --refine   # interactive refinement mode
```

## When to use which approach

| Situation | Command |
|-----------|---------|
| You trust the task is well-defined → just run it | `/devtronic <issue> --afk` |
| You want to check before committing to AFK | `/devtronic:validate-task-afk <issue>` → then run based on score |
| You want validation + execution in one step | `/devtronic <issue> --afk --validate` |
| Score is 40-70 (medium risk) | `/devtronic <issue> --hitl` |
| Score is <40 → task needs work | `/devtronic:validate-task-afk <issue> --refine` → improve → re-validate |
| Unfamiliar codebase or risky change | `/devtronic <issue> --hitl` (skip validation, use human gates) |

**Recommended flow for new users:**

```
/devtronic:validate-task-afk <issue>          ← check first
       ↓
  Score ≥70 → /devtronic <issue> --afk
  Score 40-70 → /devtronic <issue> --hitl
  Score <40 → /devtronic:validate-task-afk <issue> --refine → improve → re-validate
```

**Shortcut once you know the codebase:**

```
/devtronic <issue> --afk --validate   ← validate + run in one command
```

---

## Modes

| Mode | Flag | Human gates | Use when |
|------|------|-------------|----------|
| **HITL** | `--hitl` (default) | Brief, tests, each retry, PR | Unfamiliar codebase, risky changes |
| **AFK** | `--afk` | None | Routine issues, high test coverage, trusted scope |

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--validate` | no | Validate task AFK-readiness before proceeding (score 70+ = proceed, <70 in AFK mode = ask for HITL) |
| `--hitl` | yes | Pause at key gates for human approval |
| `--afk` | no | Fully autonomous, no pauses |
| `--max-retries N` | 3 | Max loop iterations before escalating to human |
| `--skip-spec` | no | Skip spec interview, auto-generate from brief |
| `--branch name` | auto | Branch name (auto-derived from issue title) |
| `--dry-run` | no | Run everything including code changes, but skip `gh pr create` — prints PR body to stdout instead |

## Pipeline

```
INPUT (issue URL or description)
  │
  ▼
0. VALIDATE (if --validate)  — /devtronic:validate-task-afk
             Score 70+? Proceed silently.
             Score <70 in AFK mode? Ask "Switch to HITL mode?"
             Score <40? Ask to refine and re-validate.
  │
  ▼
1. INTAKE      — parse issue via issue-parser, extract structured brief
  │
  ▼ [HITL gate: confirm brief]
2. SPEC        — brief → spec (skippable with --skip-spec)
  │
  ▼ [HITL gate: approve tests]
3. TESTS       — /devtronic:generate-tests: encode acceptance criteria as failing tests
  │
  ▼
4. PLAN        — /devtronic:create-plan: design phased implementation
  │
  ▼
5. EXECUTE     — /devtronic:execute-plan: implement in parallel phases
  │
  ▼
6. VERIFY      — quality-runner: typecheck + lint + test
  │
  ├── PASS ──▶ 7. PR
  │
  └── FAIL ──▶ failure-analyst → amend plan → retry (up to --max-retries)
                    │
                    └── exhausted ──▶ escalate to human
  │
  ▼
7. PR          — push branch, open PR with --base default branch
  │
  ▼
8. REPORT      — summary of what was done, files changed, tests written
```

## Requirements

**In the target project:**
- `gh` CLI authenticated with repo write access (`gh auth status`)
- A test runner configured (`npm test` / `pnpm test` / `yarn test`)
- Git repository with a remote origin

**devtronic core skills** (included in base installation):
- `/devtronic:generate-tests`
- `/devtronic:create-plan`
- `/devtronic:execute-plan`

## Remove

```bash
npx devtronic addon disable auto-devtronic
```

Removes the skills and all 4 agents from all configured agent directories. Warns if any files have been locally modified.

## Related

- [Skills Reference](./skills.md#auto-devtronic-addon-skills) — full `/devtronic` and `/devtronic:validate-task-afk` documentation
- [Agents Reference](./agents.md#afk-task-validator) — `afk-task-validator` agent documentation
- [CLI Reference](./cli-reference.md#addon-add--addon-remove) — addon commands
- [Design Best Practices Addon](./cli-reference.md#addon-add--addon-remove) — another available addon
