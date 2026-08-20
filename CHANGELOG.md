# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-20

Skills were pre-approving tools they had no business holding, three of them answered to names
Claude Code had since taken, and two runtimes were being written to paths they never read. This
release fixes all three. **Run `devtronic update` after upgrading** — it explains each move and
installs the new locations.

### Upgrading

| Was | Now | Why |
|-----|-----|-----|
| `/loop` | `/converge` | Claude Code ships a built-in `/loop`; the short form always resolved to it |
| `/recap` | `/summary --quick` | Claude Code ships a built-in `/recap`; the output is unchanged |
| `/design-system-sync` | `/design-tokens-sync` | One word from the built-in `/design-sync` |
| `.codex/skills/` | `.agents/skills/` | Codex reads repository skills from `.agents/skills` |
| `.opencode/command/<name>.md` | `.opencode/skills/<name>/SKILL.md` | OpenCode reads skills, not commands |
| Node.js 18 | Node.js 20+ | Node 18 left maintenance in April 2026 |

`devtronic loop` and `loop.manifest.yaml` keep their names — neither collides with anything.
`thoughts/RECAP.md` is still written, so `/handoff` and `/execute-plan` are unaffected. Both
legacy runtime directories are swept on update; nothing is left behind to shadow the new paths.

Skills that used to run shell commands and write files without prompting no longer do. If a
workflow you rely on now asks for permission where it did not before, that is the fix, not a
regression: the previous grant was unbounded.

### Security
- **`allowed-tools` no longer grants broad, unprompted access.** In current Claude Code the
  field is a per-turn *pre-approval*, not a tool allowlist — every skill declaring
  `allowed-tools: … Bash, Write, Edit` was silently handing itself unprompted shell and write
  access for the whole turn. All 36 core skills and the 6 addon skills were rewritten: writes
  are pre-approved only inside `thoughts/` (`Edit(thoughts/**)`), the few genuine shell needs
  are scoped to exact commands (`Bash(git worktree *)`, `Bash(devtronic loop *)`), and
  everything else goes back through the normal permission flow.
- **Read-only skills and agents are now actually read-only.** `brief`, `learn`,
  `devtronic-help`, `design-critique` and `design-harden` declare
  `disallowed-tools: Edit, Write, NotebookEdit`; the 14 analysis agents gained the equivalent
  `disallowedTools`.

### Added
- **Portable skill export (Agent Skills open format).** Every non-Claude IDE now receives the
  core skill set at `.agents/skills/<name>/SKILL.md` — the one directory read by Codex,
  Cursor, OpenCode and Copilot/VS Code. Claude Code-only execution controls (`context`,
  `background`, `model`, `effort`, `hooks`, `agent`) are stripped on export. Addon skills are
  filtered by enabled addon, exactly as the plugin generator filters them, and `devtronic
  update` installs and refreshes the set for existing installs.
- **OpenAI Codex as a first-class target** (`--ide codex`): `AGENTS.md` plus the portable
  skill set. Codex has no static rules template — its rules live in `AGENTS.md`.
- **`StopFailure` hook.** A turn that dies on `rate_limit`, `overloaded` or
  `authentication_failed` now releases the loop ownership sentinel, instead of leaving the
  Stop gate deferring for the full 900 s staleness window. Guarded on `owner:machine`, so a
  human-owned barrier is never cleared by a failed turn.
- Skills that write side effects (`loop`, `quick`, `execute-plan`, `scaffold`, `setup`,
  `worktree`, `backlog`, `generate-tests`, `create-skill`, `design-system-sync`, `opensrc`)
  declare `disable-model-invocation: true`, so Claude cannot trigger them unasked.
- Analysis-only skills (`audit`, `design-audit`, `design-system-audit`, `design-review`) run
  with `context: fork` + `background: false`, keeping their scan out of the main context
  while still returning in the invoking turn.
