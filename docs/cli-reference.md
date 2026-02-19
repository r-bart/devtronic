# CLI Reference

Complete reference for the `@tutellus/agentic-architecture` CLI.

---

## Installation

The CLI can be run directly with npx (no installation required):

```bash
npx @tutellus/agentic-architecture [command]
```

Or install globally:

```bash
npm install -g @tutellus/agentic-architecture
agentic-architecture [command]
```

---

## Commands

### init

Initialize AI Agentic Architecture in a project.

```bash
npx @tutellus/agentic-architecture init [path] [options]
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
npx @tutellus/agentic-architecture init

# Initialize specific directory
npx @tutellus/agentic-architecture init /path/to/project

# Specific IDEs without prompts
npx @tutellus/agentic-architecture init --ide claude-code,cursor -y

# Preview mode (no changes)
npx @tutellus/agentic-architecture init --preview

# Use a preset
npx @tutellus/agentic-architecture init --preset nextjs-clean
```

**Process:**
1. Analyzes project (framework, architecture, stack)
2. Asks for confirmation or adjustments
3. Asks which IDEs to configure
4. For existing configs, asks how to handle conflicts
5. Generates personalized configuration
6. Creates manifest for future updates

---

### update

Update to the latest template version.

```bash
npx @tutellus/agentic-architecture update [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--check` | Only check for updates, don't apply |
| `--dry-run` | Show what would change without applying |

**Examples:**

```bash
# Check for updates
npx @tutellus/agentic-architecture update --check

# Apply updates
npx @tutellus/agentic-architecture update

# Preview updates
npx @tutellus/agentic-architecture update --dry-run
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
npx @tutellus/agentic-architecture add [ide]
```

**Arguments:**
- `ide` - IDE to add (optional, prompts if not provided)

**Available IDEs:**
- `claude-code`
- `cursor`
- `antigravity`
- `github-copilot`

**Examples:**

```bash
# Interactive selection
npx @tutellus/agentic-architecture add

# Add specific IDE
npx @tutellus/agentic-architecture add cursor
npx @tutellus/agentic-architecture add antigravity
```

---

### regenerate

Regenerate configuration files.

```bash
npx @tutellus/agentic-architecture regenerate [target] [options]
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
npx @tutellus/agentic-architecture regenerate AGENTS.md

# Regenerate all architecture rules
npx @tutellus/agentic-architecture regenerate --rules

# Regenerate everything
npx @tutellus/agentic-architecture regenerate --all
```

**Use when:**
- You've manually changed your stack
- You want to refresh generated content
- Your stack detection was wrong and you've corrected it

---

### status

Show installation status.

```bash
npx @tutellus/agentic-architecture status
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
npx @tutellus/agentic-architecture diff
```

**Shows:**
- Files you've modified vs original template
- Files that are newer in the template
- Files that exist only locally

---

### presets

List available presets.

```bash
npx @tutellus/agentic-architecture presets
```

**Available Presets:**

| Preset | Description |
|--------|-------------|
| `nextjs-clean` | Next.js with Clean Architecture |
| `react-clean` | React (Vite) with Clean Architecture |
| `monorepo` | Monorepo with Clean Architecture per app |

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
| `.agent/rules/architecture.md` | Same for Google Antigravity |

### Static (Copied)

Copied from templates:

| Directory | Content |
|-----------|---------|
| `.claude/skills/` | 14 workflow skills |
| `.claude/agents/` | 3 specialized agents |
| `.claude/rules/quality.md` | Quality check rules |
| `thoughts/` | Directory structure for AI documents |

---

## IDE Feature Matrix

| Feature | Claude Code | Cursor | Antigravity | GitHub Copilot |
|---------|-------------|--------|-------------|----------------|
| Skills (14) | ✓ | - | - | - |
| Agents (3) | ✓ | - | - | - |
| Rules | ✓ | ✓ | ✓ | Partial |
| AGENTS.md | ✓ | ✓ | ✓ | - |
| thoughts/ | ✓ | ✓ | ✓ | - |

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
  "version": "1.8.0",
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
# AI Agentic Architecture
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
