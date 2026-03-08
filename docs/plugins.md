# Claude Code Plugin Mode

When you select **Claude Code** during `init`, the CLI registers the devtronic plugin from a **GitHub-hosted marketplace**. Skills, agents, and hooks are fetched remotely — no plugin files are stored in your project.

—-

## Why a Plugin?

Claude Code plugins provide:

- **Namespacing** — Skills are auto-namespaced as `/devtronic:skill-name`. Both `/skill-name` and `/devtronic:skill-name` work
- **Workflow hooks** — Automated actions on session start, file edits, stop, subagent completion, and context compaction
- **Remote distribution** — Plugin content lives in a GitHub repo, automatically cached and version-updated by Claude Code

Other IDEs (Cursor, Antigravity, Copilot) continue using their standard file-based approach.

—-

## Architecture

### How It Works

```
npx devtronic init .
       |
       v
  settings.json (.claude/)
  +----------------------------------------------+
  | extraKnownMarketplaces: {                    |
  |   "devtronic": {                             |
  |     source: { source: "github",              |
  |               repo: "r-bart/devtronic-       |
  |                      plugin" }               |
  |   }                                          |
  | }                                            |
  | enabledPlugins: {                            |
  |   "devtronic@devtronic": true                |
  | }                                            |
  +----------------------------------------------+
       |
       v
  Claude Code at startup:
  1. Reads settings.json
  2. Clones r-bart/devtronic-plugin (cached)
  3. Reads marketplace.json -> finds plugin "devtronic"
  4. Reads plugin.json -> checks version
  5. Loads skills/, agents/, hooks/
  6. Skills available as /devtronic:brief, /devtronic:spec, etc.
```

### What's in Your Project

After `npx devtronic init` with Claude Code selected:

```
your-project/
├── CLAUDE.md                           # Project rules
├── AGENTS.md                           # Universal AI context
│
├── .claude/
│   ├── rules/                          # Architecture rules
│   │   └── architecture.md
│   └── settings.json                   # Marketplace registration
│
├── .ai-template/
│   └── manifest.json                   # Installation manifest (installMode: "marketplace")
│
└── thoughts/                           # AI working documents
```

