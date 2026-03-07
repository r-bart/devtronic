# devtronic

CLI for setting up AI-assisted development in your projects. Works with **Claude Code**, **Cursor**, **Google Antigravity**, **GitHub Copilot**, and **OpenCode**.

## Quick Start

```bash
npx devtronic init
```

The CLI analyzes your project (framework, architecture, stack) and generates personalized AI configuration — rules, skills, agents, and hooks.

## Commands

| Command | Description |
|---------|-------------|
| `init [path]` | Initialize in a project |
| `update` | Update to latest template |
| `info` | Version, config, and install summary |
| `doctor [--fix]` | Run health diagnostics |
| `list [skills\|agents]` | List installed skills and agents |
| `config` | View or manage project configuration |
| `addon add <name>` | Add an addon skill pack |
| `addon remove <name>` | Remove an addon skill pack |
| `addon list` | List available and installed addons |
| `addon sync` | Regenerate addon files for current agents |
| `add <ide>` | Add another IDE |
| `regenerate` | Regenerate files |
| `status` | Show installation status |
| `diff` | Show differences with template |
| `uninstall` | Remove devtronic from your project |
| `presets` | List available presets |

## What Gets Generated

- **AGENTS.md** — Universal AI context personalized to your stack
- **Architecture rules** — IDE-specific format (`.claude/rules/`, `.cursor/rules/`, etc.)
- **Skills** (19 core + 12 design + 9 addon) — Reusable workflows (`/brief`, `/spec`, `/create-plan`, `/summary`, `/audit`, etc.)
- **Agents** (15 + 3 addon) — Specialized subagents (code-reviewer, quality-runner, etc.)
- **Hooks** (5) — Automated workflow (lint-on-save, checkpoint, etc.)
- **thoughts/** — Structured directory for AI working documents

## Addons

Three optional addon packs extend the core toolkit. Select them during `init` or manage them at any time:

```bash
npx devtronic addon list                        # See available addons and status
npx devtronic addon add orchestration           # Install
npx devtronic addon add design-best-practices
npx devtronic addon add auto-devtronic
npx devtronic addon remove <name>               # Uninstall
```

| Addon | Skills | Description |
|-------|--------|-------------|
| `orchestration` | `briefing`, `recap`, `handoff` | Pre-planning alignment, session recaps, context rotation for multi-session work |
| `design-best-practices` | `design-init`, `design-review`, `design-refine`, `design-system`, `design-harden` | Frontend design quality: typography, color, layout, accessibility, motion, UX writing |
| `auto-devtronic` | `auto-devtronic`, `validate-task-afk` | Autonomous engineering loop — takes a GitHub issue, runs spec → tests → plan → implement → PR, self-corrects via failing tests |

During `npx devtronic init` (Claude Code only), a multiselect prompt lets you enable any combination of addons upfront.

## Supported IDEs

| IDE | Config Format | Features |
|-----|--------------|----------|
| Claude Code | `.claude/rules/*.md` + plugin | Full (skills, agents, hooks, rules) |
| Cursor | `.cursor/rules/*.mdc` | Rules + AGENTS.md |
| Google Antigravity | `.agents/rules/*.md` | Rules + AGENTS.md |
| GitHub Copilot | `.github/copilot-instructions.md` | Rules |
| OpenCode | `.opencode/rules/*.md` | Rules + AGENTS.md |

## Requirements

- Node.js >= 18.0.0

## Documentation

Full documentation at [github.com/r-bart/devtronic](https://github.com/r-bart/devtronic).

## License

MIT
