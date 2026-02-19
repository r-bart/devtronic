# Philosophy

The principles and reasoning behind AI Agentic Architecture.

---

## Why This Workflow?

### Error Impact by Stage

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR IMPACT BY STAGE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Spec Error         →  Wrong feature       →  Everything wrong  │
│  Research Error     →  Wrong understanding →  1000s bad LOC     │
│  Planning Error     →  Wrong approach      →  100s bad LOC      │
│  Coding Error       →  Bug                 →  1 bug             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Human review at earlier stages has higher leverage. That's why we:
1. **Spec first** - Validate requirements before technical work
2. **Research second** - Understand the codebase before designing
3. **Plan third** - Approve approach before implementation
4. **Implement last** - When everything is clear

---

## Baby Step Principle

**CRITICAL**: Every task should leave the codebase in a working state.

```
✓ Each task MUST be completable with all checks passing
✓ After EVERY task: tests green, lint clean, types valid
✓ No task should break the build, even temporarily
✓ If a task is too large, break it into smaller subtasks
✓ Tests are part of the task, not a separate phase
```

### Why?

1. **Easier debugging** - If something breaks, you know it was the last task
2. **Easier rollback** - Can revert single commits cleanly
3. **Continuous progress** - Never stuck with half-working code
4. **Better reviews** - Reviewers see complete, working changes

### Signs a Task is Too Big

- "This will temporarily break X"
- Can't write tests yet because Y isn't ready
- Multiple unrelated files changing together
- Estimated time > 1-2 hours

**Solution**: Break it down further.

---

## Context Management

AI assistants have limited context windows. Manage this by:

### 1. Clear Frequently

```
/clear
```

Between unrelated tasks, clear the context. Don't let old information pollute new work.

### 2. Checkpoint Progress

Before context fills up (60%+ used), save state:

```
/checkpoint
```

Then start fresh with the checkpoint file as reference.

### 3. Use Subagents

Delegate verbose tasks to isolated contexts:
- `error-investigator` - Error analysis
- `quality-runner` - Tests, typecheck, lint
- `code-reviewer` - PR reviews

The main conversation stays clean while subagents handle details.

### 4. Reference Files

Instead of pasting content:
```
"Read the spec at thoughts/specs/feature.md"
```

Claude will read it with fresh context, not cluttered conversation.

---

## Parallel Sessions with Worktrees

The #1 productivity tip: run 3-5 Claude sessions in parallel using git worktrees.

### What are Worktrees?

Git worktrees let you have multiple working directories from the same repository, each on a different branch:

```
my-project/              # Main worktree (your normal repo)
my-project-wt-feature/   # Worktree for feature work
my-project-wt-bugfix/    # Worktree for bug fixes
my-project-wt-analysis/  # Worktree for reading/analysis only
```

### Why Use Them?

1. **Parallel work** - Multiple Claude sessions on different tasks simultaneously
2. **Clean context** - Each session has its own working directory and branch
3. **No conflicts** - Changes in one worktree don't affect others
4. **Fast switching** - Jump between tasks without stashing or committing

### Quick Setup

```bash
# Create worktrees
git worktree add ../project-wt-a -b feature/task-a
git worktree add ../project-wt-b -b feature/task-b
git worktree add ../project-wt-c -b feature/task-c

# Shell aliases for quick navigation
alias za="cd ~/project-wt-a && claude"
alias zb="cd ~/project-wt-b && claude"
alias zc="cd ~/project-wt-c && claude"
```

See [Worktrees Guide](./worktrees.md) for full documentation.

---

## Self-Improving CLAUDE.md

Claude is good at writing rules for itself. After every correction:

```
"Update CLAUDE.md so you don't make that mistake again."
```

### How It Works

1. You notice Claude made a mistake
2. You correct Claude
3. You ask Claude to add a rule preventing that mistake
4. Claude writes a rule in your project's voice
5. Next time, Claude follows its own rule

### Example Corrections

**You**: "Don't use `any` type"
**Claude adds**:
```markdown
## Types
- Never use `any` - find the correct type or use `unknown`
```

**You**: "Always check if array exists before mapping"
**Claude adds**:
```markdown
## Null Safety
- Use optional chaining: `items?.map()` or early return for nullable arrays
```

### Iterate Until Stable

Keep adding rules until mistake rate drops. A well-trained CLAUDE.md produces consistent, high-quality code.

---

## Advanced Prompting

When stuck or getting mediocre results, use these patterns:

### Re-Plan

When the current approach isn't working:

```
"Enter plan mode and re-plan this approach"
```

Forces Claude to step back and reconsider the strategy.

### Elegant Fix

When the solution works but feels hacky:

```
"Knowing everything you know now, scrap this and implement the elegant solution"
```

Fresh perspective with full context of failed approaches and constraints.

### Challenge

When you want rigorous review:

```
"Grill me on these changes and don't approve until I pass"
```

Activates Claude's critical reviewer mode (see `/post-review` skill).

### Prove It

When you need certainty:

```
"Prove to me this works by diffing behavior between main and this branch"
```

Forces demonstration of actual behavior change.

---

## Human Review at High-Leverage Points

The workflow is designed for human review at critical moments:

### After /spec

**Review**: Requirements, user stories, acceptance criteria

**Questions**:
- Is this the right problem to solve?
- Are edge cases identified?
- Are success metrics realistic?

### After /create-plan

**Review**: Architecture, phases, task breakdown

**Questions**:
- Is the approach sound?
- Are tasks small enough (baby steps)?
- Are risks addressed?

### After /post-review

**Review**: Implementation quality, lessons learned

**Questions**:
- Are all requirements met?
- Any architectural violations?
- What patterns should we document?

---

## Why Structured Documents?

Skills produce documents in `thoughts/` instead of just chatting. Why?

### 1. Persistence

Documents survive context clears and session changes. Chat history doesn't.

### 2. Reference

You can point Claude (or teammates) to a document:
```
"See the plan at thoughts/plans/feature.md"
```

### 3. Review

Structured documents are easier to review than sprawling conversation.

### 4. History

Over time, `thoughts/` becomes a project history:
- What features were built and why
- What decisions were made
- What lessons were learned

### 5. Handoff

New team members (or new Claude sessions) can onboard by reading documents.

---

## Minimal Tooling

This architecture provides:
- Structured workflows (skills)
- Specialized helpers (agents)
- Guidelines (rules)

It does NOT provide:
- Complex build systems
- Heavy dependencies
- Lock-in to specific tools

Everything is plain Markdown files. You can:
- Edit them manually
- Delete what you don't need
- Add your own without conflicts
- Switch IDEs without migration

---

## Cost Consciousness

AI tokens cost money. This architecture helps minimize costs:

### Subagents with Cheaper Models

- `error-investigator`: haiku (fast, cheap)
- `quality-runner`: haiku
- `code-reviewer`: sonnet (when quality matters)

### Context Management

Checkpoints and clear context prevent paying for bloated conversations.

### Document References

Pointing to files instead of pasting content saves tokens.

---

## Related Documentation

- [Skills Reference](./skills.md) - All included skills
- [Agents Reference](./agents.md) - All included agents
- [Worktrees Guide](./worktrees.md) - Parallel session setup
- [Customization Guide](./customization.md) - Make it your own
