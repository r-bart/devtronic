# Skills Reference

Skills are invocable workflows in Claude Code. Use them with `/skill-name` in your Claude Code session.

---

## Core Workflow Skills

These skills form the recommended development workflow:

```
/brief → /spec → /create-plan → /generate-tests → /execute-plan → /summary → /post-review
```

### /brief - Quick Session Briefing

**Purpose**: Fast contextual briefing with pre-flight validation when starting work. Scans docs, code, and git activity, plus runs health checks (typecheck, lint, state freshness).

**When to use**:
- Starting a new session on existing work
- Quickly orienting yourself on a feature
- Checking what exists before `/research` or `/spec`
- Resuming after a break

**Skip for**: Brand new features with no prior work, or when you need deep analysis.

**Comparison**:
| Skill | Creates File | Depth |
|-------|--------------|-------|
| `/brief` | No (display only) | Superficial |
| `/research` | Yes (with --deep) | Deep |

**Rule of thumb**: Start with `/brief`, escalate to `/research` if you need more.

**Output**: Display only (no file created)

---

### /spec - Product Specification

**Purpose**: Create a Product Requirements Document (PRD) through structured interviewing.

**When to use**:
- Starting a significant new feature
- Requirements are vague or incomplete
- Multiple approaches are possible

**Skip for**: Bug fixes, simple changes, pure refactoring.

**Design mockups**: If you have mockups (Figma, Sketch, etc.), Claude will ask and use the appropriate MCP to extract design system alignment (tokens, existing components, gaps) and visual specs.

**Output**: `thoughts/specs/YYYY-MM-DD_[feature-slug].md`

---

### /research - Codebase Investigation

**Purpose**: Investigate the codebase and gather context with multiple modes.

**Modes**:
| Mode | Command | Creates File | Use When |
|------|---------|--------------|----------|
| **Quick** | `/research [topic]` | No | Starting a session, fast orientation |
| **Deep** | `/research [topic] --deep` | Yes | Before complex features, unfamiliar code |
| **External** | `/research [topic] --external` | Yes | Need GitHub issues, PRs, Slack context |
| **All** | `/research [topic] --all` | Yes | Maximum coverage (deep + external) |

**Rule of thumb**: Start with quick, escalate as needed.

**Output**:
- Quick: Display only (no file)
- Others: `thoughts/research/YYYY-MM-DD_[topic].md`

---

### /opensrc - Fetch Package Source Code

**Purpose**: Fetch source code of npm packages or GitHub repos so AI agents have full implementation context, not just type definitions.

**When to use**:
- You need to understand how a library works internally
- Type definitions alone aren't enough context
- Before implementing patterns from another library

**Usage**:
```
/opensrc react
/opensrc react react-router-dom zustand
/opensrc react@19.0.0
/opensrc vercel-labs/opensrc
```

**Output**: Source downloaded to `opensrc/<package>/`, with `opensrc/sources.json` index

---

### /create-plan - Implementation Planning

**Purpose**: Create detailed implementation plans for complex tasks.

**Modes**:
| Mode | Command | Output |
|------|---------|--------|
| **Strategic** | `/create-plan [feature]` | Phased plan with architecture decisions |
| **Detailed** | `/create-plan [task] --detailed` | Pseudocode, file changes, test cases |
| **From Spec** | `/create-plan --from-spec` | Generate plan from existing spec |

**When to use**:
- Starting a complex feature (3+ files)
- Multiple implementation approaches exist
- Want to avoid rework

**Skip for**: Simple single-file changes, obvious bug fixes.

**Output**: `thoughts/plans/YYYY-MM-DD_[feature-slug].md`

---

### /summary - Post-Change Documentation

**Purpose**: Generate a structured summary of what changed, why, decisions made, and what's pending.

**When to use**:
- After completing a feature or significant change
- Before creating a PR (complements `/post-review`)
- At the end of a work session
- When handing off work to someone else

**Difference from /checkpoint**: Checkpoint saves *how to resume* (state + next steps). Summary documents *what was done and why* (change log + rationale).

**Difference from /post-review**: Post-review validates quality. Summary documents the narrative of changes.

