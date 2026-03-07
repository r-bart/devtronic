# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
