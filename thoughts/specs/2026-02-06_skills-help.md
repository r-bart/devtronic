# PRD: Skills Help Skill

**Date**: 2026-02-06
**Status**: draft

---

## Executive Summary

A Claude Code skill (`/skills-help`) that lists all available skills with their invocation syntax, flags, and a one-line description. Works like the `--help` command of any CLI tool - fast, scannable, always up to date.

---

## Problem Statement

### Current State

There are 14 skills in `.claude/skills/` with varying flags and invocation patterns. Users must either remember them all, read each `.md` file individually, or ask Claude "what skills are available?".

### Pain Points

- **Discoverability**: New team members don't know what skills exist
- **Flag amnesia**: Even experienced users forget flags like `--deep`, `--strict`, `--from`
- **No single source of truth**: The only way to see all skills is to list the directory and read each file
- **Workflow guidance**: Users don't know the recommended order of skills

---

## Goals & Non-Goals

### Goals

1. One command (`/skills-help`) to see all available skills
2. Show invocation syntax, flags, and one-line description for each
3. Auto-generated from actual skill files (always up to date)
4. Group skills by workflow phase for orientation
5. Fast - display only, no files created

### Non-Goals

- Full documentation of each skill (that's what reading the skill file is for)
- Skill management (create/edit/delete)
- Interactive skill selection/execution
- Searching or filtering skills (14 skills fit in one screen)

---

## User Stories

### US1: See all available skills

**As a** developer
**I want to** run `/skills-help`
**So that** I see a quick reference of every skill with its syntax and purpose

Acceptance Criteria:
- [ ] Lists all skills from `.claude/skills/`
- [ ] Shows name, flags, and one-line description
- [ ] Grouped by workflow phase
- [ ] Displays in under 5 seconds

### US2: Check flags for a specific skill

**As a** developer
**I want to** scan the `/skills-help` output
**So that** I can find the exact flag I need without reading the full skill file

Acceptance Criteria:
- [ ] Each skill shows its available flags/arguments
- [ ] Flag descriptions are concise (1-3 words each)

### US3: Understand the recommended workflow

**As a** new team member
**I want to** see skills grouped by workflow phase
**So that** I understand the recommended order of operations

Acceptance Criteria:
- [ ] Skills grouped into logical phases (orientation, planning, development, review)
- [ ] Workflow hint shown at the bottom

---

## Functional Requirements

### FR1: Skill Discovery

Read all `.md` files in `.claude/skills/` and extract from each:

| Field | Source |
|-------|--------|
| Name | Frontmatter `name:` |
| Description | Frontmatter `description:` (truncated to ~80 chars) |
| Flags | Parsed from skill content (headers, flag tables, code blocks) |

### FR2: Display Format

```markdown
# Available Skills (14)

## Orientation & Research

| Skill | Usage | Description |
|-------|-------|-------------|
| `/brief` | `/brief [topic]` | Quick contextual briefing at session start |
| `/research` | `/research [topic]` | Codebase investigation and analysis |
|  | `--deep` | Thorough analysis (creates file) |
|  | `--external` | GitHub + MCP context |
|  | `--all` | Maximum coverage |

## Planning

| Skill | Usage | Description |
|-------|-------|-------------|
| `/spec` | `/spec [feature]` | Create product specification (PRD) |
| `/create-plan` | `/create-plan [feature]` | Strategic implementation plan |
|  | `--detailed` | Task-level pseudocode |
|  | `--from-spec` | Generate from existing spec |

## Development

| Skill | Usage | Description |
|-------|-------|-------------|
| `/scaffold` | `/scaffold` | Create new project from scratch |
| `/setup` | `/setup` | Configure AI Agentic Arch for existing project |
| `/investigate` | `/investigate [error]` | Deep error/bug analysis |
| `/worktree` | `/worktree` | Git worktree management |
|  | `--create <name>` | Create new worktree |
|  | `--list` | List all worktrees |
|  | `--remove <name>` | Remove worktree |

## Quality & Review

| Skill | Usage | Description |
|-------|-------|-------------|
| `/audit` | `/audit` | Codebase health audit |
|  | `--architecture` | Layer violations only |
|  | `--code` | TODOs, duplicates, consistency |
|  | `--security` | Secrets, vulnerabilities |
|  | `--quick` | Critical issues only |
| `/post-review` | `/post-review` | Pre-PR comprehensive review |
|  | `--strict` | Senior engineer mode |
|  | `--quick` | Automated checks only |

## Session & Meta

| Skill | Usage | Description |
|-------|-------|-------------|
| `/checkpoint` | `/checkpoint` | Save session progress for resumption |
| `/backlog` | `/backlog` | Manage issue backlog |
|  | `add "Title"` | Add new item |
|  | `move ID [status]` | Move item |
| `/learn` | `/learn` | Post-task teaching breakdown |
| `/create-skill` | `/create-skill` | Create a new skill |
| `/skills-help` | `/skills-help` | List all skills (this help) |

---

**Workflow**: `/brief` → `/spec` → `/research --deep` → `/create-plan` → implement → `/post-review`
```

### FR3: Dynamic Generation

The skill MUST read `.claude/skills/` at runtime to build the list. This ensures:
- New skills appear automatically
- Removed skills disappear
- Description changes are reflected immediately

The grouping and flag extraction can be hardcoded in the skill since the catalog is maintained by the team. Alternative: extract flags dynamically from each skill file's content.

---

## Technical Considerations

### Skill Structure

- File: `.claude/skills/skills-help.md`
- Allowed tools: `Glob`, `Read`
- `disable-model-invocation: true` (user-initiated only)
- No files created (display only)

### Implementation Approach

Two options:

**Option A: Dynamic extraction** (more resilient)
1. `Glob` for `.claude/skills/*.md`
2. `Read` each file's frontmatter for name + description
3. Parse content for flags (look for `--flag` patterns, flag tables)
4. Group by predefined categories (hardcoded mapping)
5. Display formatted output

**Option B: Curated catalog** (simpler, more polished)
1. Hardcode the complete catalog in the skill file itself
2. Use `Glob` only to validate skills still exist
3. Display the curated content

**Recommendation**: Option A for the extraction, with a hardcoded grouping map. This gives us always-fresh descriptions while maintaining logical organization.

### Edge Cases

| Case | Behavior |
|------|----------|
| Skill file without frontmatter | Show filename as name, "(no description)" |
| New skill not in grouping map | Add to "Other" group at the end |
| No skills found | "No skills found in `.claude/skills/`" |
| Skill with no flags | Show just the base invocation |

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Discoverability | Team uses `/skills-help` instead of asking | Observation |
| Accuracy | 100% of skills listed with correct flags | Comparison with actual files |
| Speed | Output in <5 seconds | Timing |

---

## Open Questions

- [x] Skill name: `/skills-help` (avoids conflict with Claude Code built-in `/help`)
- [ ] Should we support `/skills <name>` to show detailed help for a single skill? (Could just say "read the skill file")
- [ ] Should flags be dynamically extracted or hardcoded? (Recommendation: dynamic extraction with hardcoded grouping)

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `/help` conflicts with built-in command | Medium | Use `/skills-help` instead |
| Dynamic extraction misses flags | Low | Fallback to showing "run `/skills <name>` for details" |
| Hardcoded grouping becomes stale | Low | New skills go to "Other" group, update grouping periodically |