No plugin files in your project — skills, agents, and hooks live in the [marketplace repo](https://github.com/r-bart/devtronic-plugin).

### What's in the Marketplace Repo

The marketplace repo (`r-bart/devtronic-plugin`) contains:

```
├── .claude-plugin/
│   └── marketplace.json                # Marketplace descriptor
├── plugins/devtronic/
│   ├── .claude-plugin/
│   │   └── plugin.json                 # Plugin metadata + version
│   ├── skills/                         # 35+ skills (20 core + 12 design + addon)
│   │   ├── brief/SKILL.md
│   │   ├── spec/SKILL.md
│   │   ├── scaffold/
│   │   │   ├── SKILL.md
│   │   │   └── (supporting files)
│   │   └── ...
│   ├── agents/                         # 15 agents (8 core + 7 design)
│   ├── hooks/
│   │   └── hooks.json                  # 5 workflow hooks
│   └── scripts/
│       ├── stop-guard.sh
│       ├── auto-lint.sh
│       └── checkpoint.sh
├── LICENSE
└── README.md
```

### What Stays Standalone

These remain in your project (not in the plugin):

| File | Reason |
|------|--------|
| `CLAUDE.md` | Claude Code loads it from project root by convention |
| `AGENTS.md` | Universal context for all IDEs |
| `.claude/rules/` | Claude Code plugins don't support rules |
| `.claude/settings.json` | User configuration, not plugin content |

—-

## Workflow Hooks

The plugin includes 5 hooks that automate parts of your development workflow:

### SessionStart

```
Event: startup
Type: prompt (haiku)
```

Quick project orientation — checks git status, recent commits, and in-progress work.

**Cost**: ~$0.002/session

### PostToolUse

```
Event: Write | Edit
Type: command
```

Auto-runs lint-fix after every file change. Auto-detects your package manager. Errors suppressed so they never block Claude.

### Stop

```
Event: (any stop)
Type: command (stop-guard.sh)
```

Quality gate before Claude stops. Runs typecheck + lint and blocks stop if checks fail. Includes infinite loop guard.

### SubagentStop

```
Event: (subagent completes)
Type: prompt (haiku)
```

Lightweight validation of subagent completion.

**Cost**: ~$0.002/invocation

### PreCompact

```
Event: auto (context compaction)
Type: command
```

Auto-saves checkpoint to `thoughts/checkpoints/` before context compaction.

Uses `${CLAUDE_PLUGIN_ROOT}/scripts/` which resolves to the plugin's script directory at runtime.

—-

## Plugin Registration

The CLI registers the plugin in `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "devtronic": {
      "source": {
        "source": "github",
        "repo": "r-bart/devtronic-plugin"
      }
    }
  },
  "enabledPlugins": {
    "devtronic@devtronic": true
  }
}
```

- **`extraKnownMarketplaces`** tells Claude Code where to find the marketplace repo
- **`enabledPlugins`** enables the plugin

### Disabling the Plugin

```bash
# Via Claude Code
claude —disable-plugin devtronic@devtronic

# Or manually in .claude/settings.json
"devtronic@devtronic": false
```

Hooks and skills will stop loading. Re-enable by setting back to `true`.

—-

## Installation Methods

### CLI (Recommended)

```bash
npx devtronic init
```

Select Claude Code when prompted. The CLI:

1. Analyzes your project (framework, PM, architecture)
2. Registers the GitHub marketplace in settings.json
3. Generates standalone rules and CLAUDE.md
4. Creates AGENTS.md with your stack

### Plugin Marketplace (Direct)

In Claude Code:

```
/plugin marketplace add r-bart/devtronic-plugin
/plugin install devtronic@devtronic
```

Gets you skills, agents, and hooks immediately. For full setup (rules, AGENTS.md, stack detection), use the CLI.

### Manual

Add to `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "devtronic": {
      "source": { "source": "github", "repo": "r-bart/devtronic-plugin" }
    }
  },
  "enabledPlugins": {
    "devtronic@devtronic": true
  }
}
```

—-

## Migration from Standalone

Users who installed a previous version (standalone skills in `.claude/skills/`) can migrate:

```bash
npx devtronic update
```

The CLI detects standalone installations and offers migration:

```
┌ Migration Available ──────────────────────────────────────┐
│ Claude Code skills/agents detected as standalone.         │
│ The new version uses the GitHub marketplace plugin.       │
└───────────────────────────────────────────────────────────┘

◆ Migrate to marketplace mode? (standalone → marketplace)
  Yes / No
```

### What Migration Does

1. **Registers** the GitHub marketplace in settings.json
2. **Removes** unmodified standalone files from `.claude/skills/` and `.claude/agents/`
3. **Preserves** any files the user has customized (compares checksums)
4. **Cleans** empty directories left behind
5. **Updates** the manifest with `installMode: "marketplace"`

### Migration from Local Plugin

Users with the older local plugin (`.claude-plugins/` directory) are also migrated automatically:

1. **Registers** the GitHub marketplace (replaces local marketplace)
2. **Removes** the `.claude-plugins/devtronic/` directory
3. **Cleans** legacy settings (`devtronic-local` marketplace entries)

### Safety Guarantees

- Migration is **opt-in** — the user must confirm
- `update —check` only reports, never modifies
- `update —dry-run` shows what would happen without changes
- User-modified skills/agents are **preserved** and flagged

—-

## Updating Plugin Content

Plugin content (skills, agents, hooks) updates automatically:

1. On each CLI release, CI syncs the latest content to `r-bart/devtronic-plugin`
2. The `plugin.json` version is bumped to match the CLI version
3. Claude Code compares the cached version with the remote version
4. If newer, it fetches the updated content automatically

**You don't need to run `npx devtronic update` for plugin content.** The `update` command is for standalone files (rules, CLAUDE.md, AGENTS.md).

—-

## Customization

### Adding Custom Skills

Add project-specific skills to `.claude/skills/` (not namespaced):

```
.claude/skills/my-workflow/SKILL.md → /my-workflow
```

These are separate from devtronic plugin skills and won't be affected by updates.

### Disabling Individual Hooks

Hooks are defined in the marketplace repo and can't be edited locally. To disable specific hooks, you can override them at the project level in `.claude/settings.json` or disable the entire plugin. See [Claude Code hooks documentation](https://docs.anthropic.com/en/docs/claude-code/hooks) for override options.

—-

## Addon System

devtronic ships three optional addon packs:

| Addon | Type | Skills | Agents |
|-------|------|--------|--------|
| `orchestration` | Marketplace | `briefing`, `recap`, `handoff` | — |
| `design-best-practices` | File-mode | `design-init`, `design-critique`, `design-refine`, `design-tokens`, `design-harden` | — |
| `auto-devtronic` | File-mode | `auto-devtronic`, `validate-task-afk` | `issue-parser`, `failure-analyst`, `quality-executor` |

### Marketplace Addons (orchestration)

The `orchestration` addon installs into the marketplace plugin. Skills are auto-namespaced as `/devtronic:briefing`, etc.

### File-Mode Addons (design-best-practices, auto-devtronic)

File-mode addons install directly into `.claude/skills/`, `.claude/agents/`, `.claude/rules/`. They work in both standalone and marketplace mode.

### Managing Addons

```bash
npx devtronic addon list
npx devtronic addon enable orchestration
npx devtronic addon disable design-best-practices
npx devtronic addon sync
```

—-

## Troubleshooting

### Skills Not Appearing

If `/devtronic:brief` doesn't work:

1. Check `.claude/settings.json` has the marketplace and plugin entries
2. Restart Claude Code (plugins load at session start)
3. Run `claude —list-plugins` to check if the plugin is detected
4. Try `/plugin marketplace add r-bart/devtronic-plugin` to re-add

### Hooks Not Firing

Known issue: disabled plugin hooks may still fire. If you disable the plugin but hooks continue, check Claude Code's plugin management.

—-

## Technical Details

### Manifest

The installation manifest at `.ai-template/manifest.json` includes:

```json
{
  "version": "1.2.6",
  "installMode": "marketplace",
  "files": {
    "CLAUDE.md": {
      "checksum": "a1b2c3...",
      "originalChecksum": "a1b2c3...",
      "modified": false
    }
  }
}
```

- `installMode`: `"marketplace"` for GitHub marketplace installations
- `files`: tracks standalone files (rules, CLAUDE.md, AGENTS.md) with checksums

### Environment Variables

- `${CLAUDE_PLUGIN_ROOT}` — Resolves to the plugin's cached directory at runtime. Used in hook scripts.
- `${CLAUDE_SKILL_DIR}` — Resolves to the skill's own directory. Used for auxiliary files within a skill.
