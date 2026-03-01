---
name: scaffold
description: Create new projects from scratch with guided architecture and structure. Use when starting a brand new project.
allowed-tools: Read, Glob, Bash, Write, AskUserQuestion
argument-hint: "[project-name]"
---

# Scaffold - Create Projects from Scratch

Conversationally guide through creating a new project with proper architecture, structure, and AI agent configuration. If `$ARGUMENTS` provides a project name, use it; otherwise ask the user.

## When to Use

- Starting a brand new project from scratch
- Want guided setup instead of manual boilerplate
- Need proper architecture from the start
- Creating a monorepo with multiple apps

**For existing projects:** Use `/setup` instead.

---

## Supporting Files

This skill uses supporting files for detailed reference:

- [structures.md](structures.md) - Folder structures for each architecture pattern
- [bootstrap-commands.md](bootstrap-commands.md) - Bootstrap commands per project type
- [examples-frontend.md](examples-frontend.md) - Frontend (Clean Architecture) example code
- [examples-spa-ddd.md](examples-spa-ddd.md) - SPA-DDD example code
- [examples-backend.md](examples-backend.md) - Backend (Express) example code

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────┐
│                      /scaffold                          │
├─────────────────────────────────────────────────────────┤
│  1. GATHER         → Type, stack, architecture          │
│  2. VALIDATE       → Verify directory empty/new         │
│  3. BOOTSTRAP      → Execute base command               │
│  4. STRUCTURE      → Apply folder structure             │
│  5. CONFIGURE      → Run init automatically             │
│  6. VERIFY         → Check everything works             │
│  7. NEXT STEPS     → Guide what to do next              │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: GATHER - Requirements Collection

Use AskUserQuestion for each step:

### 1. Project Type

```
What type of project are you building?

1. **frontend** - React (Vite) or Next.js
2. **spa-ddd** - React (Vite) + SPA-DDD architecture (DDD + Zustand + Apollo)
3. **backend** - Node + Express
4. **fullstack** - Next.js (app + api)
5. **monorepo** - Multiple apps with shared packages
```

### 2. Framework (based on type)

**Frontend:** React (Vite) or Next.js
**SPA DDD:** React (Vite) + pnpm monorepo
**Backend:** Express
**Fullstack:** Next.js
**Monorepo:** Turborepo + pnpm workspaces

### 3. Architecture

```
Which architecture pattern?

1. **clean** - Clean Architecture (domain/application/infrastructure)
2. **ddd** - Domain-Driven Design (modular)
3. **feature-based** - By feature/module
4. **mvc** - Model-View-Controller
5. **flat** - No special structure
```

### 4. Additional Stack (optional, based on type)

Ask only what's relevant:

- **ORM**: Prisma, Drizzle, TypeORM, none
- **State**: Zustand, Redux, Jotai, none
- **Testing**: Vitest, Jest, none
- **UI**: Tailwind, shadcn, none

### 5. Project Name

```
What should the project be called?
(lowercase, no spaces - e.g., "my-awesome-app")
```

### 6. Include Examples?

```
Include example code to demonstrate patterns?

1. **No** - Just empty folder structure with .gitkeep
2. **Yes** - Include example entity, use case, repository, and healthcheck
```

### 7. Monorepo Apps (if monorepo selected)

```
Which apps should the monorepo include? (select all that apply)

- [ ] web - Next.js (main application)
- [ ] api - Express backend
- [ ] landing - Astro (marketing site)
- [ ] docs - Astro Starlight (documentation)
- [ ] admin - React + Vite (admin panel)
```

---

## Phase 2: VALIDATE - Directory Check

Before proceeding:

1. Check if target directory exists
2. If exists, check if empty
3. If not empty, ask user to confirm overwrite

```bash
ls -la {name} 2>/dev/null || echo "Directory does not exist (good)"
```

---

## Phase 3: BOOTSTRAP - Execute Base Command

Read [bootstrap-commands.md](bootstrap-commands.md) for the exact command per project type.

Show the command to user before executing, allow modifications.

---

## Phase 4: STRUCTURE - Apply Folder Structure

After bootstrap, create additional folders based on architecture.

Read [structures.md](structures.md) for the folder structure per architecture pattern.

---

## Phase 4b: EXAMPLES (if user chose to include)

If user selected "yes" to examples, create example files from:

- **Frontend (generic)**: Read [examples-frontend.md](examples-frontend.md)
- **SPA DDD**: Read [examples-spa-ddd.md](examples-spa-ddd.md)
- **Backend**: Read [examples-backend.md](examples-backend.md)

---

## Phase 5: CONFIGURE - Run Init

After structure is created, configure AI agents:

```bash
cd {name} && npx devtronic init -y --ide claude-code
```

This creates:
- AGENTS.md with project-specific rules
- .claude/skills/ with all workflow skills
- .claude/agents/ with specialized helpers
- thoughts/ directory structure

---

## Phase 6: VERIFY - Check Everything Works

```bash
# Check package.json exists
test -f package.json && echo "package.json exists"

# Check structure was created
ls -la src/

# Install dependencies if not done (use PM from scaffolding)
<pm> install

# Optional: run typecheck
<pm> run typecheck 2>/dev/null || echo "No typecheck script"

# Optional: run build
<pm> run build 2>/dev/null || echo "No build script"
```

---

## Phase 7: NEXT STEPS - Guide User

```markdown
## Project Created Successfully!

**Project**: {name}
**Type**: {type} ({framework})
**Architecture**: {architecture}

### What was created:

- Project bootstrapped with {framework}
- {architecture} folder structure applied
- AI agent configuration with AGENTS.md
- {examples ? "Example code included" : "Empty structure with .gitkeep"}

### Getting Started:

1. **Start development server:**
   ```bash
   cd {name}
   <pm> run dev
   ```

2. **Review AI configuration:**
   - `AGENTS.md` - Project rules and patterns
   - `.claude/skills/` - Available workflows

3. **Create your first feature:**
   - Use `/spec` to define requirements
   - Use `/research --deep` for codebase analysis
   - Use `/create-plan` to design implementation

### Add to .gitignore:

```
thoughts/checkpoints/
.claude/settings.local.json
CLAUDE.local.md
.ai-template/
```
```

---

## Edge Cases

### Command fails

If a bootstrap command fails:
1. Check Node.js version (18+ recommended)
2. Check npm/pnpm is installed
3. Try running command manually to see full error

### Directory not empty

If target directory exists with content:
1. Backup important files
2. Remove directory: `rm -rf {name}`
3. Run /scaffold again

### Structure doesn't match

If generated structure differs from expected:
1. Check which architecture was selected
2. The scaffold creates base structure; adapt as needed
3. Use the structure as a starting point, not strict requirement

---

## Tips

1. **Start simple** - Can always add complexity later
2. **Architecture matters** - Choose based on project size
3. **Examples help** - Include them to learn patterns
4. **Customize freely** - The structure is a starting point
5. **Use /setup for existing projects** - This skill is for new projects only