- Code-facing design skills declare `paths:` so they auto-activate only on UI files.
- Analysis agents gained `maxTurns` bounds; `code-reviewer`, `architecture-checker`,
  `design-system-guardian` and `test-generator` gained `memory: project` for cross-session
  learning.

### Changed
- **Skill renames to clear Claude Code built-ins.** `/loop` → `/converge` (the bundled `/loop`
  runs a prompt on a schedule; the short form always resolved to it, not to ours). `/recap` →
  folded into `/summary --quick`, which keeps writing `thoughts/RECAP.md` so `/handoff` and
  `/execute-plan` are unaffected; the orchestration addon now ships two skills. Renamed
  `/design-system-sync` → `/design-tokens-sync`, which was one word from the bundled
  `/design-sync`. All three are registered in `REMOVED_FILES`, so `devtronic update` explains
  the move. The CLI command stays `devtronic loop` and `loop.manifest.yaml` keeps its name —
  neither collides with anything.
- **Codex addon skills move from `.codex/skills/` to `.agents/skills/`** — Codex reads
  repository skills from `.agents/skills`; `.codex/` holds `config.toml` and agent
  definitions. **OpenCode addon skills move from `.opencode/command/<name>.md` to
  `.opencode/skills/<name>/SKILL.md`.** Both legacy locations are swept on removal.
- The CLI-generated `PostToolUse` hook now calls a generated `auto-lint.sh` that filters
  non-source edits, matching the bundled marketplace hook. The two copies had drifted: only
  the marketplace one skipped markdown and JSON writes. `generateHooks()` is now
  argument-free, and a test asserts the generated and bundled `hooks.json` are identical.
- `Task` renamed to `Agent` throughout skills, agents and docs (Claude Code renamed the tool
  in v2.1.63; `Task` still works as an alias).
- Antigravity detection narrowed from `.agents` to `.agents/rules`, so the shared skills
  directory is not mistaken for an Antigravity install.
- Claude Code documentation links updated from `docs.anthropic.com` to `code.claude.com`.
- Minimum Node.js raised to 20; CI matrix is now 20/22/24.

### Internal
- **Removal detection extracted to a pure function.** `detectRemovedFiles()` takes the
  manifest and two filesystem predicates, so the rule that decides what `update` offers to
  delete is testable on its own. It was previously inline in a 700-line interactive command
  with no test touching it — `updateCommand` is still never invoked in the suite.
- **Four command tests were reimplementing the logic they claimed to cover.** `uninstall`,
  `config` and `list` each had a test file that copied the command's loop into itself and
  never imported the module, so they passed whatever the command did — and `uninstall.ts`,
  `config.ts` and `list.ts` reported zero coverage. Replaced by tests against extracted pure
  functions: `planUninstall()`, `resolveConfigSet()` and `describeMarkdown()`. The remaining
  one, `addon.test.ts`, covers ground that `addon-enable-disable.test.ts` already tests for
  real against the module.
- Closed the three coverage gaps that mattered: `detectRemovedFiles` (18 tests, every
  generated-file exclusion pinned), `detectExistingConfigs` (20 tests, 16% → 100%), and the
  `legacySkillDirs` sweep (9 tests). Each guard was mutation-checked: breaking the code it
  protects makes the tests fail.
- **Skill cross-references are now tested** (44 tests). Nothing checked that a router
  delegates to a skill that exists, that `/devtronic-help` indexes every shipped skill and no
  others, or that a renamed skill is never invoked under its old name. All three drifts were
  present; all three are now failures. Mutation-checked in both directions.

### Fixed
- **`devtronic uninstall` no longer deletes `loop.manifest.yaml` without asking.** The bulk
  managed-file sweep protected only `CLAUDE.md` and `AGENTS.md`, so the project's hand-tuned
  convergence policy — gates, phases, DoD — went silently. It now sits alongside them behind
  its own confirmation.
