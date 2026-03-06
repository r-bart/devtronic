# Tutorial 01: Starting a Project from Scratch

How to use devtronic to start a project from scratch with professional structure.

---

## Objective

By the end of this tutorial:
- You'll have a new project with configured architecture
- You'll understand the generated folder structure
- You'll know how to customize CLAUDE.md for your project

---

## Prerequisites

- Claude Code installed
- Empty directory for the project
- General idea of what you're going to build

---

## Step 1: Create the Directory

```bash
mkdir my-project
cd my-project
```

---

## Step 2: Start Claude Code

```bash
claude
```

---

## Step 3: Run /devtronic:scaffold

```
/scaffold
```

Claude will guide you with questions:

1. **Project type**: Frontend, Backend, Monorepo
2. **Framework**: Next.js, React, Express, etc.
3. **Architecture**: Clean DDD, Feature-based, MVC
4. **Tools**: Testing, linting, state management

Example interaction:

```
You: /scaffold

Claude: What type of project do you want to create?
  [1] Frontend (React/Next.js)
  [2] Backend (Node/Express/NestJS)
  [3] Monorepo (Full stack)

You: 1

Claude: Which frontend framework?
  [1] Next.js (Recommended)
  [2] React + Vite
  [3] React Router

You: 1

Claude: Which architecture pattern?
  [1] Clean DDD (Recommended - domain/application/infrastructure)
  [2] Feature-based (features/auth, features/users)
  [3] Flat (components, hooks, utils)

You: 1
```

---

## Step 4: Review the Generated Structure

After `/devtronic:scaffold`, you'll have:

```
my-project/
├── AGENTS.md              # Context for Claude
├── CLAUDE.md → AGENTS.md  # Symlink
│
├── .claude/
│   ├── skills/            # 16 workflow skills
│   ├── agents/            # 7 specialized agents
│   └── rules/             # Self-applied rules
│
├── src/
│   ├── domain/            # Entities, interfaces
│   ├── application/       # Use cases
│   ├── infrastructure/    # Implementations
│   └── presentation/      # UI components
│
├── thoughts/              # Working documents
│   ├── specs/
│   ├── plans/
│   ├── research/
│   └── checkpoints/
│
├── package.json
├── tsconfig.json
└── ...
```

---

## Step 5: Customize CLAUDE.md

The AGENTS.md file (and its CLAUDE.md symlink) is the most important. Open it and customize:

```markdown
# AI Agents Guide

## Quick Start

This is a [DESCRIPTION] project.

Uses:
- Next.js 15 with App Router
- Zustand for state
- Prisma for database

## Commands

```bash
pnpm dev        # Development
pnpm build      # Build
pnpm test       # Tests
pnpm typecheck  # Type checking
```

## Critical Rules

[Add specific rules for your project]
```

---

## Step 6: Verify Installation

```bash
# Install dependencies
pnpm install

# Verify it works
pnpm dev
```

Open http://localhost:3000 to see your project.

---

## Step 7: First Commit

```bash
git init
git add .
git commit -m "Initial project setup with devtronic"
```

---

## Verification

✅ You have a working project with `pnpm dev`
✅ AGENTS.md is customized with your description
✅ Folder structure follows Clean Architecture
✅ thoughts/ is ready for specs and plans

---

## Next Step

→ [Tutorial 03: Create a Feature](./03-feature-workflow.md)

Learn to use the complete workflow: spec → research → plan → implement → review.

---

## Common Errors

### "Permission denied" when running scripts

```bash
chmod +x node_modules/.bin/*
```

### Dependencies don't install

Make sure you use the correct package manager:
```bash
# If project uses pnpm
pnpm install

# If uses npm
npm install
```

### TypeScript errors after scaffold

This is normal - the scaffold creates empty structure. Errors will resolve when implementing features.

---

## Tips

1. **Don't modify the initial structure** until you understand why it's like that
2. **Read docs/ARCHITECTURE.md** if it was generated - explains the decisions
3. **Use `/devtronic:brief`** at the start of each session to get oriented
