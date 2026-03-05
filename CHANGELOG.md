# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Addon system with multi-agent support (`.claude/`, `.cursor/`, `.gemini/`)
- `devtronic addon list` — list available and installed addons
- `devtronic addon sync` — regenerate addon files for current agent config
- `design-best-practices` addon: 5 design skills + 7 reference docs + 1 quality rule
- Design skills: `/design-init`, `/design-review`, `/design-refine`, `/design-system`, `/design-harden`
- `devtronic.json` config file for addon tracking
- `NOTICE.md` global attribution file for licensed addon content

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
