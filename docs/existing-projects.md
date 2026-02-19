# Integrating with Existing Projects

This guide explains how to integrate AI Agentic Architecture into a project that already has its own configuration (skills, CLAUDE.md, subagents, rules, etc.).

## Overview

The CLI is **designed specifically for existing projects**. It detects what you already have and offers intelligent merge options to add new capabilities without overwriting your customizations.

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DETECT                                                      │
│     └── Scan for existing configs (.claude/, CLAUDE.md, etc.)  │
│                                                                 │
│  2. ANALYZE                                                     │
│     └── Detect your stack (framework, ORM, state, testing)     │
│                                                                 │
│  3. ASK                                                         │
│     └── How to handle conflicts: merge/keep/replace            │
│                                                                 │
│  4. APPLY                                                       │
│     └── Generate personalized config based on your stack       │
│                                                                 │
│  5. TRACK                                                       │
│     └── Save manifest for future updates                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Preview first (no changes)
npx @tutellus/agentic-architecture init --preview

# Run initialization
npx @tutellus/agentic-architecture init

# Select "Merge intelligently" when prompted for existing configs
```

---

## What Gets Detected

### Existing Configurations

| IDE | Detected Paths |
|-----|----------------|
| Claude Code | `.claude/`, `CLAUDE.md`, `AGENTS.md` |
| Cursor | `.cursor/`, `.cursorrules` |
| Google Antigravity | `.agent/`, `.antigravity/` |
| GitHub Copilot | `.github/copilot-instructions.md` |

### Your Technology Stack

The CLI analyzes `package.json` and directory structure to detect:

- **Framework**: Next.js, React, Vue, Express, NestJS, Astro, SvelteKit
- **Architecture**: Clean Architecture, MVC, Feature-based, Flat
- **State Management**: Zustand, Redux, Jotai, MobX, XState
- **Data Fetching**: React Query, SWR, Apollo, tRPC
- **ORM**: Prisma, Drizzle, TypeORM, Mongoose
- **Testing**: Vitest, Jest, Playwright, Cypress
- **UI**: Tailwind, Chakra, MUI, Radix, shadcn
- **Validation**: Zod, Yup, Valibot
- **Scripts**: typecheck, lint, test, build, dev

---

## Conflict Resolution

When the CLI detects existing configuration for an IDE, it asks how to handle it:

```
? claude-code config already exists. How should we handle it?
  ● Merge intelligently   ← Add new sections, keep existing customizations
    Keep existing         ← Skip files that already exist
    Replace               ← Overwrite with template files
```

### Option 1: Merge Intelligently (Recommended)

The merge is **section-aware for Markdown files**:

```
Your CLAUDE.md:                  Template:                    Result:
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│ # My Project        │     │ # AI Agents Guide   │     │ # My Project        │ ← Kept
│                     │     │                     │     │                     │
│ ## My Custom Rules  │     │ ## Quick Start      │     │ ## My Custom Rules  │ ← Kept
│ - Rule 1            │  +  │ 1. Read CLAUDE.md   │  =  │ - Rule 1            │
│ - Rule 2            │     │                     │     │ - Rule 2            │
│                     │     │ ## Architecture     │     │                     │
│ ## Quick Start      │     │ Clean + DDD         │     │ ## Quick Start      │ ← Kept (existed)
│ My custom version   │     │                     │     │ My custom version   │
│                     │     │ ## Code Patterns    │     │                     │
│                     │     │ ...                 │     │ ## Architecture     │ ← Added (new)
│                     │     │                     │     │                     │
│                     │     │                     │     │ ## Code Patterns    │ ← Added (new)
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

**How it works:**
1. Parses both files into sections (by headers)
2. Keeps all your existing sections unchanged
3. Adds new sections from the template that don't exist in yours
4. Preserves your section content even if the template has the same section name

**For JSON files** (like `settings.json`):
- Deep merge that preserves existing values
- Only adds keys that don't exist in yours

### Option 2: Keep Existing

Skips any file that already exists. Use this when:
- You're happy with your current config
- You only want new files added
- You want to manually review and merge later

### Option 3: Replace

Overwrites existing files with template versions. Use this when:
- You want a fresh start
- Your existing config is outdated
- You prefer template defaults

---

## Skills and Agents: File-Level Preservation

Skills and agents are individual files. The merge logic works at the file level:

### What Happens

```
Your project:                      Template:
.claude/                           .claude/
├── skills/                        ├── skills/
│   ├── my-custom-skill.md    ←── Kept (yours)
│   └── spec.md               ←── Kept (you have it)     ├── spec.md
│                                  ├── plan.md
│                                  ├── research.md
│                                  └── review.md
└── agents/                        └── agents/
    └── my-agent.md           ←── Kept (yours)           ├── code-reviewer.md
                                                          └── quality-runner.md

Result:
.claude/
├── skills/
│   ├── my-custom-skill.md    ← Preserved
│   ├── spec.md               ← Preserved (not overwritten)
│   ├── plan.md               ← NEW from template
│   ├── research.md           ← NEW from template
│   └── review.md             ← NEW from template
└── agents/
    ├── my-agent.md           ← Preserved
    ├── code-reviewer.md      ← NEW from template
    └── quality-runner.md     ← NEW from template
```

