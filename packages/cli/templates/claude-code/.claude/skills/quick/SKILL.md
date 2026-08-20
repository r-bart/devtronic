---
name: quick
description: Fast ad-hoc task execution. Skips spec/research/plan — just implement, verify, commit. For small, well-defined tasks.
argument-hint: "<task description>"
disable-model-invocation: true
---

# Quick - Fast Ad-Hoc Task Execution

Execute `$ARGUMENTS` quickly without the full workflow ceremony. Implement, verify, commit.

## When to Use

- Small, well-defined tasks (< 5 files)
- Obvious bug fixes with clear solution
- Simple config changes
- Adding a single test or function
- Renaming, moving, or deleting files

**Escalate to `/create-plan` if:**
- Task touches 5+ files
- Design decisions needed
- Multiple valid approaches exist
- Task requires research first

---

## Process

```
1. UNDERSTAND (30 seconds)
   └── Parse task, identify target files

2. GUARD CHECK
   └── If > 5 files or needs design → suggest /create-plan

3. IMPLEMENT
   └── Make changes directly

4. VERIFY
   └── Detect PM, run typecheck + lint (+ test if test files affected)

5. COMMIT
   └── git add specific files + commit

6. UPDATE STATE
   └── If thoughts/STATE.md exists, note the quick task
```

---

## Step 1: Understand

Parse `$ARGUMENTS` to determine:

- **What**: The specific change needed
- **Where**: Which files to modify (should be < 5)
- **How**: The implementation approach (should be obvious)

```markdown
**Task**: [parsed task]
**Files**: [list of files to touch]
**Approach**: [1-2 sentence description]
```

---

## Step 2: Guard Check

Before implementing, verify this is appropriate for `/quick`:

| Check | Threshold | Action if exceeded |
|-------|-----------|-------------------|
| Files to modify | > 5 | Suggest `/create-plan` |
| Design decisions | Any | Suggest `/create-plan` |
| New architecture | Any | Suggest `/create-plan` |
| Unclear requirements | Any | Ask user to clarify |

If guard triggers:

```markdown
This task looks more complex than a quick fix:
- [reason: e.g., "touches 8 files", "needs design decision about X"]

Recommend: `/create-plan [task]` for a proper plan.
Continue anyway? (not recommended)
```

---

## Step 3: Implement

Make changes directly. Follow existing patterns in the codebase.

- Read target files before modifying
- Follow existing code style
- Keep changes minimal and focused

---

## Step 4: Verify

### Package Manager Detection

Check for lockfiles:
- `pnpm-lock.yaml` → `pnpm`
- `yarn.lock` → `yarn`
- `bun.lockb` → `bun`
- `package-lock.json` or none → `npm`

### Run Checks

```bash
# Always run
<pm> run typecheck
<pm> run lint

# Run if test files were modified or new tests added
<pm> test
```

Fix any issues before proceeding to commit.

---

## Step 5: Commit

Invoke the **commit-changes** agent to handle staging and committing. It will:
- Analyze the changes and group them logically
- Stage specific files (never `git add .`)
- Create conventional commit messages

If the commit-changes agent is not available, fall back to manual commit:
```bash
git add [specific files]
git commit -m "[type]: [description]"
```

---

## Step 6: Update State

If `thoughts/STATE.md` exists, append a note about the quick task:

```markdown
## Quick Tasks (this session)

- [description] — [files changed] (committed: [hash])
```

---

## Output Format

```markdown
## Quick: [task name]

**Files changed**: [count]
- `path/to/file.ts` — [what changed]

**Verification**:
- Types: PASS/FAIL
- Lint: PASS/FAIL
- Tests: PASS/FAIL (or skipped)

**Commit**: `[hash]` [message]
```

---

## Examples

```bash
/quick fix typo in README.md
/quick add index export for UserService
/quick rename handleClick to handleSubmit in LoginForm
/quick add test for edge case in parseDate utility
/quick update eslint config to enable new rule
```

---

## Tips

1. **Be specific** in the task description — the more detail, the better
2. **One task at a time** — don't combine unrelated changes
3. **Trust the guard** — if it suggests `/create-plan`, listen
4. **Quick means quick** — if you're spending more than 5 minutes, escalate
