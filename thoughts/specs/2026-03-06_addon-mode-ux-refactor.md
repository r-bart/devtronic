# PRD: Addon & Mode UX Refactor

**Date**: 2026-03-06
**Status**: draft

---

## Executive Summary

Refactor the addon system and execution mode management to improve UX clarity. Addons will be bundled with the npm package and toggled via `enable/disable` instead of downloaded via `add/remove`. HITL/AFK will become a persistent per-project mode managed via CLI, with a new `devtronic status` command providing a unified view of project configuration.

---

## Problem Statement

### Current State

- Addons are installed/removed with `npx devtronic addon add/remove <name>`, which feels like an external download/delete operation
- HITL/AFK are flags passed per invocation of `/auto-devtronic`, with no persistent preference
- There is no single command to see the current state of the project's devtronic configuration

### Pain Points

- `add/remove` framing implies network dependency and permanence — users don't know files are bundled
- Choosing HITL/AFK on every invocation creates friction and risk of inconsistency
- No `status` command means users must inspect `.claude/` manually to understand what's active

---

## Goals & Non-Goals

### Goals

1. Make addons feel like toggleable features, not external packages
2. Make HITL/AFK a persistent per-project mode, changeable at any time
3. Auto-update enabled addons when `devtronic update` is run
4. Introduce `devtronic status` as the single source of truth for project configuration
5. Preserve backward compatibility — existing projects with `add`-installed addons should still work

### Non-Goals

- Global (cross-project) mode or addon preferences — per-project only
- GUI or TUI configuration panel
- Changing how skills/agents are structured internally (`.claude/skills/`, `.claude/agents/`)
- Changing the auto-devtronic pipeline behavior

---

## User Stories

**As a developer**, I want to enable an addon once per project and forget about it, so I don't have to think about what's installed each session.

Acceptance Criteria:
- [ ] `npx devtronic addon enable auto-devtronic` copies addon files to `.claude/`
- [ ] `npx devtronic addon disable auto-devtronic` removes those files
- [ ] `npx devtronic addon list` shows all available addons with enabled/disabled status
- [ ] Addon files are bundled in the npm package (no network request required)

---

**As a developer**, I want to set my preferred execution mode (HITL or AFK) for a project, so every `/auto-devtronic` invocation uses it without me specifying a flag each time.

Acceptance Criteria:
- [ ] `npx devtronic mode afk` sets mode in `.claude/devtronic.json`
- [ ] `npx devtronic mode hitl` sets mode in `.claude/devtronic.json`
- [ ] `npx devtronic mode show` prints the current mode
- [ ] `/auto-devtronic` reads mode from config when no `--afk`/`--hitl` flag is passed
- [ ] `--afk`/`--hitl` flags still override the config for a single run
- [ ] Default mode is HITL when no config exists

---

**As a developer**, I want `devtronic init` to inform me about the default mode, so I know it exists and can change it.

