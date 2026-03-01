# Claude Code Plugin Mode

When you select **Claude Code** during `init`, the CLI installs skills, agents, and hooks as a **native Claude Code plugin** called `devtronic`. This page explains how it works, its architecture, and best practices.

---

## Why a Plugin?

Claude Code plugins are a packaging layer that provides:

- **Namespacing** — Skills are invoked as `/devtronic:brief`, `/devtronic:spec`, etc., avoiding collisions with other plugins or custom skills
- **Workflow hooks** — Automated actions on session start, file edits, stop, subagent completion, and context compaction
- **Isolation** — Plugin files live in `.claude-plugins/`, separate from your project's `.claude/` configuration

Other IDEs (Cursor, Antigravity, Copilot) continue using their standard file-based approach.

---

## Architecture

### Directory Structure

After running `init` with Claude Code selected:

```
your-project/
├── CLAUDE.md                           # Project rules (standalone)
├── AGENTS.md                           # Universal AI context (standalone)
│
├── .claude/
│   ├── rules/                          # Architecture rules (standalone)
│   │   └── architecture.md
│   └── settings.json                   # Plugin registration
│
├── .claude-plugins/                    # Local marketplace root
│   ├── .claude-plugin/
│   │   └── marketplace.json            # Marketplace descriptor
│   └── devtronic/                         # The plugin
│       ├── .claude-plugin/
│       │   └── plugin.json             # Plugin metadata + version
│       ├── skills/                     # 22 skills (19 core + 3 addon)
│       │   ├── brief/SKILL.md
│       │   ├── spec/SKILL.md
│       │   ├── scaffold/
│       │   │   ├── SKILL.md
│       │   │   └── (5 supporting files)
│       │   └── ...
│       ├── agents/                     # 8 agents
│       │   ├── architecture-checker.md
│       │   ├── code-reviewer.md
│       │   ├── commit-changes.md
│       │   ├── dependency-checker.md
│       │   ├── doc-sync.md
│       │   ├── error-investigator.md
│       │   ├── quality-runner.md
│       │   └── test-generator.md
│       ├── hooks/
│       │   └── hooks.json              # 5 workflow hooks
│       └── scripts/
│           ├── checkpoint.sh           # Auto-checkpoint script
│           └── stop-guard.sh           # Quality gate script
│
├── .ai-template/
│   └── manifest.json                   # Installation manifest (installMode: "plugin")
│
└── thoughts/                           # AI working documents
```

### What Stays Standalone

Not everything moves into the plugin. These remain outside:

| File | Reason |
|------|--------|
| `CLAUDE.md` | Claude Code loads it from project root by convention |
| `AGENTS.md` | Universal context for all IDEs |
| `.claude/rules/` | Claude Code plugins don't support rules — they must be in `.claude/rules/` |
| `.claude/settings.json` | User configuration, not plugin content |

### What Goes in the Plugin

| Content | Path in Plugin | Count |
|---------|---------------|-------|
| Skills | `devtronic/skills/` | 22 (19 core + 3 addon) |
| Agents | `devtronic/agents/` | 8 |
| Hooks | `devtronic/hooks/hooks.json` | 5 events |
| Scripts | `devtronic/scripts/` | 2 (checkpoint.sh, stop-guard.sh) |
| Metadata | `devtronic/.claude-plugin/plugin.json` | — |

---

## Workflow Hooks

The plugin includes 5 hooks that automate parts of your development workflow:

### SessionStart

```
Event: startup
Type: prompt (haiku)
```

Quick project orientation when opening Claude Code — checks git status, recent commits, and in-progress work. Returns a 3-line summary.

**Cost**: ~$0.002/session (Haiku)

### PostToolUse

```
Event: Write | Edit
Type: command
```

Automatically runs lint-fix after every file change. The command is personalized by your package manager:

| PM | Command |
|----|---------|
| npm | `npm run lint:fix -- --quiet` |
| pnpm | `pnpm lint:fix -- --quiet` |
| yarn | `yarn lint:fix -- --quiet` |
| bun | `bun lint:fix -- --quiet` |

Errors are suppressed (`2>/dev/null || true`) so they never block Claude.

### Stop

```
Event: (any stop)
Type: command (stop-guard.sh)
```

Quality gate before Claude stops working. Runs your project's `qualityCommand` and blocks Claude from stopping if checks fail. Includes an infinite loop guard: if `stop_hook_active` is already `true` (Claude is continuing from a previous stop hook), the script exits immediately to prevent runaway loops.

### SubagentStop

```
Event: (subagent completes)
Type: prompt (haiku)
```

Lightweight validation of subagent completion. Evaluates the agent metadata (type, session status) to assess whether the subagent finished successfully. Uses `$ARGUMENTS` for context injection and includes a `stop_hook_active` guard to prevent infinite loops.

**Cost**: ~$0.002/invocation (Haiku)

### PreCompact

```
Event: auto (context compaction)
Type: command
```

Automatically saves a checkpoint to `thoughts/checkpoints/` before Claude compacts its context window. Captures git diff stats and recent commit history so context isn't lost.

Uses `${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint.sh` which resolves to the plugin's script directory at runtime. The Stop hook similarly uses `${CLAUDE_PLUGIN_ROOT}/scripts/stop-guard.sh`.

---

## Plugin Registration

The CLI registers the plugin in `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "devtronic-local": {
      "source": {
        "source": "directory",
        "path": ".claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "devtronic@devtronic-local": true
  }
}
```

