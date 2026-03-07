# CLI Reference

Complete reference for the `devtronic` CLI.

---

## Installation

The CLI can be run directly with npx (no installation required):

```bash
npx devtronic [command]
```

Or install globally:

```bash
npm install -g devtronic
devtronic [command]
```

---

## Commands

### init

Initialize devtronic in a project.

```bash
npx devtronic init [path] [options]
```

**Arguments:**
- `path` - Target directory (default: current directory)

**Options:**
| Option | Description |
|--------|-------------|
| `--ide <ides>` | IDEs to configure, comma-separated (e.g., `claude-code,cursor`) |
| `--preset <name>` | Use a preset configuration |
| `-y, --yes` | Skip prompts, use detected defaults |
| `--preview` | Show what would be generated without making changes |

**Examples:**

```bash
# Interactive initialization
npx devtronic init

# Initialize specific directory
npx devtronic init /path/to/project

# Specific IDEs without prompts
npx devtronic init --ide claude-code,cursor -y

# Preview mode (no changes)
npx devtronic init --preview

# Use a preset
npx devtronic init --preset nextjs-clean
```

**Process:**
1. Analyzes project (framework, architecture, stack)
2. Asks for confirmation or adjustments
3. Asks which IDEs to configure
4. For existing configs, asks how to handle conflicts
5. Offers optional addon packs via multiselect (Claude Code only)
6. Generates personalized configuration
7. Creates manifest for future updates

---

### update

Update to the latest template version.

```bash
npx devtronic update [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--check` | Only check for updates, don't apply |
| `--dry-run` | Show what would change without applying |

**Examples:**

```bash
# Check for updates
npx devtronic update --check

# Apply updates
npx devtronic update

# Preview updates
npx devtronic update --dry-run
```

**Features:**
- Detects files you've modified locally (preserves them)
- Detects stack changes (e.g., "Added ORM: Drizzle")
- Offers to regenerate rules if stack changed
- Updates unmodified files to latest template

---

### add

Add another IDE configuration to an existing installation.

```bash
npx devtronic add [ide]
```

**Arguments:**
- `ide` - IDE to add (optional, prompts if not provided)

**Available IDEs:**
- `claude-code`
- `cursor`
- `antigravity`
- `github-copilot`
- `opencode`

**Examples:**

```bash
# Interactive selection
npx devtronic add

# Add specific IDE
npx devtronic add cursor
npx devtronic add antigravity
```

---

### addon

Manage optional addon skill packs. Addons can be selected during `init` or added at any time.

#### addon list

```bash
npx devtronic addon list [options]
```

Shows all available addons with their status (installed / available) and description.

**Options:**
| Option | Description |
|--------|-------------|
| `--path <path>` | Target directory (default: current directory) |

**Available addons:**

| Addon | Skills | Agents | Description |
|-------|--------|--------|-------------|
| `orchestration` | `/devtronic:briefing`, `/devtronic:recap`, `/devtronic:handoff` | — | Pre-planning alignment, session recaps, context rotation for long multi-session work |
| `design-best-practices` | `/devtronic:design-init`, `/devtronic:design-review`, `/devtronic:design-refine`, `/devtronic:design-system`, `/devtronic:design-harden` | — | Frontend design quality: typography, color, layout, accessibility, motion, UX writing |
| `auto-devtronic` | `/devtronic`, `/devtronic:validate-task-afk` | `issue-parser`, `failure-analyst`, `quality-runner` | Autonomous engineering loop — takes a GitHub issue, runs spec→test→plan→execute→PR pipeline, self-corrects via failing tests |

#### addon enable / addon disable

```bash
npx devtronic addon enable <name> [options]
npx devtronic addon disable <name> [options]
```

**Arguments:**
- `name` - Addon name: `orchestration`, `design-best-practices`, or `auto-devtronic`

**Options:**
| Option | Description |
|--------|-------------|
| `--path <path>` | Target directory (default: current directory) |

**Examples:**

```bash
# See what's available and what's installed
npx devtronic addon list

# Install an addon
npx devtronic addon enable orchestration
npx devtronic addon enable design-best-practices
npx devtronic addon enable auto-devtronic

# Remove an addon
npx devtronic addon disable design-best-practices
```

**Notes:**
- `orchestration` requires Claude Code in plugin mode (selected during `devtronic init`)
- `design-best-practices` and `auto-devtronic` work in both standalone and plugin mode — files are placed in `.claude/skills/`, `.claude/agents/`, and `.claude/rules/`
- All commands show a preview and ask for confirmation before proceeding
- Disable warns about locally modified files before deleting them

#### addon sync

```bash
npx devtronic addon sync [options]
```

Regenerates addon files after changing agent targets in `devtronic.json`. Preserves user-customized files.

**Options:**
| Option | Description |
|--------|-------------|
| `--path <path>` | Target directory (default: current directory) |

---

### regenerate

Regenerate configuration files.

```bash
npx devtronic regenerate [target] [options]
```

**Arguments:**
- `target` - What to regenerate (e.g., `AGENTS.md`)

