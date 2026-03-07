---
name: devtronic-help
description: Devtronic meta-help. Discover available skills, agents, addons, and workflows without leaving the IDE. Use when unsure what devtronic can do or which skill to use next.
allowed-tools: Glob, Read, Bash
argument-hint: "[topic|--workflows|--addons|--agents|--all]"
---

# Help - Devtronic Discovery

Show what devtronic can do, right from the IDE. No need to switch to a terminal or read docs.

## When to Use

- First time using devtronic in a project
- Unsure which skill to use for a task
- Want to see available agents or addons
- Need the recommended workflow for a specific task type

## Modes

| Mode | Command | Shows |
|------|---------|-------|
| **Default** | `/devtronic-help` | Quick overview: skill categories + suggested next step |
| **Topic** | `/devtronic-help design` | Skills related to a topic |
| **Workflows** | `/devtronic-help --workflows` | Recommended workflows by task type |
| **Agents** | `/devtronic-help --agents` | Available subagents and their roles |
| **Addons** | `/devtronic-help --addons` | Installed and available addons |
| **All** | `/devtronic-help --all` | Full inventory |

---

## Process

```
1. PARSE INPUT
   └── Determine mode from $ARGUMENTS

2. SCAN INSTALLED ASSETS
   ├── Skills: .claude/skills/*/SKILL.md
   ├── Agents: .claude/agents/*.md
   ├── Addons: .claude/addons/*/manifest.json (if any)
   └── Rules: .claude/rules/*.md

3. FORMAT OUTPUT
   └── Display categorized, scannable results

4. SUGGEST NEXT STEP
   └── Based on what the user seems to need
```

---

## Step 1: Parse Input

Parse `$ARGUMENTS`:

- Empty or no args → **Default mode** (overview)
- `--workflows` → Show workflow recipes
- `--agents` → List agents with descriptions
- `--addons` → Show addon status
- `--all` → Full inventory
- Anything else → **Topic mode** (filter by keyword)

---

## Step 2: Scan Installed Assets

### Skills

```bash
# Find all installed skills
find .claude/skills -name "SKILL.md" -type f 2>/dev/null
```

For each SKILL.md, read the YAML frontmatter to extract `name` and `description`.

### Agents

```bash
# Find all installed agents
find .claude/agents -name "*.md" -type f 2>/dev/null
```

For each agent file, read the first few lines to extract purpose.

### Addons

```bash
# Check for addon manifests
find .claude/addons -name "manifest.json" -type f 2>/dev/null
# Also check for addon skills/agents that were merged into main dirs
```

### Rules

```bash
# Find active rules
find .claude/rules -name "*.md" -type f 2>/dev/null
```

---

## Step 3: Output Formats

### Default Mode (no args)

```markdown
# Devtronic Help

You have **X skills**, **Y agents**, and **Z rules** installed.

## Skill Categories

| Category | Skills | Start With |
|----------|--------|------------|
| Workflow | brief, spec, create-plan, execute-plan, summary, post-review | `/brief` |
| Session | checkpoint, handoff, recap, backlog | `/checkpoint` |
| Research | research, investigate, learn | `/research [topic]` |
| Design | design, design-research, design-define, design-ia, design-wireframe | `/design --research` |
| Design System | design-system, design-system-define, design-system-audit, design-system-sync | `/design-system --define` |
| Quality | audit, design-audit, design-review | `/audit` |
| Scaffold | scaffold, setup, create-skill, worktree | `/scaffold` |
| Quick | quick, opensrc | `/quick [task]` |

## What Do You Want to Do?

| I want to... | Run |
|--------------|-----|
| Start a new feature | `/brief` then `/spec` |
| Fix a bug | `/brief` then `/investigate [error]` |
| Understand this codebase | `/research [topic]` |
| Design a UI | `/design --research` |
| Run a quick task | `/quick [task]` |
| Create a new project | `/scaffold` |
| Audit code quality | `/audit` |
| See available agents | `/devtronic-help --agents` |

> Tip: Run `/devtronic-help [topic]` to find skills related to a specific topic.
> Tip: Run `/devtronic-help --workflows` to see full workflow recipes.
```

### Topic Mode (`/devtronic-help design`)

Filter skills and agents whose name or description matches the keyword. Display matching items with descriptions.