### Important Note

If you have a skill with the **same filename** as a template skill (e.g., both have `spec.md`):
- With **Merge**: Your version is kept, template version is skipped
- With **Keep**: Your version is kept
- With **Replace**: Your version is overwritten

If you want to see what's different, run:
```bash
npx @tutellus/agentic-architecture diff
```

---

## Generated vs Copied Files

The template has two types of files:

### Static Files (Copied)

Copied directly from templates:
- `.claude/skills/*.md` - Workflow skills
- `.claude/agents/*.md` - Specialized agents
- `.claude/rules/quality.md` - Quality rules
- `thoughts/` directory structure

### Dynamic Files (Generated)

Generated based on your detected stack:
- `AGENTS.md` - Personalized with your framework, state management, ORM, etc.
- `.claude/rules/architecture.md` - Architecture rules matching your patterns
- `.cursor/rules/architecture.mdc` - Same for Cursor (if selected)

This means your `AGENTS.md` will include your actual:
- Package manager commands (`pnpm` vs `npm` vs `yarn`)
- Quality check scripts (`pnpm typecheck && pnpm lint`)
- Architecture layers if detected
- Stack-specific patterns (Zustand stores, React Query, etc.)

---

## The Manifest System

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

This enables:
- **Update detection**: Know when new template versions are available
- **Stack change detection**: Detect when you add/remove libraries
- **Modified file tracking**: Know which files you've customized

---

## Updating After Installation

### Check for Updates

```bash
npx @tutellus/agentic-architecture update --check
```

Shows:
- Template version changes
- Stack changes detected (e.g., "Added ORM: Drizzle")
- Files that would be updated

### Apply Updates

```bash
npx @tutellus/agentic-architecture update
```

The update process:
1. Detects files you've modified locally (via checksums)
2. Shows which files would be updated
3. **Preserves your modified files** - only updates unmodified files
4. Offers to regenerate if stack changes detected

### Preview Updates

```bash
npx @tutellus/agentic-architecture update --dry-run
```

Shows what would change without making changes.

---

## Common Scenarios

### Scenario 1: Adding to a Project with Custom CLAUDE.md

You have a detailed `CLAUDE.md` with project-specific rules.

**Recommended approach:**
```bash
npx @tutellus/agentic-architecture init
# Select: Merge intelligently for claude-code
```

Result:
- Your custom rules are preserved
- New sections (Architecture, Code Patterns, Workflow) are added
- Skills and agents are added to `.claude/`

### Scenario 2: Project Already Uses Cursor + Claude Code

You have both `.cursor/` and `.claude/` configured.

**Recommended approach:**
```bash
npx @tutellus/agentic-architecture init
# Select IDEs: Claude Code, Cursor
# Select: Merge intelligently for each
```

Result:
- Both configs get new rules added
- Your existing customizations are preserved in both

### Scenario 3: Want Template Skills but Keep Custom AGENTS.md

You want the workflow skills but your AGENTS.md is highly customized.

**Recommended approach:**
```bash
npx @tutellus/agentic-architecture init
# Select: Keep existing for claude-code
```

Then manually copy desired skills:
```bash
# View what skills are available
ls packages/cli/templates/claude-code/.claude/skills/

# Copy specific ones you want
cp -r ~/.npm/_npx/.../skills/create-plan.md .claude/skills/
```

Or run with merge and then `git checkout AGENTS.md` to restore yours.

### Scenario 4: Starting Fresh with New Workflow

You want to adopt the full template workflow.

**Recommended approach:**
```bash
npx @tutellus/agentic-architecture init
# Select: Replace for all
```

Then customize the generated files to match your project specifics.

---

## Troubleshooting

### "Already Configured" Warning

If you see "Version X installed on Y - Re-run initialization?":
- This means you've run init before
- Safe to re-run with different options
- Or use `update` to just get new template changes

### Merge Resulted in Weird Formatting

The section-based merge sometimes creates awkward spacing. After merge:
```bash
# Review changes
git diff AGENTS.md

# Fix formatting manually if needed
# Or reset and use different strategy
git checkout AGENTS.md
```

### Want to See What Would Be Generated

```bash
npx @tutellus/agentic-architecture init --preview
```

Shows all files that would be created/modified without making changes.

### Stack Detection is Wrong

The CLI detected wrong framework/libraries:
```bash
# Run interactively to correct
npx @tutellus/agentic-architecture init
# When shown "Is this correct?", say no and provide corrections
```

---

## Best Practices

1. **Always preview first**: Run with `--preview` before committing to changes

2. **Review after merge**: `git diff` to see what changed, adjust as needed

3. **Commit before running**: Have a clean git state so you can easily revert

4. **Use merge for incremental adoption**: Start with merge, customize over time

5. **Update periodically**: Run `update --check` monthly to see if there are improvements

6. **Track what you customize**: Modified files won't be auto-updated, which is good but means you miss improvements

---

## Related Documentation

- [CLI Reference](./cli-reference.md) - Full command documentation
- [Skills Reference](./skills.md) - What each skill does
- [Agents Reference](./agents.md) - What each agent does
- [Customization Guide](./customization.md) - How to customize further
