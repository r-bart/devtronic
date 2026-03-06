# PRD: devtronic Command System Refactor

**Date**: 2026-03-06
**Status**: reviewed

---

## Executive Summary

devtronic installs AI workflow skills into developer projects. Currently, those skills use generic names (`/spec`, `/create-plan`, `/brief`) with no namespace, live in `.claude/skills/`, and the main addon command is confusingly named `/auto-devtronic`. This refactor establishes a consistent `devtronic:` namespace for all commands, migrates to `.claude/commands/` (the official Claude Code convention), exposes the main pipeline as a single `/devtronic` command, and installs adapted equivalents across all supported IDEs.

---

## Problem Statement

### Current State

- Skills installed to `.claude/skills/[name]/SKILL.md`
- Invoked as `/spec`, `/create-plan`, `/brief`, `/execute-plan`, etc. — no namespace
- Main addon pipeline invoked as `/auto-devtronic` — confusing name
- Multi-IDE support installs files to `.cursor/`, `.gemini/` but with no consistent naming convention across IDEs
- No clear separation between "devtronic skills" and user's own custom skills

### Pain Points

- `/auto-devtronic` implies there is a non-auto version — misleading
- Generic names like `/spec`, `/brief` can clash with user-defined commands
- `.claude/skills/` is an informal convention; `.claude/commands/` is the official Claude Code path for slash commands
- Installing to multiple IDEs is ad-hoc, with no consistent command naming strategy per runtime
- Users can't tell which commands belong to devtronic and which are their own

---

## Goals & Non-Goals

### Goals

1. Expose the full devtronic pipeline as a single `/devtronic` command
2. Namespace all installed skills as `devtronic:[skill]` (e.g. `/devtronic:spec`, `/devtronic:brief`)
3. Install to `.claude/commands/` for Claude Code (official convention)
4. Support all major AI IDEs: Claude Code, Cursor, Gemini CLI, Codex, OpenCode
5. Use the namespace/command format native to each IDE where possible
6. Mode resolution: `--afk`/`--hitl` flag overrides project config, project config overrides HITL default
7. Project config (`npx devtronic mode afk`) persists the default mode for the team

### Non-Goals

- Changing the internal addon name (`auto-devtronic`) — that's an implementation detail
- Changing the CLI commands (`devtronic mode`, `devtronic addon`) — those are fine
- Supporting IDEs beyond Claude Code, Cursor, Gemini CLI, Codex, OpenCode in v1
- Providing sub-pipeline commands (e.g. `/devtronic:run-loop`) — the full pipeline is the entry point

---

## User Stories

### US-1: Main pipeline command

**As a** developer with devtronic installed,
**I want to** run `/devtronic [issue-url] [--afk|--hitl]`
**So that** I can trigger the full engineering pipeline (brief → spec → tests → plan → execute → PR) in one command.

Acceptance Criteria:
- [ ] `/devtronic` is available as a slash command after `npx devtronic addon enable auto-devtronic`
- [ ] Running without a flag uses the mode from `.claude/devtronic.json` (or HITL if not set)
- [ ] `--afk` flag overrides config and runs fully autonomously
- [ ] `--hitl` flag overrides config and runs with human gates
- [ ] `npx devtronic mode afk` sets the project default; subsequent `/devtronic` runs use AFK

### US-2: Namespaced core skills

**As a** developer with devtronic installed,
**I want to** invoke skills as `/devtronic:spec`, `/devtronic:brief`, `/devtronic:create-plan`, etc.
**So that** devtronic commands are clearly distinguished from my own custom commands.

Acceptance Criteria:
- [ ] All core skills are available under `devtronic:` namespace
- [ ] No name collisions with user-defined commands in `.claude/commands/`
- [ ] Skills work identically to the current unnamespaced versions

### US-3: Multi-IDE compatibility

**As a** developer using Cursor, Gemini CLI, Codex, or OpenCode,
**I want to** access devtronic commands in my IDE of choice
**So that** I'm not locked into Claude Code.

Acceptance Criteria:
- [ ] `npx devtronic init` detects or prompts for the user's IDE(s)
- [ ] Commands are installed in the format native to each IDE
- [ ] The `/devtronic` main command is available in all supported IDEs
- [ ] Where the IDE supports namespacing, `devtronic:` namespace is used
- [ ] Where the IDE uses a flat command structure (e.g. OpenCode), commands are prefixed `devtronic-`

---

## Functional Requirements

### FR-1: Command installation path (Claude Code)

- Install to `.claude/commands/devtronic/[skill].md` for namespaced skills
- Install `/devtronic` as `.claude/commands/devtronic.md` (top-level command)
- Invocation: `/devtronic:spec`, `/devtronic:brief`, `/devtronic`