**Options:**
| Option | Description |
|--------|-------------|
| `--rules` | Regenerate architecture rules for all IDEs |
| `--all` | Regenerate everything |

**Examples:**

```bash
# Regenerate AGENTS.md with current stack
npx devtronic regenerate AGENTS.md

# Regenerate all architecture rules
npx devtronic regenerate --rules

# Regenerate everything
npx devtronic regenerate --all
```

**Use when:**
- You've manually changed your stack
- You want to refresh generated content
- Your stack detection was wrong and you've corrected it

---

### status

Show installation status.

```bash
npx devtronic status
```

**Shows:**
- Installed version
- Installation date
- Selected IDEs
- Detected stack configuration
- Files tracked in manifest

---

### diff

Show differences between current files and template.

```bash
npx devtronic diff
```

**Shows:**
- Files you've modified vs original template
- Files that are newer in the template
- Files that exist only locally

---

### info

Show version, configuration, and installation summary at a glance.

```bash
npx devtronic info
```

**Shows:**
- CLI version with update check (queries npm registry)
- Installation date and selected IDEs
- Install mode (standalone or plugin)
- Skill and agent counts
- Framework and architecture

**Example output:**

```
◆ devtronic Info

  devtronic
  Version:       1.1.0 (latest)
  Installed:     2026-02-27
  IDEs:          claude-code, cursor
  Mode:          plugin
  Skills:        31
  Agents:        15
  Framework:     nextjs
  Architecture:  clean
```

---

### list

List installed skills and agents with their descriptions.

```bash
npx devtronic list [filter] [options]
```

**Arguments:**
- `filter` - Optional: `skills` or `agents` to show only one type

**Options:**
| Option | Description |
|--------|-------------|
| `--path <path>` | Target directory (default: current directory) |

**Examples:**

```bash
# List everything
npx devtronic list

# List only skills
npx devtronic list skills

# List only agents
npx devtronic list agents
```

Discovers skills from the plugin directory (directories with `SKILL.md`) or `.claude/` for standalone installs. Reads the first line after the heading in each skill/agent markdown file as a description.

---

### config

View or manage project configuration.

```bash
npx devtronic config [options]                    # Show current config
npx devtronic config set <key> <value> [options]  # Set a value
npx devtronic config reset [options]              # Re-detect from project
```

**Options:**
| Option | Description |
|--------|-------------|
| `--path <path>` | Target directory (default: current directory) |

**Valid keys:**

| Key | Type | Example |
|-----|------|---------|
| `architecture` | string | `clean`, `layered`, `feature-based`, `mvc`, `flat`, `none` |
| `framework` | string | `nextjs`, `react`, `vue` |
| `qualityCommand` | string | `pnpm typecheck && pnpm lint` |
| `layers` | array | `domain,application,infrastructure` |
| `stateManagement` | array | `zustand,jotai` |
| `dataFetching` | array | `react-query` |
| `orm` | array | `prisma` |
| `testing` | array | `vitest,playwright` |
| `ui` | array | `tailwind,radix` |
| `validation` | array | `zod` |

Array keys accept comma-separated values.

**Examples:**

```bash
# View current configuration
npx devtronic config

# Change framework
npx devtronic config set framework react

# Update testing libraries
npx devtronic config set testing vitest,playwright

# Re-detect everything from project
npx devtronic config reset
```

---

### doctor

Run health checks on your devtronic installation.

```bash
npx devtronic doctor [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--fix` | Auto-fix fixable issues |
| `--path <path>` | Target directory (default: current directory) |

**Checks performed:**

| # | Check | Fixable |
|---|-------|---------|
| 1 | Manifest exists and is valid | - |
| 2 | All manifest files exist on disk | - |
| 3 | Shell scripts have executable permissions | Yes (chmod +x) |
| 4 | Plugin registered in .claude/settings.json | Yes (adds entry) |
| 5 | Hook scripts point to existing files | - |
| 6 | Quality scripts in package.json (typecheck, lint, test) | - |
| 7 | thoughts/ directory structure | Yes (creates dirs) |
| 8 | eslint available | - |

**Examples:**

```bash
# Run diagnostics
npx devtronic doctor

# Auto-fix what can be fixed
npx devtronic doctor --fix
```

**Example output:**

```
◆ devtronic Doctor

  Health Check
  ✓ Manifest is valid (v1.0.0)
  ✓ 42/42 manifest files exist
  ✓ Scripts have executable permissions
  ✓ Plugin registered in .claude/settings.json
  ✓ Hook scripts exist
  ⚠ Missing package.json script: test (fixable)
  ✓ thoughts/ directory exists
  ✓ eslint is available

  7 passed, 1 warning

  Run devtronic doctor --fix to auto-fix 1 issue.
```

---

### presets

List available presets.

```bash
npx devtronic presets
```

**Available Presets:**