- **`devtronic list` shows each skill's declared description.** It read the first prose
  paragraph after the heading and ignored the `description:` frontmatter field, so the CLI and
  the runtime disagreed about what a skill was for.
- **`devtronic update` no longer offers to delete `AGENTS.md`, `CLAUDE.md` and
  `loop.manifest.yaml`.** Removal detection listed every manifest-tracked file absent from a
  template directory, and those three are generated, not copied. Pre-existing since the
  manifest was introduced; found while reviewing the portable-skill export, which hit the
  same code path.
- Addon skill frontmatter used two keys that do not exist: `user-invokable` (the real field is
  `user-invocable`, and `true` is the default) and `args:` (the real field is `arguments:`,
  and these skills take flags, not named arguments). Both removed.
- **The design routers pointed at skills that do not exist.** Every delegate was written
  `/design:research`, `/design:system-audit` and so on — a `design:` namespace devtronic has
  never shipped. 37 references across 8 skills and 6 agents now name the real skills
  (`/design-research`, `/design-system-audit`, …), and `/design-system --sync` reaches
  `/design-tokens-sync` instead of the name it carried two renames ago.
- **`/devtronic-help` was out of date with the skills it indexes.** It still listed `/recap`,
  removed in this release, and never listed `converge`, `generate-tests`, `briefing`,
  `design-spec` or itself.

---

## [1.4.4] - 2026-07-08

### Fixed
- **Gate `when:` guards are now honored (Bug 3).** A gate's `when:` was declared in the schema
  but never evaluated — `--gate-cmd` emitted *every* objective gate, so a `when: phase:qa` gate
  (e.g. a full Playwright e2e suite) ran on every stop and every inner-loop iteration, not just
  in `qa`. Now `--gate-cmd` selects: baseline gates (no `when`) always; `when: phase:<x>` gates
  only with `--gate-cmd --phase <x>`; `touches:<glob>` gates stay out until a changed-file list
  is wired. The ambient stop-guard (no phase) runs only the light baseline; the loop skill
  passes `--phase <phase>` so heavy phase-gated gates run only in their phase.
- Dry-run now distinguishes baseline gates from conditional ones (`when:` annotated).

### Added
- `devtronic loop --gate-cmd --phase <name>` — include gates guarded by `when: phase:<name>`.
- **Skill preflight version check** — the `loop` skill verifies the CLI is ≥ 1.4.4 (CLI and
  plugin update via different channels) and tells the human to `npm i -g devtronic@latest` on
  a mismatch, so an older CLI doesn't silently ignore `--phase`.

---

## [1.4.3] - 2026-07-08

### Fixed
- **`devtronic loop --gate-cmd` isolates each gate in a subshell.** It previously joined the
  manifest's Tier ① commands with a plain `&&`; since the stop-guard `eval`s the chain from
  the repo root, a `cd` inside one gate leaked into the next (`cd apps/x && … && cd apps/x`
  failed once the first `cd` had moved), breaking the whole gate. Now composed as
  `(gate1) && (gate2) && …` so `cd`-based gates (common in monorepos) work. Composition is a
  single pure helper (`composeGateCommand`) shared by `--gate-cmd` and `--dry-run`.
- **Clearer manifest validation error** — a phase field with the wrong type (e.g. `exit` as an
  array) now reports "must be a non-empty string (got an array)" instead of the misleading
  "missing required".

---

## [1.4.2] - 2026-07-08

### Changed
- **npm README** now documents the Convergence Loop (inner `/loop` + backlog `/loop --backlog`),
  at parity with the repo README, so the npmjs.com page describes the flagship feature.
  Docs-only release (no code changes).

---

## [1.4.1] - 2026-07-08