### FR-2: Command installation — other IDEs

| IDE | Install path | Invocation format | Notes |
|-----|-------------|-------------------|-------|
| Claude Code | `.claude/commands/devtronic/[skill].md` | `/devtronic:[skill]` | Markdown + YAML frontmatter |
| Gemini CLI | `.gemini/commands/devtronic/[skill].toml` | `/devtronic:[skill]` | TOML format; subdirectories = namespace |
| Gemini CLI (skills) | `.gemini/skills/devtronic/` | auto-activated by model | Markdown, on-demand; for the main pipeline |
| OpenCode | `.opencode/command/devtronic-[skill].md` | `/devtronic-[skill]` | Flat structure; namespace → prefix |
| Codex | `.codex/skills/devtronic-[skill]/` | native skill format | TOML + directory |
| Cursor | `.cursor/rules/devtronic-[skill].md` | injected as context rules | No slash commands; rules only |

**Gemini detail**: custom commands use TOML (`.toml`), not Markdown. The namespace maps 1:1 with subdirectories: `.gemini/commands/devtronic/spec.toml` → `/devtronic:spec`. Additionally, Gemini has a separate "skills" system (Markdown, auto-activated) which is more analogous to devtronic's current `.claude/skills/` — the main `/devtronic` pipeline is a better fit there.

**Cursor detail**: Cursor has no slash command system. Files in `.cursor/rules/` are injected as persistent context, not invokable commands. This is a significant limitation — Cursor users get the rules/instructions but cannot trigger them explicitly.

### FR-3: Mode resolution (unchanged from current)

Priority order:
1. CLI flag (`--afk` / `--hitl`) passed at invocation — always wins
2. `mode` field in `.claude/devtronic.json` — set via `npx devtronic mode [afk|hitl]`
3. Default: `hitl`

At pipeline start, `/devtronic` reads the config file and logs the resolved mode:
```
Mode: afk (from project config)
Mode: hitl (default)
```

### FR-4: Migration for existing users (breaking change)

- This is a **breaking change**: old paths (`.claude/skills/`) are removed on `npx devtronic update`
- `npx devtronic update` removes all files from `.claude/skills/[devtronic-skill]/` and reinstalls to `.claude/commands/devtronic/`
- Skills customized by the user (checksum differs from original) are backed up before removal and flagged in the update output
- No backward compatibility shim — users must run `npx devtronic update` to migrate

---

## Technical Considerations

- **Install paths per runtime**:
  - Claude Code: `.claude/commands/devtronic/[skill].md` (Markdown + YAML frontmatter)
  - Gemini CLI: `.gemini/commands/devtronic/[skill].toml` (TOML) + `.gemini/skills/devtronic/` for the main pipeline skill
  - OpenCode: `.opencode/command/devtronic-[skill].md` (flat, prefixed)
  - Codex: `.codex/skills/devtronic-[skill]/` (TOML + directory)
  - Cursor: `.cursor/rules/devtronic-[skill].md` (rules only, no slash commands)
- **Main command file**: `.claude/commands/devtronic.md` (top-level) → `/devtronic`
- **Skill naming**: `name: devtronic:spec` in YAML frontmatter → `/devtronic:spec` in Claude Code and Gemini
- **Format adapters**: Each IDE requires a format transformation. Claude Code/Gemini share Markdown source but Gemini commands output TOML. OpenCode strips the `name:` frontmatter field and prefixes the filename. Codex uses a directory + TOML structure.
- **Unnamespaced skills removed**: `.claude/skills/[name]/` paths are deleted on `update`. No aliases kept.
- **Checksum tracking**: `detectModifiedAddonFiles` must be updated to check `.claude/commands/devtronic/` instead of `.claude/skills/`
- **AGENT_PATHS map**: Extend from `{ claude, cursor, gemini }` to include `codex → .codex`, `opencode → .opencode` (global: `~/.config/opencode`)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Command available post-install | `/devtronic` works immediately | Manual test after `addon enable` |
| No namespace collisions | Zero conflicts with typical user commands | Test with common names: spec, plan, brief |
| Multi-IDE install | All 5 IDEs install without error | CI matrix test |
| Migration clean | Old `.claude/skills/` removed | Post-`update` filesystem check |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini commands require TOML (different format from Markdown) | Medium | Format adapter in install pipeline; GSD codebase is reference implementation |
| Cursor has no slash commands — limited to rules injection | Medium | Document clearly; rules still provide context but are not invokable |
| Breaking change forces existing users to run `update` | Medium | Clear migration message in CLI output; bump minor version |
| OpenCode / Codex flat structures lose namespace semantics | Low | Use `devtronic-` prefix consistently; document per-IDE invocation format |
