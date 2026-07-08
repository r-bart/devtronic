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
| `loop [--dry-run]` | Convergence loop (inner) — validate/preview `loop.manifest.yaml` |
| `loop --backlog` | Loop of loops (outer) — drive the `/backlog` queue unattended |
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

## The Convergence Loop

The skills work **individually** — but the **convergence loop** is the upgrade: keep a human
only at the two ends (sign the **DoD** up front, the **ship** at the back) and let the machine
converge everything in between under gates (the *barbell*).

- **Inner loop (`/loop`)** — one feature: `/spec` → `/generate-tests` (you sign the DoD) →
  `/loop <feature>` converges under Tier ① gates + adversarial Tier ② review, bounded by a
  budget, and **stops at the ship** for your sign-off. Driven by a commented `loop.manifest.yaml`
  (seeded by `init`); preview with `devtronic loop --dry-run`.
- **Outer loop (`/loop --backlog`)** — the *loop of loops*: point it at your `/backlog` (items
  with `- Spec:` + `- DoD:`), walk away, and return to a queue of converged features ready to
  sign — each in its own worktree, bounded by a width cap + token budget, fail-soft.

> Requires the CLI on your PATH (`npm i -g devtronic`) — the skill/hooks shell out to
> `devtronic loop …`. Inert by default: with no manifest, hooks behave exactly as before.

See the [full docs](https://github.com/r-bart/devtronic/blob/main/docs/cli-reference.md).

## What Gets Generated

- **AGENTS.md** — Universal AI context personalized to your stack
- **Architecture rules** — IDE-specific format (`.claude/rules/`, `.cursor/rules/`, etc.)
- **Skills** (21 core + 12 design + 9 addon) — Reusable workflows (`/brief`, `/spec`, `/create-plan`, `/loop`, `/summary`, `/audit`, `/devtronic-help`, etc.)
- **Agents** (15 + 4 addon) — Specialized subagents (code-reviewer, quality-runner, etc.)
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
| `design-best-practices` | `design-init`, `design-critique`, `design-refine`, `design-tokens`, `design-harden` | Frontend design quality: typography, color, layout, accessibility, motion, UX writing |
| `auto-devtronic` | `auto-devtronic` (`/devtronic --validate` for AFK-readiness scoring) | Autonomous engineering loop — takes a GitHub issue, runs spec → tests → plan → implement → PR, self-corrects via failing tests |

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