**Output**:
- `thoughts/SUMMARY.md` (overwrite — latest summary, read by `/brief`)
- `thoughts/summaries/YYYY-MM-DD_[slug].md` (timestamped archive)

---

### /checkpoint - Session State Compaction

**Purpose**: Save current progress to a file so you can start a fresh session without losing context.

**When to use**:
- Context feels "heavy" after extended work
- Before taking a break
- After completing a major phase
- When the AI starts making obvious mistakes

**Auto-suggestion**: Claude proactively suggests `/checkpoint` when conversations exceed ~40-50 messages.

**Output**: `thoughts/checkpoints/YYYY-MM-DD_HH-MM_[task-slug].md`

**Resuming**:
```
Please read my checkpoint: thoughts/checkpoints/YYYY-MM-DD_HH-MM_[slug].md
Continue from where I left off.
```

---

### /setup - Interactive Configuration

**Purpose**: Configure devtronic through conversation instead of CLI.

**When to use**:
- First time setting up AI assistance in an **existing** project
- Want conversational setup instead of CLI

**For new projects**: Use `/scaffold` instead.

**Behind the scenes**: Invokes `npx devtronic init`

---

### /scaffold - Create New Projects

**Purpose**: Create new projects from scratch with guided architecture and structure.

**When to use**:
- Starting a brand new project
- Want guided setup with proper architecture

**Project Types**: frontend, spa-ddd, backend, fullstack, monorepo

**Architecture Options**: clean, ddd, feature-based, mvc, flat

---

### /worktree - Git Worktree Manager

**Purpose**: Manage git worktrees for parallel development sessions.

**Commands**:
| Flag | Purpose |
|------|---------|
| `--create <name>` | Create new worktree from current branch |
| `--list` | List all worktrees (default) |
| `--remove <name>` | Remove worktree and clean up |
| `--prune` | Clean stale worktree references |

**When to use**: Running parallel Claude Code sessions, working on multiple features simultaneously.

**Output**: Display only (no file created)

---

## Execution Skills

### /quick - Fast Ad-Hoc Task Execution

**Purpose**: Execute small, well-defined tasks without the full workflow ceremony. Implement, verify, commit.

**When to use**:
- Small tasks (< 5 files)
- Obvious bug fixes with clear solution
- Simple config changes
- Adding a single test or function

**Escalates to `/create-plan`** if task touches 5+ files or needs design decisions.

**Delegates to**: `commit-changes` agent for atomic commits after verification.

**Output**: Direct implementation + commit

---

### /execute-plan - Parallel Phase Execution

**Purpose**: Execute a plan in parallel phases by reading task dependencies and running independent tasks as concurrent subagents.

**When to use**:
- A plan with `## Task Dependencies` exists
- You want to execute tasks in optimal parallel order
- The plan was created with `/create-plan`

**Process**: Load plan → Validate dependencies → Compute phases → Execute parallel subagents → Verify done criteria

**Delegates to**: `commit-changes` agent after each phase passes quality checks.

**Limitations**: Claude Code only, no interactive tasks, tasks must not modify same files in parallel.

**Output**: Execution report with phase results and done criteria validation

---

## Quality & Review Skills

### /post-review - Post-Feature Review

**Purpose**: Review implemented changes before PR creation.

**Modes**:
| Mode | Command | Purpose |
|------|---------|---------|
| **Standard** | `/post-review` | Full review with lessons learned |
| **Strict** | `/post-review --strict` | Senior engineer "grill me" mode |
| **Quick** | `/post-review --quick` | Automated checks only |
| **Files** | `/post-review src/file.ts` | Review specific files |

**Includes**:
- Requirements verification
- Architecture compliance
- Quality checks (types, lint, tests)
- Lessons learned capture
- CLAUDE.md updates

**Output**: Notes saved to `thoughts/notes/YYYY-MM-DD_[feature-name].md`

**Note**: Claude Code has a built-in `/review` for GitHub PR review. Use `/post-review` for pre-PR feature review.

---

### /investigate - Deep Error Analysis

**Purpose**: Systematic error investigation that identifies root cause and proposes concrete solutions.

