# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Orchestration workflow addon: `/briefing`, `/recap`, `/handoff` skills
- Enhanced `/execute-plan` with visual progress and inter-wave handoff summaries
- Addon system: `enabledAddons` in ProjectConfig, selectable during `devtronic init`
- `getSubdirectories()` utility for directory listing

---

## [1.0.0] - 2026-02-27

First public open-source release. Version reset from internal pre-release (1.9.0).

### Added
- `devtronic info` command: version with npm update check, IDEs, mode, skill/agent counts, framework, architecture
- `devtronic list [skills|agents]` command: discover and display installed skills and agents with descriptions
- `devtronic config` command: view current configuration
- `devtronic config set <key> <value>` command: modify individual config values
- `devtronic config reset` command: re-detect configuration from project analysis
- `devtronic doctor [--fix]` command: 8 health checks with 3 auto-fixable (permissions, plugin registration, thoughts dir)
- Shared `utils/ui.ts`: ASCII logo, standardized symbols, `introTitle()`, `formatKV()`, `formatList()`
- Shared `utils/version.ts`: `getCliVersion()`, `getLatestVersion()`, `compareSemver()`
- Version update check in `status` and `info` commands (non-blocking npm registry query)
- Package READMEs for npm registry pages

### Changed
- **Version reset to 1.0.0** for open-source launch (both `devtronic` and `devtronic-marketplace`)
- All commands now use consistent shadcn-style UI via `@clack/prompts`
- Branded ASCII art banner on bare `devtronic` invocation
- All inline `console.log` replaced with `p.intro()`, `p.note()`, `p.outro()` blocks
- All inline chalk symbols replaced with shared `symbols.*` constants
- `showPreview()` in `init` rewritten to use structured `p.note()` blocks
- Centralized `getCliVersion()` (was duplicated in 3 files)
- Centralized `TEMPLATES_DIR` (was duplicated in `update.ts` and `diff.ts`)
- Update available message now shows correct upgrade command (`npx devtronic@latest init`)

### Fixed
- `update.ts` and `diff.ts` now use `IDE_TEMPLATE_MAP` for template directory lookup
- `config.ts` array fields use optional chaining to prevent crashes on legacy manifests
- `doctor.ts` hook path resolution correctly strips `${CLAUDE_PLUGIN_ROOT}/` shell variables
- `version.ts` `compareSemver` handles pre-release suffixes safely via `parseInt`
- `list.ts` `extractDescription` strips markdown formatting (bold, italic, code, links)

### Removed
- Duplicate `getCliVersion()` functions from `init.ts`, `update.ts`, and `index.ts`
- Duplicate `TEMPLATES_DIR` resolution from `update.ts` and `diff.ts`
- Dead outer try/catch in `getCliVersion()`

---

## Pre-1.0.0

Prior versions (up to 1.9.0) were internal pre-releases under different names:
- Originally forked from [ai-agentic-architecture](https://github.com/nicobistolfi/ai-agentic-architecture)
- Rebranded from `@tutellus/agentic-architecture` to `devtronic`
- All pre-release history is preserved in git but not documented here