```markdown
# Devtronic Help: "design"

## Matching Skills

| Skill | Description |
|-------|-------------|
| `/design` | Orchestrates the design phase. Detects context and delegates. |
| `/design-research` | Discovery phase — competitive analysis, audience, context. |
| `/design-define` | Personas, user journeys, HMW statements. |
| `/design-ia` | Information architecture — navigation, sitemap, flows. |
| `/design-wireframe` | Wireframe specs per screen. |
| `/design-spec` | Developer-ready design specification. |
| `/design-audit` | UX audit — Nielsen + WCAG. |
| `/design-review` | QA visual — implementation vs wireframes. |

## Matching Agents

| Agent | Role |
|-------|------|
| design-critic | Evaluates design decisions |
| visual-qa | Compares implementation against spec |

## Recommended Workflow

```
/design --research → /design --define → /design --ia → /design --wireframe → /design-system --define
```

> Run `/devtronic-help --workflows` for all workflow recipes.
```

### Workflows Mode (`/devtronic-help --workflows`)

```markdown
# Devtronic Workflows

## New Feature (full)

```
/brief → /spec → /create-plan → /generate-tests → /execute-plan → /summary → /post-review
```

## New Feature (quick)

```
/quick [describe the task]
```

## Bug Fix

```
/brief → /investigate [error] → fix → test → /summary → /post-review
```

## Design (new product/page)

```
/design --research → /design --define → /design --ia → /design --wireframe → /design-system --define → /spec → /create-plan → /execute-plan → /design-review → /post-review
```

## Refactor

```
/brief → /create-plan → implement → /summary → /post-review
```

## Session Management

```
/brief          ← Start session (orientation)
/checkpoint     ← Save progress mid-session
/handoff        ← End session, prepare for next
/recap          ← Quick summary from git
/summary        ← Detailed post-change summary
```

## Design System

```
/design-system --define  ← Create or extract tokens
/design-system --audit   ← Find drift and violations
/design-system --sync    ← Push tokens to config files
```

> Tip: Most workflows start with `/brief` for orientation.
```

### Agents Mode (`/devtronic-help --agents`)

Read each agent file and display:

```markdown
# Devtronic Agents

Agents are specialized subagents that skills invoke automatically. You don't call them directly — they're used by skills like `/execute-plan`, `/audit`, and `/post-review`.

## Available Agents

| Agent | Role | Used By |
|-------|------|---------|
| code-reviewer | Reviews code for quality and patterns | post-review |
| quality-runner | Runs typecheck, lint, test | brief, post-review |
| error-investigator | Deep error analysis | investigate |
| architecture-checker | Validates clean architecture | audit, post-review |
| commit-changes | Commits with conventional format | execute-plan |
| dependency-checker | Checks deps for issues | audit |
| doc-sync | Keeps docs in sync with code | summary |
| test-generator | Generates test cases | generate-tests |
| a11y-auditor | Accessibility audit | design-audit |
| design-critic | Evaluates design decisions | design-review |
| design-system-guardian | Enforces design system usage | design-system --audit |
| design-token-extractor | Extracts tokens from designs | design-system --define |
| ia-architect | Information architecture | design --ia |
| ux-researcher | UX research synthesis | design --research |
| visual-qa | Visual comparison | design-review |

> These are invoked automatically. You interact with them through skills.
```

### Addons Mode (`/devtronic-help --addons`)

```markdown
# Devtronic Addons

Addons extend devtronic with extra skills, agents, and rules.

## Installed Addons

[Scan .claude/ for addon-sourced files and list them]

## Available Addons

To see all addons available for installation, run in your terminal:

```bash
devtronic addon list
```

To add an addon:

```bash
devtronic addon add [name]
```

> Addons add skills, agents, rules, and reference material to your project.
```

### All Mode (`/devtronic-help --all`)

Combine: Default overview + full skill list with descriptions + agents + addons + workflows.

---

## Edge Cases

### No Skills Found

If `.claude/skills/` is empty or missing:

```markdown
# Devtronic Help

No devtronic skills detected in this project.

## Getting Started

Run in your terminal:

```bash
npx devtronic init
```

This will analyze your project and install skills, agents, and rules.
```

### Partial Installation

If some directories exist but others don't, show what's available and note what's missing:

```markdown
> Note: No agents found. Run `devtronic init` to install the full set.
```

---

## Tips

1. **Start with `/devtronic-help`** — get oriented fast
2. **Use topic search** — `/devtronic-help auth` finds relevant skills
3. **Check workflows** — `/devtronic-help --workflows` shows the right sequence
4. **Don't call agents directly** — skills orchestrate them for you
5. **Extend with addons** — `/devtronic-help --addons` shows what's available