**When to use**:
- You paste an error/stack trace for analysis
- A bug is not obvious and requires investigation
- The error repeats and you want to document the solution

**Note**: For simple errors, the `error-investigator` agent is invoked automatically. Use `/investigate` for deeper analysis.

**Output**: Fix suggestion + optional `thoughts/debug/YYYY-MM-DD_[description].md`

---

### /audit - Comprehensive Codebase Audit (SonarQube lite)

**Purpose**: One-stop skill for auditing codebase health: architecture, code quality, code smells, complexity, security, test coverage, and technical debt.

**Modes**:
| Mode | Command | What it checks |
|------|---------|----------------|
| **Full** | `/audit` | Everything (architecture + code + smells + complexity + security + coverage) |
| **Architecture** | `/audit --architecture` | Layer violations, dependency direction |
| **Code** | `/audit --code` | TODOs, unused code, duplicates, code smells |
| **Complexity** | `/audit --complexity` | Cyclomatic + cognitive complexity per function |
| **Security** | `/audit --security` | Secrets, vulnerable deps, OWASP basics |
| **Quick** | `/audit --quick` | Critical issues only + complexity >20 + god files >800 lines |

**Delegates to**: `dependency-checker` agent for dependency audit in `--security` mode (vulnerabilities, outdated, unused, licenses).

**Different from `/post-review`**: Post-review checks recent changes. Audit scans full codebase.

**Output**: `thoughts/audit/YYYY-MM-DD_audit.md` with health score (0-100), technical debt estimation, and trend comparison

---

### /generate-tests - Tests as Definition of Done

**Purpose**: Generate failing tests from a spec before implementation begins. Encodes acceptance criteria as executable tests.

**When to use**:
- After a spec is approved (via `/spec`)
- Before creating an implementation plan (via `/create-plan`)
- When you want tests to define "done" before writing production code

**Skip for**: Bug fixes with obvious test scope, pure refactoring with existing coverage.

**Pipeline Position**:
```
/spec → /generate-tests → /create-plan → /execute-plan → /post-review
```

**Output**: Test files + `thoughts/specs/[spec-slug]_test-manifest.json` traceability manifest

---

## Orchestration Addon Skills

These skills are available when the **orchestration** addon is enabled during `devtronic init`. They add structured pre-planning alignment, session recaps, and context rotation.

**Enable during init**: Select "Orchestration Workflow" when prompted for addons.

**Enable after init**: `npx devtronic addon add orchestration`

### /briefing - Pre-Planning Alignment

**Purpose**: Ask 3-5 targeted questions to clarify scope, style, priority, and constraints before diving into planning or implementation.

**When to use**:
- Before `/create-plan` on complex features
- Requirements are vague or ambiguous
- Multiple valid approaches exist

**Skip for**: Well-defined tasks, when a detailed `/spec` already exists.

**Process**:
1. Analyze task context (STATE.md, CLAUDE.md, existing specs)
2. Generate 3-5 targeted questions with concrete options
3. Ask via AskUserQuestion
4. Save decisions to `thoughts/CONTEXT.md`
5. Suggest next step

**Output**: `thoughts/CONTEXT.md`

---

### /recap - Quick Session Summary

**Purpose**: Generate a compact, structured summary from git activity and modified files.

**When to use**:
- End of a work session
- After ad-hoc work not driven by `/execute-plan`
- Before `/handoff` to capture session details

**Comparison with `/summary`**:
| | `/recap` | `/summary` |
|-|----------|------------|
| Purpose | Quick compact overview | Detailed narrative with rationale |
| Output | Tree-style + bullets | Full markdown document |
| Speed | Fast (git-based) | Thorough (reads code + explains) |

**Output**: `thoughts/RECAP.md` (also updates `thoughts/STATE.md`)

---

### /handoff - Context Rotation

**Purpose**: Save current state and signal to start a fresh session with clean context.

**When to use**:
- Context feels heavy (>50 messages)
- Natural breakpoint between phases
- Model making inconsistent decisions
- End of day / wrapping up

