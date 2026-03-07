# Customization Guide

How to customize devtronic for your project.

---

## AGENTS.md / CLAUDE.md

`AGENTS.md` is the universal AI context file. Claude Code uses `CLAUDE.md`, which is a symlink to `AGENTS.md`.

### Recommended Structure

```markdown
# AI Agents Guide

## Quick Start
[Brief description and essential commands]

## Commands
[Common commands for development]

## Critical Rules
[Non-negotiable rules the AI must follow]

## Architecture
[Key patterns and decisions]

## Project-Specific
[Anything unique to your project]
```

### What to Include

**Do include:**
- Commands Claude can't deduce from code (special flags, env vars)
- Non-obvious architectural decisions
- Project-specific conventions not in linting
- Known gotchas and how to avoid them
- Sensitive operations that need human approval

**Don't include:**
- Things obvious from the code (standard patterns)
- Generic best practices Claude already knows
- Duplicate information from docs
- Overly verbose explanations

### Self-Improvement Pattern

After any correction, tell Claude:

```
"Update CLAUDE.md so you don't make that mistake again."
```

Claude is good at writing rules for itself. Common additions:
- "Don't use X pattern, use Y instead"
- "Always check Z before modifying W"
- "This file requires special handling because..."

---

## Custom Rules

Rules are auto-applied guidelines. Format varies by IDE.

### Claude Code Rules

Location: `.claude/rules/*.md`

```yaml
---
alwaysApply: true
---

# My Rule

Instructions here...
```

**Frontmatter options:**
| Field | Description |
|-------|-------------|
| `alwaysApply` | Always apply this rule (default: false) |
| `paths` | Apply only to files matching these globs |

**Path-specific rule example:**
```yaml
---
paths:
  - "src/api/**/*.ts"
---

# API Layer Rules

When working in the API layer:
- Always validate input with Zod
- Return consistent error responses
- Log all errors
```

### Cursor Rules

Location: `.cursor/rules/*.mdc`

```yaml
---
description: What this rule does
alwaysApply: true
globs: "src/**/*.ts"
---

# My Rule

Instructions here...
```

**MDC (Markdown Components) format** - Cursor's extension of Markdown.

### Google Antigravity Rules

Location: `.agent/rules/*.md`

```markdown
# My Rule

Instructions here...
```

Antigravity uses plain Markdown without frontmatter in the `.agent/rules/` directory.

---

## Custom Skills

Skills are invocable workflows. Create yours in `.claude/skills/`.

**Quick way**: Use `/create-skill` for guided skill creation through conversation.

**Manual way**: Create the file directly following the structure below.

### Basic Structure

```markdown
---
name: my-skill
description: Brief description shown in help
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash
---

# My Skill

## When to Use

[Describe when to invoke this skill]

## Process

[Step-by-step workflow]

## Output Format

[Expected output structure]

## Tips

[Usage tips]
```

### Frontmatter Options

| Field | Description |
|-------|-------------|
| `name` | Skill name (used as `/command`) |
| `description` | Brief description for help |
| `disable-model-invocation` | Prevent recursive model calls |
| `allowed-tools` | Tools the skill can use |
| `command` | Override the slash command |

### Common Tool Sets

```yaml
# Read-only analysis
allowed-tools: Read, Grep, Glob

# Can modify files
allowed-tools: Read, Grep, Glob, Bash, Edit, Write

# Full access
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, WebFetch
```

### Example: Custom Deploy Skill

```markdown
---
name: deploy
description: Deploy to staging or production environment
disable-model-invocation: true
allowed-tools: Bash, Read
---

# Deploy

Deploy the application to staging or production.

## Usage

```
/deploy staging   # Deploy to staging
/deploy prod      # Deploy to production (requires confirmation)
```

## Process

1. Verify clean git status
2. Run tests
3. Build application
4. Execute deployment command
5. Verify deployment health

## Commands

```bash
# Staging
npm run deploy:staging

# Production (requires DEPLOY_KEY)
npm run deploy:prod
```

## Verification

After deployment, check:
- [ ] Health endpoint returns 200
- [ ] No errors in logs
- [ ] Key features working
```

---

## Custom Agents

Agents are specialized subagents invoked via the Task tool.

### Basic Structure

```markdown
---
name: my-agent
description: What this agent does
tools: Bash, Read, Grep, Glob
model: haiku
---

You are a [role] specialist for this project.

## When to Invoke

Claude should invoke you when:
- [condition 1]
- [condition 2]

## Process

1. [Step 1]
2. [Step 2]

## Output Format

[Define expected output]
```

### Model Selection

| Model | Use For | Cost |
|-------|---------|------|
| haiku | Fast, simple tasks | Low |
| sonnet | Complex reasoning | Medium |
| opus | Deep analysis | High |

Choose the cheapest model that can do the job.

### Example: Custom Lint Agent

```markdown
---
name: lint-runner
description: Run linting and report issues concisely
tools: Bash, Read
model: haiku
---

You are a code quality specialist.

## When to Invoke

Claude should invoke you after code modifications to catch style issues early.

## Process

1. Run the lint command
2. If no errors: Report success briefly
3. If errors: List issues with file:line and suggested fixes

## Commands

```bash
npm run lint
npm run lint:fix  # Auto-fix
```

## Output Format

**Success:**
```
Lint passed - no issues
```

**Issues:**
```
LINT ISSUES:

1. [file:line]
   Rule: [rule name]
   Issue: [description]
   Fix: [suggestion or "auto-fixable"]
```

Focus on actionable information. Group by file when multiple issues.
```

---

