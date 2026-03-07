[![CI](https://github.com/r-bart/devtronic/actions/workflows/ci.yml/badge.svg)](https://github.com/r-bart/devtronic/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/devtronic)](https://www.npmjs.com/package/devtronic)
[![npm downloads](https://img.shields.io/npm/dm/devtronic)](https://www.npmjs.com/package/devtronic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# devtronic

**Exponential development workflow — toolkit composed by skills, agents, and architecture rules for Claude Code, Cursor, Copilot and more.**

We're in a new paradigm. AI agents can write code — but they need structure to do it well. Without clear patterns, quality gates, and workflow guidance, you end up reviewing, correcting, and redoing the work you delegated.

**The developer's job is to define the system, focus on the problem to solve, and own the experience.** The AI's job is to execute. This creates a perfect division of responsibilities — each actor focused on where they add the most value — and that's where the exponential development starts.

devtronic is that structure. A toolkit composed by skills, agents, quality gates, and self-improving rules — tailored to your stack. Refined daily across real projects, personal and enterprise.

Not a silver bullet. A starting point built from experience, open to iteration.

Works with **Claude Code**, **Cursor**, **Google Antigravity**, **GitHub Copilot**, and **OpenCode**.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Tutorials](./docs/tutorials/) | Step-by-step guides for common use cases |
| [Skills Reference](./docs/skills.md) | Detailed documentation of all 20 core + 12 design phase + 9 addon skills |
| [Agents Reference](./docs/agents.md) | Detailed documentation of all 15 core agents + 3 auto-devtronic addon agents |
| [Plugin Mode](./docs/plugins.md) | Claude Code plugin architecture, hooks, and migration |
| [CLI Reference](./docs/cli-reference.md) | Full command documentation |
| [Existing Projects](./docs/existing-projects.md) | Integration with existing configurations |
| [Customization](./docs/customization.md) | How to customize rules, skills, agents |
| [Philosophy](./docs/philosophy.md) | Why this workflow works |
| [Worktrees Guide](./docs/worktrees.md) | Parallel Claude sessions |
| [Design Phase Guide](./docs/design-phase.md) | Design phase skills, agents, and workflow |
| [Multi-Account Setup](./docs/multi-account-setup.md) | Multiple Claude Code accounts |
| [auto-devtronic Addon](./docs/auto-devtronic-addon.md) | Autonomous engineering loop addon |

---

## Quick Start

### Option A: CLI (Recommended)

```bash
# Run in your project directory
npx devtronic init

# Or specify a target directory
npx devtronic init /path/to/your/project
```

The CLI will:
1. **Analyze** your project (framework, architecture, stack)
2. **Ask** to confirm or adjust the detected configuration
3. **Select** which IDEs to configure
4. **Offer** optional addon packs via multiselect (Claude Code)
5. **Generate** personalized rules, skills, agents, and hooks
6. **Track** installation for future updates

### Option B: Claude Code Skill

```
/setup      # For existing projects
/scaffold   # For new projects from scratch
```

Same functionality through conversation. Use `/scaffold` to create new projects with guided architecture selection (frontend, spa-ddd, backend, monorepo).

### Update Later

```bash
npx devtronic update        # Apply updates
npx devtronic update --check # Check for updates
```

### Local Development (before npm publish)

If the package isn't published to npm yet, you can use it locally:

```bash
# 1. Clone and build
git clone https://github.com/r-bart/devtronic.git
cd devtronic/packages/cli
npm install && npm run build
npm link

# 2. Use in any project
cd /path/to/your/project
npx devtronic init
```

---

## IDE Compatibility

| IDE | Config Location | Status |
|-----|-----------------|--------|
| Claude Code | `.claude-plugins/devtronic/` + `.claude/rules/` | Full support ([plugin mode](./docs/plugins.md)) |
| Cursor | `.cursor/rules/*.mdc` | Full support |
| Google Antigravity | `.agents/rules/*.md` | Full support |
| GitHub Copilot | `.github/copilot-instructions.md` | Full support (enable in [GitHub settings](https://docs.github.com/copilot/customizing-copilot)) |
| OpenCode | `.opencode/rules/*.md` | Full support |
| Zed | Uses `AGENTS.md` directly | Native |

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI ARCHITECTURE LAYERS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AGENTS.md        Universal context for all AI agents           │
│       │                                                         │
│       ├── Skills    Reusable workflows (/spec, etc.)              │
│       │             20 core + 12 design phase + 9 addon         │
│       │                                                         │
│       ├── Agents    Specialized subagents (quality, review)    │
│       │             15 agents included                          │
│       │                                                         │
│       ├── Rules     Quality standards (IDE-specific format)    │
│       │                                                         │
│       └── Hooks     Automated workflow (lint, checkpoint, etc.) │
│                     5 hooks included (Claude Code)              │
│                                                                 │
│  thoughts/          Persistent documents (specs, plans, etc.)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Workflow

```
/brief [topic]              →  Orientation + pre-flight checks
        │
[ /design phase ]      →  (optional) UX discovery → wireframes → design system
        │                  See Design Phase Guide ↗
/spec [idea]                →  Define WHAT to build (PRD)
        │
/create-plan [feature]      →  Design implementation phases
        │
/generate-tests             →  Encode acceptance criteria as failing tests
        │
/execute-plan               →  Implement in parallel phases
        │
[ /design-review ]          →  (optional) QA vs wireframes + design system
        │
/summary                    →  Document what changed and why
        │
/post-review                →  Final quality check
```

Human review at earlier stages has higher leverage. See [Philosophy](./docs/philosophy.md) for details.

For UI-heavy features, run the design phase before `/spec`. See [Design Phase Guide](./docs/design-phase.md) for the full UX workflow.

---

## What's Included

### Skills (20 core + 12 design phase + 9 addon)

| Category | Skills |
|----------|--------|
| **Orientation & Research** | `/brief`, `/research`, `/opensrc` |
| **Planning** | `/spec`, `/create-plan` |
| **Development** | `/scaffold`, `/setup`, `/investigate`, `/worktree` |
| **Execution** | `/quick`, `/execute-plan` |
| **Quality & Review** | `/audit`, `/post-review`, `/generate-tests` |
| **Session & Meta** | `/checkpoint`, `/summary`, `/backlog`, `/learn`, `/create-skill`, `/devtronic-help` |
| **Design Phase** | `/design`, `/design-research`, `/design-define`, `/design-ia`, `/design-wireframe`, `/design-system`, `/design-system-define`, `/design-system-audit`, `/design-system-sync`, `/design-audit`, `/design-review`, `/design-spec` |
| **Orchestration** (addon) | `/briefing`, `/recap`, `/handoff` |
| **Design Best Practices** (addon) | `/design-init`, `/design-critique`, `/design-refine`, `/design-tokens`, `/design-harden` |
| **Auto-devtronic** (addon) | `/devtronic` — Autonomous engineering loop |

See [Skills Reference](./docs/skills.md) for detailed documentation of each skill.

### Autonomous Engineering Loop (`/devtronic`)

The `auto-devtronic` addon runs the full pipeline autonomously — spec → tests → plan → implement → PR — and self-corrects via failing tests.

```bash
npx devtronic addon add auto-devtronic

/devtronic https://github.com/org/repo/issues/42   # HITL mode (default, human gates)
/devtronic <issue> --afk                           # AFK mode (fully autonomous)
/devtronic <issue> --afk --validate                # Validate task first, then run
```

**Two modes:**

| Mode | Flag | Human gates |
|------|------|-------------|
| **HITL** | `--hitl` (default) | Pauses at spec, tests, each retry, and PR |
| **AFK** | `--afk` | Fully autonomous, no interruptions |

Set the default mode project-wide:

```bash
npx devtronic mode afk    # set AFK as default
npx devtronic mode hitl   # set HITL as default
npx devtronic mode show   # show current mode
```

See [auto-devtronic Addon](./docs/auto-devtronic-addon.md) for full documentation.

### Agents (15)

| Agent | Model | Purpose |
|-------|-------|---------|
| error-investigator | haiku | Quick automatic error diagnosis |
| code-reviewer | sonnet | Thorough PR review |
| architecture-checker | sonnet | Validate Clean Architecture compliance |
| quality-runner | haiku | Run tests, typecheck, and lint |
| commit-changes | haiku | Atomic conventional commits |
| test-generator | sonnet | Generate unit tests following project patterns |
| dependency-checker | haiku | Audit dependencies for vulnerabilities and issues |
| doc-sync | haiku | Verify docs match the actual codebase |
| ux-researcher | sonnet | Synthesize research, personas, user journeys |
| ia-architect | sonnet | Navigation structure, user flows, sitemaps |
| design-critic | sonnet | Nielsen's 10 heuristics evaluation |
| a11y-auditor | haiku | WCAG 2.1 AA accessibility compliance |
| design-token-extractor | haiku | Extract and normalize design tokens |
| design-system-guardian | haiku | Detect design system drift (read-only) |
| visual-qa | sonnet | Compare implementation vs design specs |

See [Agents Reference](./docs/agents.md) for detailed documentation of each agent.

---

## Directory Structure

After setup, your project will have:

```
your-project/
├── AGENTS.md                           # Universal AI context (customize this!)
├── CLAUDE.md                           # Claude Code project rules
│
├── .claude/                            # Claude Code configuration
│   ├── rules/                          # Auto-applied architecture rules
│   └── settings.json                   # Plugin registration
│
├── .claude-plugins/                    # Plugin (Claude Code only)
│   ├── .claude-plugin/marketplace.json
│   └── devtronic/                         # ← the plugin
│       ├── skills/                     # 35+ skills (/brief, /devtronic-help, etc.)
│       ├── agents/                     # 15 agents
│       ├── hooks/hooks.json            # 5 workflow hooks
│       └── scripts/checkpoint.sh
│
├── .cursor/rules/                      # Cursor rules (if selected)
├── .agent/rules/                       # Antigravity rules (if selected)
│
├── .ai-template/                       # Installation manifest
│   └── manifest.json
│
└── thoughts/                           # AI working documents
    ├── specs/                          # PRDs from /spec
    ├── research/                       # Research from /research
    ├── plans/                          # Plans from /create-plan
    ├── summaries/                      # Change summaries from /summary
    ├── checkpoints/                    # Auto-checkpoints before compaction
    ├── notes/                          # Project notes
    ├── debug/                          # Debug analysis
    ├── audit/                          # Audit reports from /audit
    ├── design/                         # Design artifacts (research, wireframes, tokens...)
    └── archive/                        # Archived items
```

See [Plugin Mode](./docs/plugins.md) for the full architecture and how hooks work.

---

## Existing Projects

The CLI is designed for projects that already have AI configuration. When conflicts are detected, you choose:

- **Merge** - Add new sections, keep existing customizations
- **Keep** - Skip files that already exist
- **Replace** - Overwrite with template files

See [Existing Projects Guide](./docs/existing-projects.md) for detailed integration instructions.

---

## Key Concepts

### Baby Step Principle

Every task should leave the codebase working:
- Tests green, lint clean, types valid after EVERY task
- If a task is too large, break it into smaller subtasks

### Self-Improving CLAUDE.md

After any correction:
```
"Update CLAUDE.md so you don't make that mistake again."
```

Claude is good at writing rules for itself.

### Parallel Sessions

Run 3-5 Claude sessions simultaneously using git worktrees. See [Worktrees Guide](./docs/worktrees.md).

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `init [path]` | Initialize in a project |
| `update` | Update to latest template |
| `add <ide>` | Add another IDE |
| `addon add <name>` | Add an optional skill pack |
| `addon remove <name>` | Remove an optional skill pack |
| `addon list` | List available and installed addons |
| `addon sync` | Regenerate addon files for current agent config |
| `regenerate` | Regenerate files |
| `status` | Show installation status |
| `diff` | Show differences with template |
| `info` | Version, config, and install summary |
| `list [skills\|agents]` | List installed skills and agents |
| `config` | View or manage project configuration |
| `doctor [--fix]` | Run health diagnostics |
| `uninstall` | Remove devtronic from your project |

See [CLI Reference](./docs/cli-reference.md) for full documentation.

---

## References

### Official Documentation

- [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code)
- [Cursor Rules](https://docs.cursor.com/context/rules)
- [Google Antigravity](https://antigravity.google/)
- [GitHub Copilot Instructions](https://docs.github.com/copilot/customizing-copilot)

### Standards

- [AGENTS.md Standard](https://www.aihero.dev/a-complete-guide-to-agents-md)
- [amplified.dev](https://amplified.dev/)

---

## Contributing

devtronic is designed to be **extended, not forked**.

Before opening a PR, consider whether your contribution can be packaged as:
- A **custom skill** (`.claude/skills/`) — for new workflows
- A **custom agent** (`.claude/agents/`) — for specialized automation
- A **plugin** — for distributing skills + agents + hooks as a package

PRs are welcome for:
- Bug fixes and correctness improvements
- Structural or architectural enhancements
- Documentation improvements
- CI/tooling improvements

For feature ideas that extend functionality, we strongly encourage publishing them as **standalone skills or plugins** that others can install. This keeps the core lean and the ecosystem modular.

See [Customization](./docs/customization.md) for how to create skills, agents, and plugins.

---

## License

MIT - Use and adapt freely for your projects.
