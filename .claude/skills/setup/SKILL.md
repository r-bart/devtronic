---
name: setup
description: Configure devtronic for this project through interactive conversation. Use when setting up AI assistance in an existing project.
allowed-tools: Bash, Read, Glob, AskUserQuestion, Write
---

# Setup devtronic

Interactive configuration of AI agent rules and workflows for this project.

## When to Use

- First time setting up AI assistance in an **existing** project
- Want conversational setup instead of CLI
- Need to reconfigure or update existing setup

**For new projects from scratch:** Use `/scaffold` instead - it bootstraps the project and then runs init.

---

## Process Overview

This skill provides a conversational interface to the CLI. After gathering configuration, it executes:

```bash
npx devtronic init -y --ide <selected-ides>
```

This ensures:
- Same code generation as CLI
- Manifest created for future updates
- Consistency between methods

---

## Phase 1: Project Analysis

Analyze the project to detect:

1. **Read `package.json`** to detect:
   - Framework (Next.js, React, Vue, Express, NestJS, etc.)
   - Package manager (npm, yarn, pnpm, bun)
   - Scripts (typecheck, lint, test, build, dev)
   - Dependencies for stack detection

2. **Scan directory structure** to detect:
   - Architecture pattern (Clean, MVC, Feature-based, Flat)
   - Layers (domain, application, infrastructure, etc.)
   - Test directories

3. **Detect technology stack**:
   - State management: Zustand, Redux, Jotai, MobX, XState
   - Data fetching: React Query, SWR, Apollo, tRPC
   - ORM: Prisma, Drizzle, TypeORM, Mongoose
   - Testing: Vitest, Jest, Playwright, Cypress
   - UI: Tailwind, Chakra, MUI, Radix, shadcn
   - Validation: Zod, Yup, Valibot

4. **Check for existing AI configs**:
   - `.claude/` directory
   - `CLAUDE.md` or `AGENTS.md`
   - `.cursor/`, `.agent/`, etc.

---

## Phase 2: Present Findings

Present the analysis conversationally:

```markdown
## Project Analysis

I've analyzed your project. Here's what I found:

**Framework**: Next.js 14.2.0
**Architecture**: Clean Architecture
**Layers detected**: domain, application, infrastructure

**Stack**:
- State: Zustand
- Data fetching: React Query
- ORM: Prisma
- Testing: Vitest
- UI: Tailwind CSS

**Scripts**:
- `npm run typecheck` - Type checking
- `npm run lint` - Linting
- `npm run test` - Tests

**Existing AI configs**: .cursor/ found

Is this correct? Would you like to adjust anything?
```

---

## Phase 3: IDE Selection

Ask which IDEs to configure:

```markdown
Which IDEs do you use for this project?

1. **Claude Code** (current) - Will be configured
2. **Cursor** - AI-powered VS Code fork
3. **Google Antigravity** - Google's agentic IDE
4. **GitHub Copilot** - VS Code extension

You can select multiple. Claude Code will always be included since you're using it now.
```

---

## Phase 4: Confirmation & Adjustments

If user wants adjustments:

**Architecture adjustment**:
> User: "We actually use feature-based, not Clean Architecture"
>
> Update configuration: Architecture = feature-based

**Stack adjustment**:
> User: "We don't use Prisma, we use Drizzle"
>
> Update configuration: ORM = Drizzle

**Layer adjustment**:
> User: "Our layers are: features, shared, lib"
>
> Update configuration: Layers = [features, shared, lib]

---

## Phase 5: Execute CLI

Once configuration is confirmed, execute the CLI:

```bash
# Build the command based on selections
npx devtronic init -y --ide claude-code,cursor
```

If user made adjustments that differ from auto-detection, create a temporary config or guide them to run the CLI interactively:

```bash
# For interactive mode with manual configuration
npx devtronic init --ide claude-code,cursor
```

---

## Phase 6: Summary

After CLI execution, provide summary:

```markdown
## Setup Complete!

The CLI has configured the following:

**Generated (personalized)**:
- `AGENTS.md` - With your stack (Zustand, React Query, Drizzle)
- `.claude/rules/architecture.md` - Feature-based architecture rules

**Created**:
- `.claude/skills/` - 13 workflow skills
- `.claude/agents/` - 3 specialized agents
- `.claude/rules/quality.md`
- `thoughts/` directory structure
- `CLAUDE.md -> AGENTS.md` (symlink)

**For Cursor**:
- `.cursor/rules/` - Architecture and quality rules

**Tracking**:
- `.ai-template/manifest.json` - For future updates

### Next Steps

1. Review `AGENTS.md` and customize further if needed
2. Try `/spec` to create your first feature specification
3. Add to `.gitignore`:
   ```
   thoughts/checkpoints/
   .claude/settings.local.json
   CLAUDE.local.md
   .ai-template/
   ```

### Future Updates

To update to newer template versions:
```bash
npx devtronic update --check  # Check for updates
npx devtronic update          # Apply updates
```

Updates preserve your local modifications.
```

---

## Alternative: Direct CLI Commands

For specific operations, you can also suggest:

```bash
# Add another IDE later
npx devtronic add antigravity

# Regenerate rules after stack changes
npx devtronic regenerate --rules

# Preview what would be generated
npx devtronic init --preview
```

---

## Notes

- This skill invokes the CLI for actual file generation
- CLI creates manifest for update tracking
- User adjustments during conversation inform CLI flags
- For complex adjustments, recommend running CLI interactively