## Directory Structure Customization

### thoughts/ Directory

Default structure:
```
thoughts/
├── specs/          # PRDs from /spec
├── research/       # Research from /research
├── plans/          # Plans from /create-plan
├── checkpoints/    # Session checkpoints
├── notes/          # Project notes
├── debug/          # Debug analysis
├── audit/          # Audit reports from /audit
└── archive/        # Archived items
```

**Customize by:**
- Adding subdirectories for your workflow
- Modifying skill templates to use different paths
- Creating project-specific note categories

### .claude/ Directory

```
.claude/
├── skills/         # Workflow skills
├── agents/         # Specialized agents
├── rules/          # Auto-applied rules
└── settings.local.json  # Local settings (gitignored)
```

---

## IDE-Specific Customization

### GitHub Copilot

Single file: `.github/copilot-instructions.md`

```markdown
# Copilot Instructions

## Project Context
[Brief project description]

## Coding Standards
[Key conventions]

## Architecture
[Important patterns]
```

### Zed

Zed uses `AGENTS.md` directly - no additional configuration needed.

---

## Configuration Patterns

### Environment-Specific Rules

```yaml
---
paths:
  - ".env*"
  - "config/**"
---

# Environment Configuration

- Never commit secrets
- Use environment variables for all sensitive data
- Document all required env vars in .env.example
```

### Component-Specific Rules

```yaml
---
paths:
  - "src/components/**/*.tsx"
---

# Component Rules

- Use function components with hooks
- Props interface named `[ComponentName]Props`
- Export both named and default
- Co-locate styles and tests
```

### Test-Specific Rules

```yaml
---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# Test Rules

- Use describe/it blocks
- One assertion concept per test
- Use factories for test data
- Mock external dependencies
```

---

## Customizing Addons

devtronic ships three optional addon packs. You can select them during `init` or manage them at any time with the `addon` command.

### Available Addons

| Addon | Type | Skills | Description |
|-------|------|--------|-------------|
| `orchestration` | Plugin-mode | `briefing`, `recap`, `handoff` | Pre-planning alignment, session recaps, context rotation |
| `design-best-practices` | File-mode | `design-init`, `design-review`, `design-refine`, `design-system`, `design-harden` | Frontend design quality: typography, color, layout, accessibility |
| `auto-devtronic` | File-mode | `auto-devtronic`, `validate-task-afk` | Autonomous engineering loop — spec → tests → plan → implement → PR |

### Enabling Addons

**During `init`** (Claude Code only):

The init wizard shows a multiselect after IDE selection:
```
◆ Enable optional addon packs? (space to toggle, enter to confirm)
  ○ Orchestration — briefing, recap, handoff
  ○ Design Best Practices — design-init, design-review, design-refine, design-system, design-harden
  ○ Auto-devtronic — auto-devtronic, validate-task-afk
```

**After init**, manage addons with:

```bash
npx devtronic addon list                          # See all addons + status
npx devtronic addon enable orchestration          # Install
npx devtronic addon enable design-best-practices
npx devtronic addon enable auto-devtronic
npx devtronic addon disable design-best-practices # Uninstall
```

### How Addon Files Are Tracked

**Plugin-mode addons** (`orchestration`) install into `.claude-plugins/devtronic/skills/` and are tracked in `.ai-template/manifest.json`.

**File-mode addons** (`design-best-practices`, `auto-devtronic`) install into your agent directories and are tracked in `devtronic.json`:

When you run `devtronic addon enable design-best-practices`, the CLI:
1. Copies skill files to `.claude/skills/design-init/`, `.claude/skills/design-review/`, etc.
2. Copies rule files to `.claude/rules/design-quality.md`
3. Copies reference docs to `.claude/skills/design-harden/reference/`
4. Records installed files and checksums in `devtronic.json`

### Customizing Addon Skills

You can freely edit any installed addon file:

```bash
# Edit a design skill
vim .claude/skills/design-review/SKILL.md
```

The addon system tracks which files you've modified:
- **Unmodified files** are updated automatically during `addon sync`
- **Modified files** are preserved during sync (you'll see a warning)

### Changing Agent Targets

By default, file-mode addon files are generated for Claude only. To target multiple agents:

```json
// .claude/devtronic.json
{
  "agents": ["claude", "cursor", "gemini"],
  "installed": { ... }
}
```

After changing agents, run:

```bash
npx devtronic addon sync
```

This generates files for the new agents while keeping existing ones.

### How `addon sync` Works

| File State | Sync Behavior |
|-----------|---------------|
| Unmodified (matches original) | Updated to latest version |
| Modified by user | Preserved, conflict reported |
| Missing (new agent added) | Created from source |

---

## Removing Default Content

If you don't want certain default skills or agents:

```bash
# Remove specific skill
rm .claude/skills/backlog/

# Remove specific agent
rm .claude/agents/code-reviewer.md
```

The CLI won't re-add them on update if they don't exist (it only adds new files, doesn't restore deleted ones).

---

## Sharing Customizations

### Team Standards

Put shared customizations in the repo:
- `.claude/rules/` - Team coding standards
- `.claude/skills/` - Team workflows
- `AGENTS.md` - Project context

### Personal Preferences

Put personal customizations outside the repo:
- `CLAUDE.local.md` - Personal overrides (gitignored)
- `.claude/settings.local.json` - Personal settings

---

## Related Documentation

- [Skills Reference](./skills.md) - All included skills
- [Agents Reference](./agents.md) - All included agents
- [CLI Reference](./cli-reference.md) - Command documentation
- [Philosophy](./philosophy.md) - Why things work this way