Acceptance Criteria:
- [ ] `init` shows a note: "Mode: HITL (default). Change with `npx devtronic mode afk|hitl`"
- [ ] `init` does NOT prompt for mode (it's informational only)
- [ ] Mode is NOT written to config during `init` — it activates implicitly on first `/auto-devtronic` call

---

**As a developer**, I want a `devtronic status` command, so I can see at a glance what's configured in my project.

Acceptance Criteria:
- [ ] `npx devtronic status` prints current mode and addon states
- [ ] Output is concise and human-readable (not JSON by default)
- [ ] Shows: mode, list of addons with enabled/disabled state, config file path

---

**As a developer**, when I run `npx devtronic update`, I want enabled addons to update automatically, so I always have the latest version without manual intervention.

Acceptance Criteria:
- [ ] `devtronic update` detects which addons are enabled (via `.claude/devtronic.json`)
- [ ] Re-copies addon files from the updated package templates
- [ ] Warns if any addon file was locally modified (same behavior as core file updates)
- [ ] Disabled addons are NOT touched during update

---

## Functional Requirements

### FR-1: Config File

- **File**: `.claude/devtronic.json`
- **Location**: project root (committed to repo)
- **Schema**:
  ```json
  {
    "mode": "hitl" | "afk",
    "addons": ["auto-devtronic", "design-best-practices"]
  }
  ```
- `mode` is optional — absence means HITL default
- `addons` lists currently enabled addons

### FR-2: `addon enable/disable/list`

- `addon enable <name>`: copies files from package bundle to `.claude/`, adds to `addons[]` in config
- `addon disable <name>`: removes files from `.claude/`, removes from `addons[]`
- `addon list`: reads config + package bundle, shows all known addons with status
- If addon is already enabled/disabled, show a message and exit cleanly (no error)
- Legacy `addon add/remove` aliases: keep working with a deprecation warning

### FR-3: `mode afk|hitl|show`

- `mode afk`: writes `"mode": "afk"` to `.claude/devtronic.json`, creates file if absent
- `mode hitl`: writes `"mode": "hitl"`
- `mode show`: reads config, prints `Mode: afk` or `Mode: hitl (default)`
- If no config exists, `mode show` prints `Mode: hitl (default, not configured)`

### FR-4: `/auto-devtronic` skill mode resolution

Priority order (highest to lowest):
1. CLI flag (`--afk` / `--hitl`) — overrides all
2. `.claude/devtronic.json` `mode` field
3. Default: HITL

### FR-5: `devtronic status`

Output format:
```
devtronic status

Mode:    hitl (default)
Config:  .claude/devtronic.json

Addons:
  auto-devtronic       enabled
  design-best-practices  disabled
  orchestration        disabled
```

### FR-6: `devtronic update` + addons

- After updating core files, check `addons[]` in config
- For each enabled addon: re-run the enable flow (copy from updated bundle)
- Report which addon files were updated
- Warn on locally modified addon files (prompt: keep local / overwrite)

### FR-7: `devtronic init` mode note

After initialization completes, add to the summary output:
```
Execution mode: HITL (default)
Change anytime with: npx devtronic mode afk
```
No prompt, no config written — informational only.

---

## Technical Considerations

- `.claude/devtronic.json` should be committed to the repo so the mode is shared across the team
- The `/auto-devtronic` skill reads the config via a `Read` tool call at step 0 — no runtime dependency on CLI
- Addon files remain in `.claude/skills/` and `.claude/agents/` — no structural change
- The config schema should be versioned (`"version": 1`) to allow future migrations
- `addon list` should read available addons from the package bundle manifest, not just what's installed

---

## Migration

- Projects with files installed via `addon add` (old system) are already "enabled" — they just lack a config entry
- `devtronic update` performs automatic migration:
  1. Detects addon files present in `.claude/skills/` and `.claude/agents/` that match known addon file names
  2. Registers them in `.claude/devtronic.json` under `addons[]`
  3. Reports: "Migrated detected addons to config: auto-devtronic"
- `devtronic status` also detects orphaned addon files (present but not in config) and offers to register them interactively
- If the user declines migration, files remain functional — the config is optional for file presence, required only for update tracking

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Clarity | Users understand addon state without reading docs | UX review / dogfooding |
| Mode persistence | `/auto-devtronic` uses correct mode without flags | Integration test |
| Update reliability | Enabled addons update on `devtronic update` | Automated test |

---

## Open Questions

- [ ] Should `.claude/devtronic.json` be added to `.gitignore` by default, or committed? (Current proposal: committed, so mode is shared with teammates)
- [ ] Should `addon list` show addons not bundled in current package version (e.g., if manifest from a newer version)? (Current proposal: only show what's in the installed package)

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Locally modified addon files get overwritten on update | Medium | Warn + prompt before overwriting (same as core update logic) |
| `.claude/devtronic.json` committed with `mode: afk` surprises teammates | Low | Docs clarify this is intentional; `mode show` makes it visible |
| Legacy `addon add` projects have orphaned config state | Low | `devtronic status` detects and suggests fix |
