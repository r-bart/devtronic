# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