### Fixed
- **Loop CLI resilience.** The `/loop` skill and the `Stop` hook shell out to `devtronic
  loop …`, but the typical `npx devtronic init` flow leaves no `devtronic` on `PATH` (and
  plugin-marketplace installs don't include the npm CLI), so the loop could fail with
  "command not found". The generated + marketplace `stop-guard.sh` now resolve the CLI
  resiliently (global `devtronic` → `npx --no-install devtronic` → graceful fallback to the
  auto-detected quality command), and the `loop` skill gained a preflight step that resolves
  the CLI (or tells the human to `npm i -g devtronic`). Individual skills were never affected.
- **`init` seeds `.gitignore`** with the loop's transient files (`.loop-worktrees/`,
  `.claude/.loop-owner`) so a loop run never accidentally commits worktrees or the sentinel.
- **`checkpoint.sh` (PreCompact) no longer clobbers a rich `STATE.md`.** It now preserves a
  `STATE.md` written by `/checkpoint` or a human, only writing the minimal auto-state when
  `STATE.md` is absent or was itself an auto-checkpoint.
- **`auto-lint.sh` (PostToolUse) skips non-source edits.** It reads the changed file path and
  only lints JS/TS sources, so editing a README/config no longer triggers a full
  (monorepo-wide) lint pass.

### Notes
- In a monorepo, scope the `Stop` gate by defining `loop.manifest.yaml`'s Tier ① commands
  (e.g. `turbo run typecheck --filter=<app>`) — the manifest is the single source of truth
  and overrides the auto-detected whole-repo default.

---

## [1.4.0] - 2026-07-08

The autonomous convergence loop — inner (per-feature) and outer (backlog-driven), both HITL.

### Added

**Convergence loop (inner, per-feature):**
- **`/loop` skill — autonomous convergence harness.** Reads a per-repo `loop.manifest.yaml` and drives the human/machine "barbell": humans sign the DoD and the ship, the machine converges the middle under gates. Orchestrates phases via `Workflow`/`Task` with barriers, an iteration budget, and adversarial Tier ② fan-out; writes a per-iteration trace to `thoughts/loop/<feature>.trace.md`.
- **`devtronic loop` command** — the deterministic mechanism half: `--validate`, `--dry-run` (pedagogical plan, executes nothing), `--abort`, `--gate-cmd`, and `--own`/`--release` (ownership signal used by the skill).
- **`loop.manifest.yaml`** schema (phases, tiered gates, DoD, ship, budget) with a pure, never-throwing validator. `devtronic init` seeds a fully-commented reference manifest (guarded — never overwrites).
- **Ownership-aware hooks (coexistence).** The `Stop` hook subordinates to an active `owner:machine` phase via a worktree-scoped sentinel (`.claude/.loop-owner`) that self-clears on crash (heartbeat staleness + `SessionStart` sweep); when a manifest is present the Tier ① command is sourced from it. Inert by default — with no manifest and no active loop, every hook behaves exactly as before.
- **Clean-tree guard (FR-7)** — the loop refuses to take ownership over uncommitted human WIP.
- New `yaml` dependency (manifest parsing).

**Loop of loops (outer, backlog-driven, HITL):**
- **`/loop --backlog` — the loop of loops.** Drives a queue of *ready* `/backlog` items (each declaring a `- Spec:` + `- DoD:` bullet) through the convergence loop unattended: each item converges in its own git worktree, then **parks** awaiting the human ship-signature while the loop advances the next (park-ahead). Bounded by a width cap (default 3 in-flight) and a token budget — enforced by the CLI, not just skill prose; a non-converging item is **quarantined** and the run continues (fail-soft).
- **`devtronic loop --backlog`** deterministic spine: `--validate`, `--dry-run`, `--status`, `--sign <item>`, `--abort`, and the per-item run-state commands (`--next`/`--take`/`--park`/`--quarantine`), with a lock-serialized, atomically-written run ledger. Priority derives from the `/backlog` section (High/Medium/Low), FIFO ties.
- `/backlog` items gain an optional `- DoD:` bullet (backward-compatible; enables loop eligibility).
- Per-item worktrees under `.loop-worktrees/` (add to `.gitignore`).