- **`extraKnownMarketplaces`** tells Claude Code where to find the local marketplace
- **`enabledPlugins`** enables the plugin (workaround for [#17832](https://github.com/anthropics/claude-code/issues/17832) where plugins don't auto-enable)

### Disabling the Plugin

```bash
# Via Claude Code CLI
claude --disable-plugin devtronic@devtronic-local

# Or manually in .claude/settings.json
"devtronic@devtronic-local": false
```

Hooks and skills will stop loading, but files remain on disk for re-enabling.

---

## Installation Methods

### CLI Installation

```bash
npx devtronic init
```

Select Claude Code when prompted. The CLI:
1. Analyzes your project (framework, PM, architecture)
2. Generates the plugin with personalized hooks
3. Registers it in `.claude/settings.json`
4. Generates standalone rules and CLAUDE.md

**Advantages**: Hooks personalized by your package manager and quality commands.

---

## Migration from Standalone

Users who installed a previous version (standalone skills in `.claude/skills/`) can migrate:

```bash
npx devtronic update
```

The CLI detects standalone installations and offers migration:

```
┌ Migration Available ──────────────────────────────────────┐
│ Claude Code skills/agents detected as standalone.         │
│ The new version uses plugin mode (namespace devtronic:).     │
└───────────────────────────────────────────────────────────┘

◆ Migrate to plugin mode? (standalone → devtronic plugin)
  Yes / No
```

### What Migration Does

1. **Generates** the devtronic plugin in `.claude-plugins/`
2. **Registers** the plugin in `.claude/settings.json`
3. **Removes** unmodified standalone files from `.claude/skills/` and `.claude/agents/`
4. **Preserves** any files the user has customized (compares checksums)
5. **Cleans** empty directories left behind
6. **Updates** the manifest with `installMode: "plugin"`

### Safety Guarantees

- Migration is **opt-in** — the user must confirm
- `update --check` only reports, never modifies
- `update --dry-run` shows what would happen without changes
- User-modified skills/agents are **preserved** and flagged
- The plugin and any remaining standalone files coexist safely (different namespaces)

---

## Updating Plugin Files

When running `update` on a project already in plugin mode:

1. Template files (rules, CLAUDE.md) update normally
2. Plugin files are re-generated from the latest templates
3. **User-modified plugin files are preserved** — the update saves their content, regenerates, then restores modified files
4. Manifest tracks which files have been customized

When the project stack changes (new libraries detected):

1. Rules are regenerated with the new stack
2. Plugin hooks are regenerated (lint command may change with new PM)
3. User modifications are still preserved

---

## Customization

### Customizing Hooks

Edit `.claude-plugins/devtronic/hooks/hooks.json` to:

- Change timeouts
- Modify lint commands
- Adjust prompt content
- Add new hook events

The manifest tracks your changes, so `update` won't overwrite them.

### Adding Custom Skills

You can add skills in two places:

- **Project-scoped**: Add to `.claude/skills/` (not namespaced, e.g., `/my-skill`)
- **Plugin-scoped**: Add to `.claude-plugins/devtronic/skills/` (namespaced, e.g., `/devtronic:my-skill`)

Use project-scoped for project-specific workflows. Use plugin-scoped only if modifying the devtronic plugin itself.

See [Customization Guide](./customization.md) for creating custom skills.

### Disabling Individual Hooks

To disable a specific hook without removing the plugin, remove it from `hooks.json`. For example, to disable auto-linting:

```json
{
  "hooks": {
    "PostToolUse": []
  }
}
```

---

## Troubleshooting

### Skills Not Appearing

If `/devtronic:brief` doesn't work after installation:

1. Check `.claude/settings.json` has the marketplace and plugin entries
2. Verify `.claude-plugins/devtronic/.claude-plugin/plugin.json` exists
3. Restart Claude Code (plugins load at session start)
4. Run `claude --list-plugins` to check if the plugin is detected

### Hooks Not Firing

Known issue ([#19893](https://github.com/anthropics/claude-code/issues/19893)): disabled plugin hooks may still fire. If you disable the plugin but hooks continue, remove the hooks.json file or rename it.

### Plugin Not Persisting Between Sessions

Ensure `.claude-plugins/` is committed to git or is in a persistent location. Session-only plugins (`--plugin-dir`) don't persist. The local marketplace approach used by this CLI ensures persistence.

---

## Technical Details

### Manifest

The installation manifest at `.ai-template/manifest.json` includes:

```json
{
  "version": "1.9.0",
  "installMode": "plugin",
  "pluginPath": ".claude-plugins/devtronic",
  "files": {
    ".claude-plugins/devtronic/skills/brief/SKILL.md": {
      "checksum": "a1b2c3...",
      "originalChecksum": "a1b2c3...",
      "modified": false
    }
  }
}
```

- `installMode`: `"plugin"` for plugin installations, absent for legacy standalone
- `pluginPath`: relative path to the plugin root
- `files`: tracks every generated file with checksums for detecting user modifications

### Local Marketplace Structure

Claude Code recognizes a local marketplace through:

```
.claude-plugins/                    ← marketplace root
├── .claude-plugin/
│   └── marketplace.json            ← declares available plugins
└── devtronic/                         ← plugin directory
    └── .claude-plugin/
        └── plugin.json             ← plugin metadata
```

The `marketplace.json` references plugins by relative path:

```json
{
  "name": "devtronic-local",
  "plugins": [
    { "name": "devtronic", "source": "./devtronic" }
  ]
}
```

### Environment Variables

- `${CLAUDE_PLUGIN_ROOT}` — Resolves to the plugin's root directory at runtime. Used in hook commands to reference scripts without hardcoded paths.