**Comparison with `/checkpoint`**:
| | `/handoff` | `/checkpoint` |
|-|------------|---------------|
| Purpose | End session, rotate | Save progress, can continue |
| Signal | "Start new session" | "Can resume from here" |

**Output**: `thoughts/STATE.md` + `thoughts/RECAP.md`

---

### Enhanced /execute-plan

When the orchestration addon is enabled (`thoughts/CONTEXT.md` exists):
- **Visual progress**: Text-based phase progress with status indicators
- **Inter-phase handoff**: Summary of what each phase accomplished, passed to next phase as context
- **Automatic recap**: Writes `thoughts/RECAP.md` after completion

---

## Other Skills

### /create-skill - Meta Skill Generator

**Purpose**: Conversationally create new custom skills.

**When to use**:
- Need a new reusable workflow
- Want to automate a repetitive task
- Creating project-specific commands

**Process**:
1. **GATHER** - Name, description, usage scenarios
2. **DESIGN** - Workflow steps, tools needed, output location
3. **GENERATE** - Create the skill file in `.claude/skills/`
4. **VERIFY** - Review and test

**Output**: `.claude/skills/{name}.md`

---

### /backlog - Issue Management

**Purpose**: Manage the issue backlog efficiently, keeping the file clean and manageable.

**Commands**:
```bash
/backlog              # View backlog
/backlog add "Title"  # Add item
/backlog move BACK-XXX high|medium|low|progress|done
/backlog cleanup      # Archive old items
```

**Files**:
- `thoughts/BACKLOG.md` - Active backlog
- `thoughts/archive/backlog/` - Archived items

**Automatic Cleanup Rules** (checked on every interaction):

| Rule | Threshold | Action |
|------|-----------|--------|
| Completed items | > 5 | Archive oldest |
| In Progress | > 3 | Block new starts |
| Total backlog | > 20 | Force prioritization before adding |
| Stale items | > 30 days | Prompt to review/remove |
| Monthly archive | 1st of month | Archive all completed |
| Archive retention | > 6 months | Purge old archives |

**Item Structure**:
```markdown
### [BACK-042] Feature title
- **Type**: feature | bug | tech-debt | improvement
- **Priority**: high | medium | low
- **Description**: Brief description
- **Success criteria**: How we know it's done
- **Docs**:
  - Spec: thoughts/specs/BACK-042_feature.md
  - Plan: thoughts/plans/BACK-042_feature.md
- **Added**: 2026-02-05
- **Completed**: 2026-02-05 (PR #234)
```

---

### /learn - Post-Task Teaching

**Purpose**: Transform completed work into a learning opportunity.

**When to use**:
- After any task you want to understand better
- After debugging sessions
- When you think "I couldn't have done that myself"

**Teaching Framework**:
1. Summary - TL;DR of what was done
2. Step-by-Step Breakdown - What, why, code
3. Key Concepts - Why it matters
4. Patterns to Remember - Templates to reuse
5. Common Pitfalls - What goes wrong
6. Try It Yourself - Exercise to practice

---

## Creating Custom Skills

Use `/create-skill` for guided skill creation, or create manually in `.claude/skills/`.

### Simple skills (single file)

For skills without supporting files, use a single Markdown file:

```
.claude/skills/my-skill.md
```

```markdown
---
name: my-skill
description: What this skill does
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash
---

# My Custom Skill

Instructions for Claude when this skill is invoked...
```

### Complex skills (directory)

For skills that need supporting files (templates, examples, reference data), use a directory:

```
.claude/skills/my-skill/
├── SKILL.md           # Main skill file (required)
├── template.md        # Supporting file
└── examples.md        # Supporting file
```

The `SKILL.md` file uses the same frontmatter format. Supporting files are loaded as context when the skill is invoked.

**Examples**: `audit/` (SKILL.md + report-template.md), `scaffold/` (SKILL.md + 5 supporting files).

See [Customization Guide](./customization.md) for more details.

---

## Related Documentation

- [Agents Reference](./agents.md) - Specialized subagents
- [CLI Reference](./cli-reference.md) - Command line tools
- [Philosophy](./philosophy.md) - Why this workflow