| Preset | Description |
|--------|-------------|
| `nextjs-clean` | Next.js with Clean Architecture |
| `react-clean` | React (Vite) with Clean Architecture |
| `monorepo` | Monorepo with Clean Architecture per app |
| `feature-based` | Feature-based architecture (co-located modules) |
| `minimal` | Quality checks only, no architecture rules |

---

## What Gets Detected

### Framework Detection

Detected from `package.json` dependencies:
- Next.js
- React (Vite, CRA)
- Vue
- Express
- NestJS
- Astro
- SvelteKit

### Architecture Detection

Detected from directory structure:
- **Clean Architecture** - domain/, application/, infrastructure/ folders
- **Layered** - routes/, controllers/, services/, repositories/ folders
- **Feature-based** - features/ or modules/ folders
- **MVC** - models/, views/, controllers/ folders
- **Flat** - No clear structure

### Stack Detection

Detected from `package.json`:

| Category | Detected Libraries |
|----------|-------------------|
| State Management | Zustand, Redux, Jotai, MobX, XState |
| Data Fetching | React Query, SWR, Apollo, tRPC |
| ORM | Prisma, Drizzle, TypeORM, Mongoose |
| Testing | Vitest, Jest, Playwright, Cypress |
| UI | Tailwind, Chakra, MUI, Radix, shadcn |
| Validation | Zod, Yup, Valibot |

### Scripts Detection

Detected from `package.json` scripts:
- `typecheck` or `type-check`
- `lint`
- `test`
- `build`
- `dev`

Used to generate the quality command in AGENTS.md.

---

## Generated Files

### Dynamic (Personalized)

Generated based on your detected stack:

| File | Content |
|------|---------|
| `AGENTS.md` | Commands, architecture, patterns for your stack |
| `.claude/rules/architecture.md` | Architecture rules matching your patterns |
| `.cursor/rules/architecture.mdc` | Same for Cursor (MDC format) |
| `.agents/rules/architecture.md` | Same for Google Antigravity |

### Static (Copied)

Copied from templates:

| Directory | Content |
|-----------|---------|
| `.claude/skills/` | 31 workflow skills (19 core + 12 design) |
| `.claude/agents/` | 15 specialized agents (8 core + 7 design) |
| `.claude/rules/quality.md` | Quality check rules |
| `thoughts/` | Directory structure for AI documents |

---

## IDE Feature Matrix

| Feature | Claude Code | Cursor | Antigravity | GitHub Copilot | OpenCode |
|---------|-------------|--------|-------------|----------------|----------|
| Skills (31) | ✓ | - | - | - | - |
| Agents (15) | ✓ | - | - | - | - |
| Rules | ✓ | ✓ | ✓ | Partial | ✓ |
| AGENTS.md | ✓ | ✓ | ✓ | - | ✓ |
| thoughts/ | ✓ | ✓ | ✓ | - | ✓ |

> **Note**: Skills and agents only work in Claude Code. Other IDEs receive architecture and quality rules.

---

## Conflict Resolution

When existing configs are found, you can choose:

| Option | Behavior |
|--------|----------|
| **Merge** | Add new sections to Markdown, deep merge JSON, preserve existing |
| **Keep** | Skip files that already exist |
| **Replace** | Overwrite with template files |

### Merge Details

**Markdown files** (`.md`, `.mdc`):
- Parses into sections by headers
- Keeps all your existing sections
- Adds new sections from template that don't exist in yours

**JSON files**:
- Deep merge preserving existing values
- Only adds keys that don't exist

See [Existing Projects Guide](./existing-projects.md) for detailed examples.

---

## Manifest

After installation, a manifest is created at `.ai-template/manifest.json`:

```json
{
  "version": "1.0.0",
  "implantedAt": "2026-02-01",
  "selectedIDEs": ["claude-code", "cursor"],
  "projectConfig": {
    "architecture": "clean",
    "layers": ["domain", "application", "infrastructure"],
    "stateManagement": ["zustand"],
    "dataFetching": ["react-query"],
    "orm": ["prisma"],
    "testing": ["vitest"],
    "ui": ["tailwind"],
    "validation": ["zod"],
    "framework": "nextjs",
    "qualityCommand": "pnpm typecheck && pnpm lint && pnpm test"
  },
  "files": {
    "AGENTS.md": {
      "checksum": "abc123...",
      "originalChecksum": "abc123..."
    }
  }
}
```

**Used for:**
- Detecting modified files (via checksums)
- Tracking installed version
- Storing detected stack for comparison
- Knowing which IDEs were configured

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (directory not found, no manifest, etc.) |

---

## Environment Variables

None required. The CLI reads all configuration from the target project.

---

## Recommended .gitignore

After installation, add to your `.gitignore`:

```gitignore
# devtronic
thoughts/checkpoints/
.claude/settings.local.json
CLAUDE.local.md
.ai-template/
```

---

## Related Documentation

- [Existing Projects Guide](./existing-projects.md) - Integration with existing configs
- [Skills Reference](./skills.md) - What each skill does
- [Agents Reference](./agents.md) - What each agent does
- [Customization Guide](./customization.md) - How to customize
