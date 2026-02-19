# Tutorial 02: Install in Existing Project

How to integrate AI Agentic Architecture into a project that already has code and configuration.

---

## Objective

By the end of this tutorial:
- You'll have skills and agents integrated into your project
- You'll understand how it merges with your existing configuration
- You'll know what to customize for your stack

---

## Prerequisites

- Claude Code installed
- Existing project with code
- Clean git (no pending changes)

---

## Option A: CLI (Recommended)

### Step 1: Run the CLI

```bash
cd your-project
npx @tutellus/agentic-architecture init --preview
```

The `--preview` shows what changes would be made without making them.

### Step 2: Review Detection

The CLI will detect your stack:

```
Detected Configuration:
  Framework: Next.js
  Architecture: Feature-based
  State: Zustand, React Query
  ORM: Prisma
  Testing: Vitest
  UI: Tailwind, shadcn
```

If something is incorrect, you can correct it.

### Step 3: Choose Merge Strategy

```
? claude-code config already exists. How should we handle it?
  ● Merge intelligently  ← Adds new sections, keeps yours
    Keep existing        ← Skips existing files
    Replace              ← Overwrites with template
```

**Recommended**: "Merge intelligently" for projects with existing configuration.

### Step 4: Apply Changes

```bash
npx @tutellus/agentic-architecture init
```

### Step 5: Review Changes

```bash
git diff
```

Review what was added and adjust if necessary.

---

## Option B: /setup Skill

### Step 1: Start Claude Code

```bash
cd your-project
claude
```

### Step 2: Run /setup

```
/setup
```

Claude will analyze your project and guide you:

```
You: /setup

Claude: I detected:
- Framework: Next.js 14
- State: Zustand
- DB: Prisma
- Tests: Vitest

Is this correct? I can adjust configuration per your stack.

You: Correct, but we also use React Query for server state.

Claude: Understood. I'll configure rules for:
- Zustand: UI state
- React Query: Server state
- Prisma: Data access

How do you want to handle your existing CLAUDE.md?
[1] Merge (add new sections)
[2] Keep mine
[3] Use template
```

---

## What Gets Added

### New Files

```
.claude/
├── skills/           # 16 workflow skills
│   ├── spec.md
│   ├── research.md
│   ├── plan.md
│   └── ...
├── agents/           # 7 specialized agents
│   ├── error-investigator.md
│   ├── code-reviewer.md
│   ├── quality-runner.md
│   ├── commit-changes.md
│   ├── test-generator.md
│   ├── dependency-checker.md
│   └── doc-sync.md
└── rules/            # Quality rules
    ├── architecture.md
    └── quality.md

thoughts/             # Directory for documents
├── specs/
├── plans/
├── research/
└── checkpoints/
```

### Modified Files (if you choose Merge)

- **AGENTS.md/CLAUDE.md**: Adds sections you didn't have
- **settings.json**: Adds configuration without overwriting yours

---

## Verification

```bash
# Verify Claude recognizes the skills
claude
/help
```

You should see the 16 skills listed.

---

## Post-Installation Customization

### 1. Adjust Quality Commands

In AGENTS.md, verify commands are correct:

```markdown
## Quality Checks

```bash
pnpm typecheck && pnpm lint && pnpm test
```
```

### 2. Add Specific Rules

If your project has special conventions:

```markdown
## Critical Rules

- Always use `@/components` for component imports
- Custom hooks go in `hooks/` not `utils/`
- Never modify files in `generated/`
```

### 3. Document Architecture

If you don't have docs/ARCHITECTURE.md:

```
/research --deep "our architecture"
```

Then document the conclusions.

---

## Final Verification

✅ `claude` starts without errors
✅ `/help` shows the 16 skills
✅ AGENTS.md reflects your actual stack
✅ `git diff` shows reasonable changes
✅ Your existing code was not modified

---

## Next Step

→ [Tutorial 03: Create a Feature](./03-feature-workflow.md)

Learn to use the complete workflow with your project.

---

## Common Errors

### CLAUDE.md accidentally overwritten

```bash
git checkout AGENTS.md CLAUDE.md
```

And run again with "Keep existing".

### Skills don't appear

Verify that `.claude/skills/` exists and has `.md` files.

### Conflicts with Cursor configuration

If you also use Cursor:
```bash
npx @tutellus/agentic-architecture add cursor
```

---

## Tips

1. **Always commit before** running init
2. **Use --preview first** to see what will change
3. **Merge is safe** - doesn't delete your existing configuration
4. **Review git diff** before committing the changes
