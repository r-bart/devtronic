# devtronic

A universal template for AI-assisted development. Works with **Claude Code**, **Cursor**, **Google Antigravity**, and **GitHub Copilot**.

## Documentation

| Document | Description |
|----------|-------------|
| [Tutorials](./docs/tutorials/) | Step-by-step guides for common use cases |
| [Skills Reference](./docs/skills.md) | Detailed documentation of all 19 skills |
| [Agents Reference](./docs/agents.md) | Detailed documentation of all 8 agents |
| [Plugin Mode](./docs/plugins.md) | Claude Code plugin architecture, hooks, and migration |
| [CLI Reference](./docs/cli-reference.md) | Full command documentation |
| [Existing Projects](./docs/existing-projects.md) | Integration with existing configurations |
| [Customization](./docs/customization.md) | How to customize rules, skills, agents |
| [Philosophy](./docs/philosophy.md) | Why this workflow works |
| [Worktrees Guide](./docs/worktrees.md) | Parallel Claude sessions |
| [Multi-Account Setup](./docs/multi-account-setup.md) | Multiple Claude Code accounts |

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
3. **Generate** personalized rules based on your stack
4. **Track** installation for future updates

### Option B: npm Plugin (Claude Code Only)

```bash
npm install devtronic-marketplace --save-dev
```

Then add to `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "devtronic-local": {
      "source": { "source": "directory", "path": "./node_modules/devtronic-marketplace" }
    }
  },
  "enabledPlugins": { "devtronic@devtronic-local": true }
}
```

This installs just the plugin (skills, agents, hooks) without generating project-specific rules. See [Plugin Mode](./docs/plugins.md) for details.

### Option C: Claude Code Skill

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
| Google Antigravity | `.agent/rules/*.md` | Full support |
| GitHub Copilot | `.github/copilot-instructions.md` | Full support |
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
│       ├── Skills    Reusable workflows (/devtronic:spec, etc.)    │
│       │             19 skills included                          │
│       │                                                         │
│       ├── Agents    Specialized subagents (quality, review)    │
│       │             8 agents included                           │
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
/brief [topic]        →  Orientation + pre-flight checks
        │
/spec [idea]          →  Define WHAT to build (PRD)
        │
/research --deep      →  Understand HOW code works
        │
/create-plan [feature] →  Design implementation phases
        │
[implement]           →  Code task by task
        │
/summary              →  Document what changed and why
        │
/post-review          →  Final quality check
```

Human review at earlier stages has higher leverage. See [Philosophy](./docs/philosophy.md) for details.

---

## What's Included

### Skills (19)

| Category | Skills |
|----------|--------|
| **Orientation & Research** | `/brief`, `/research`, `/opensrc` |
| **Planning** | `/spec`, `/create-plan` |
| **Development** | `/scaffold`, `/setup`, `/investigate`, `/worktree` |
| **Execution** | `/quick`, `/execute-plan` |
| **Quality & Review** | `/audit`, `/post-review`, `/generate-tests` |
| **Session & Meta** | `/checkpoint`, `/summary`, `/backlog`, `/learn`, `/create-skill` |

See [Skills Reference](./docs/skills.md) for detailed documentation of each skill.

### Agents (8)

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
│       ├── skills/                     # 19 skills (/devtronic:brief, etc.)
│       ├── agents/                     # 8 agents
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
| `regenerate` | Regenerate files |
| `status` | Show installation status |
| `diff` | Show differences with template |
| `info` | Version, config, and install summary |
| `list [skills\|agents]` | List installed skills and agents |
| `config` | View or manage project configuration |
| `doctor [--fix]` | Run health diagnostics |

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

## License

MIT - Use and adapt freely for your projects.