### Changed
- Core skill count 20 → 21 (`/loop` registered in `CORE_SKILLS`).

---

## [1.3.0] - 2026-03-08

### Changed
- **BREAKING**: Claude Code plugin now uses GitHub marketplace (`r-bart/devtronic-plugin`) instead of local `.claude-plugins/` directory
- `npx devtronic init` registers the GitHub marketplace in settings.json instead of generating local plugin files
- `npx devtronic update` migrates existing local plugin and standalone installations to marketplace mode
- `npx devtronic uninstall` cleans up marketplace registration

### Added
- CI job to automatically sync plugin content to marketplace repo on release
- Generic marketplace hook scripts (stop-guard.sh, auto-lint.sh, checkpoint.sh) with auto-detected package manager
- Direct marketplace installation: `/plugin marketplace add r-bart/devtronic-plugin`

### Fixed
- **Documentation audit**: corrected auto-devtronic addon agent count (3 → 4), fixed stale "8 core + 7 design" agent split references, fixed pre-rename skill names in npm README addon table
- **`design-skills.test.ts`**: updated to read from templates directory (source of truth) instead of repo root `.claude/` which no longer contains plugin files

### Removed
- Local plugin generation (`.claude-plugins/` directory no longer created in user projects)
- Local marketplace.json generation

---

## [1.2.6] - 2026-03-07

### Added

- **`/devtronic-help` skill** — in-IDE discovery of all skills, agents, addons, and workflows. 5 modes: default overview, topic search, `--workflows`, `--agents`, `--addons`, `--all`. Scans installed assets dynamically.
- **Post-install "Need Help?" message** — CLI `init` now shows `/devtronic-help` (in IDE) and `npx devtronic list` (from terminal) after installation.
- **`afk-task-validator` addon agent** — validates GitHub issues for AFK-readiness with viability scoring.

### Fixed

- **Legacy settings preventing plugin discovery** — projects installed under previous names (`dev-ai`, `ai-agentic`) had stale entries in `.claude/settings.json` that prevented Claude Code from finding the plugin. `registerPlugin()` now cleans up legacy marketplace and plugin entries automatically.
- **Skill naming collisions** — addon `design-review` → `design-critique`, `design-system` → `design-tokens`, `quality-runner` → `quality-executor` to avoid collision with core skills/agents.
- **Stale `devtronic:` namespace prefix** — removed invalid `devtronic:` prefix from all 34 SKILL.md `name` fields and CORE_SKILLS registry.
- **Stale skill counts in docs** — updated 19 → 20 core skills across README, npm README, docs/skills.md, docs/plugins.md, docs/cli-reference.md, and tutorials.

---

## [1.2.5] - 2026-03-07

### Fixed

- **Deprecation warning was backwards** — `addon add`/`remove` (the canonical commands) incorrectly showed a deprecation warning pointing users to `enable`/`disable` (the deprecated aliases). Now `enable`/`disable` correctly warn and suggest `add`/`remove`.
- **`addon sync` could corrupt plugin-mode installs** — If `orchestration` (plugin-based addon) ended up in `config.installed` via update migration, `sync` would write files to wrong paths. Sync and update now skip plugin-based addons.
- **`removeAddonFiles` deleted `NOTICE.md` unconditionally** — Removing any addon (e.g., `auto-devtronic`) would delete the `NOTICE.md` created by `design-best-practices`, violating Apache 2.0 attribution requirements. Now only deletes it when the addon has an `attribution` field.
- **`detectModifiedAddonFiles` missed opencode and codex runtimes** — Only checked 3 of 5 configured runtimes (`claude`, `cursor`, `gemini`), silently overwriting user modifications in `.opencode/` and `.codex/` directories during sync/update.
- **`generateAddonFiles` silently swallowed conflicts** — Pre-existing skill files with different content were counted as `skipped` instead of reported as `conflicts`, giving users no indication their files were preserved.
- **`readAddonConfig` crashed on corrupted JSON** — A malformed `.claude/devtronic.json` threw an unhandled `SyntaxError`. Now returns safe defaults, consistent with `readManifest`.
- **`addon sync` reported "no addons installed" for legacy installs** — Addons tracked in the plugin manifest but not in `.claude/devtronic.json` were invisible to sync. Now auto-registers file-based addons from the legacy manifest before syncing.
- **`init.ts` used invalid `'overwrite'` sentinel** — Conflict resolution fallback bypassed the `ConflictResolution` type. Replaced with `'replace'`, the actual type member.

