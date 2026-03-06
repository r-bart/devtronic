# auto-devtronic Addon

The auto-devtronic addon adds an autonomous engineering loop to devtronic. It takes a GitHub issue or task description and executes the full pipeline — spec → tests → plan → implement → quality check → PR — self-correcting on failures.

## Install

```bash
npx devtronic addon add auto-devtronic
```

Installs into `.claude/skills/` and `.claude/agents/`. Works with any devtronic installation (standalone or plugin mode).

## What gets installed

| Type | Name | Purpose |
|------|------|---------|
| Skill | `/auto-devtronic` | Main entry point — orchestrates the full pipeline |
| Agent | `issue-parser` | Extracts structured brief from GitHub issues or descriptions |
| Agent | `failure-analyst` | Diagnoses test/lint failures, proposes targeted fixes |
| Agent | `quality-runner` | Runs typecheck, lint, and tests; returns structured pass/fail |

## Usage

```bash
/auto-devtronic https://github.com/org/repo/issues/42
/auto-devtronic "Add pagination to the users list"
/auto-devtronic <issue-url> --afk
/auto-devtronic <issue-url> --dry-run
```

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
| `--max-retries N` | 3 | Max loop iterations before escalating to human |
| `--skip-spec` | no | Skip spec interview, auto-generate from brief |
| `--branch name` | auto | Branch name (auto-derived from issue title) |
| `--dry-run` | no | Run everything including code changes, but skip `gh pr create` — prints PR body to stdout instead |

## Pipeline

```
INPUT (issue URL or description)
  │
  ▼
1. INTAKE      — parse issue via issue-parser, extract structured brief
  │
  ▼ [HITL gate: confirm brief]
2. SPEC        — brief → spec (skippable with --skip-spec)
  │
  ▼ [HITL gate: approve tests]
3. TESTS       — /generate-tests: encode acceptance criteria as failing tests
  │
  ▼
4. PLAN        — /create-plan: design phased implementation
  │
  ▼
5. EXECUTE     — /execute-plan: implement in parallel phases
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
- `/generate-tests`
- `/create-plan`
- `/execute-plan`

## Remove

```bash
npx devtronic addon remove auto-devtronic
```

Removes the skill and all 3 agents from all configured agent directories. Warns if any files have been locally modified.

## Related

- [Skills Reference](./skills.md#auto-devtronic-addon-skills) — full `/auto-devtronic` documentation
- [CLI Reference](./cli-reference.md#addon-add--addon-remove) — addon commands
- [Design Best Practices Addon](./cli-reference.md#addon-add--addon-remove) — another available addon
