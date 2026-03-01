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
| `add <ide>` | Add another IDE |
| `regenerate` | Regenerate files |
| `status` | Show installation status |
| `diff` | Show differences with template |
| `uninstall` | Remove devtronic from your project |
| `presets` | List available presets |

## What Gets Generated

- **AGENTS.md** — Universal AI context personalized to your stack
- **Architecture rules** — IDE-specific format (`.claude/rules/`, `.cursor/rules/`, etc.)
- **Skills** (19) — Reusable workflows (`/brief`, `/spec`, `/create-plan`, `/summary`, `/audit`, etc.)
- **Agents** (8) — Specialized subagents (code-reviewer, quality-runner, etc.)
- **Hooks** (5) — Automated workflow (lint-on-save, checkpoint, etc.)
- **thoughts/** — Structured directory for AI working documents

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