### Changed

- `addon add`/`remove` are now the canonical commands; `enable`/`disable` are deprecated aliases
- `addFileBasedAddon` and `addonSyncCommand` now use validated `getAddonManifest()` instead of raw `JSON.parse`
- Updated README addon examples from `enable`/`disable` to `add`/`remove`

---

## [1.2.4] - 2026-03-07

### Fixed

- **`devtronic addon enable` fails with ENOENT on npm-installed packages** — Addon assets (skills, agents, reference docs, `manifest.json`) lived in `src/addons/` which tsup does not copy to `dist/`. They are now in `templates/addons/`, which is already included in the published package. `getAddonSourceDir()` updated to use the same dual-path resolution pattern as `TEMPLATES_DIR`.

---

## [1.2.3] - 2026-03-07

### Fixed

- **Addon multiselect skipped when using `--preset`** — `--preset` only skips the project config analysis prompt; the init session remains interactive (IDE selection, conflict resolution). The addon multiselect now correctly appears when `--preset` is used with Claude Code.

---

## [1.2.2] - 2026-03-07

### Fixed

- **`devtronic update` false "removed files" for plugin installs** — Plugin files (`.claude-plugins/devtronic/`) are generated dynamically and don't exist in the static template directory. The update command was incorrectly marking all of them as "removed in this version". They are now skipped during removal detection since they're always regenerated, not copied from templates.

---

## [1.2.1] - 2026-03-07

Addon UX improvements — `addon list` command and init multiselect for all addons.

### Added

- **`devtronic addon list`** — New subcommand listing all available addons with installed status, description, and type (plugin-mode vs file-mode)
- **Init multiselect** — `devtronic init` now shows a single `p.multiselect` prompt offering all three addons (`orchestration`, `design-best-practices`, `auto-devtronic`) with name and description; replaces the previous separate confirm prompts
- **`promptForAddons()`** — Generic multiselect helper in `prompts/init.ts`, driven by the `ADDONS` registry as single source of truth

### Fixed

- **`addon list` installed state for `orchestration`** — Previously always showed as "available" because its state lives in `.ai-template/manifest.json` (not `devtronic.json`); `getAddonListInfo` now reads both sources

### Updated

- Documentation: `docs/cli-reference.md`, `docs/plugins.md`, `docs/customization.md`, `packages/cli/README.md`, `README.md` — all updated to reflect the new addon UX

---

## [1.2.0] - 2026-03-06

Command system refactor — `devtronic:` namespace, autonomous engineering loop, multi-IDE runtime adapters.

### Added

- **`devtronic:` namespace** — Skills use plain names (`/brief`, `/spec`). Plugin system auto-namespaces as `devtronic:` when installed via `.claude-plugins/`
- **`/devtronic` command** — Main entrypoint for the `auto-devtronic` addon (autonomous engineering loop); distinct from all namespaced skills
- **Per-IDE runtime adapters** — `RUNTIME_SPECS` generates correct skill invocation syntax for claude, gemini, opencode, cursor, codex
- **`devtronic mode` command** — `devtronic mode afk|hitl|show` persists execution mode to `.claude/devtronic.json`
- **`addon enable/disable`** — Canonical replacements for `addon add/remove` (aliases kept for backwards compatibility)
- **`auto-devtronic` addon** — Full autonomous engineering loop: spec → tests → plan → implement → PR, with HITL (default) and AFK modes
- **`validate-task-afk` skill + `afk-task-validator` agent** — Step 0 of the autonomous loop; scores GitHub issues for AFK-readiness before execution
- **Addon system v2** — Multi-agent support (`.claude/`, `.cursor/`, `.gemini/`), `devtronic addon list/sync`, `devtronic.json` config, `NOTICE.md` attribution
- **`design-best-practices` addon** — 5 design skills + 7 reference docs + 1 quality rule
- **`orchestration` addon** — `/briefing`, `/recap`, `/handoff` for context rotation

### Updated

- All documentation updated to reflect plain skill names and new CLI commands
- README: new "Autonomous Engineering Loop" section documenting HITL/AFK modes
- `thoughts/` fully gitignored — AI session documents are internal

---

## [1.1.0] - 2026-03-04

Design phase — full UX/design workflow as first-class skills and agents.

### Added

- **12 design skills**: `/design` (dispatcher), `/design:research`, `/design:define`, `/design:ia`, `/design:wireframe`, `/design:system` (dispatcher), `/design:system-define`, `/design:system-audit`, `/design:system-sync`, `/design:audit`, `/design:review`, `/design:spec`
- **7 design agents**: `ux-researcher`, `ia-architect`, `design-critic`, `a11y-auditor`, `design-token-extractor`, `design-system-guardian`, `visual-qa`
- **Design-first workflow**: `research → define → ia → wireframe → design:system → spec → create-plan → execute-plan → design:review`
- Design artifacts persist in `thoughts/design/` across sessions
- Design phase documentation: `docs/design-phase.md`, `docs/tutorials/07-design-workflow.md`

### Updated

- `/briefing` skill: scans `thoughts/design/` and asks design context questions
- `/recap` skill: includes design artifact status in session summaries
- `/handoff` skill: captures design phase state in STATE.md
- `docs/philosophy.md`: design as high-leverage stage in Error Impact diagram
- `docs/tutorials/03-feature-workflow.md`: "Feature with Design" workflow variant

---

## [1.0.0] - 2026-03-01

First public release.

### Added
- `devtronic init` command: analyzes project and generates personalized AI configuration
- `devtronic update` command: updates templates while preserving local modifications
- `devtronic add <ide>` command: add IDE configurations after initial setup
- `devtronic addon add/remove <name>` commands: manage optional skill packs post-init
- `devtronic regenerate` command: regenerate configuration files from current stack
- `devtronic status` command: show installation status and tracked files
- `devtronic diff` command: show differences between local files and template
- `devtronic info` command: version, IDEs, mode, skill/agent counts, framework, architecture
- `devtronic list [skills|agents]` command: discover installed skills and agents
- `devtronic config` / `config set` / `config reset` commands: view and manage configuration
- `devtronic doctor [--fix]` command: 8 health checks, 3 auto-fixable
- `devtronic presets` command: list available presets
- `devtronic uninstall` command: remove all installed files
- IDE support: Claude Code, Cursor, OpenCode, Antigravity, GitHub Copilot
- Orchestration addon: `/briefing`, `/recap`, `/handoff` skills for context rotation
- 19 workflow skills and 8 specialized agents for Claude Code
- Architecture rules generated per detected stack (clean, MVC, feature-based, layered, flat)
- Plugin mode for Claude Code: skills registered as native slash commands
- Manifest system: checksum-based change detection across updates
- `thoughts/` directory structure for AI session documents

---

## Pre-1.0.0

Prior versions (up to 1.9.0) were internal pre-releases under different names:
- Originally forked from [ai-agentic-architecture](https://github.com/nicobistolfi/ai-agentic-architecture)
- Rebranded from `@tutellus/agentic-architecture` to `devtronic`
- All pre-release history is preserved in git but not documented here
