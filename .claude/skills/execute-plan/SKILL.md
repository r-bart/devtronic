---
name: execute-plan
description: Execute a plan in parallel phases. Reads task dependencies and runs independent tasks as concurrent subagents. Claude Code only.
allowed-tools: Task, Read, Write, Bash, Glob, Grep, Edit
argument-hint: "[plan-path|--latest]"
---

# Execute Plan - Parallel Phase Execution

Execute `$ARGUMENTS` by reading a plan's task dependencies and running independent tasks as concurrent subagents.

## When to Use

- A plan with `## Task Dependencies` exists
- You want to execute tasks in optimal parallel order
- The plan was created with `/create-plan`

**Not for:**
- Plans without task dependencies (execute manually)
- Interactive tasks requiring user input mid-task
- Tasks that modify the same files in parallel

---

## Process

```
1. LOAD
   └── Read plan, parse tasks + dependencies + done criteria

2. VALIDATE
   └── Check dependency graph (no cycles, IDs match)

3. COMPUTE PHASES
   └── Topological sort by dependency levels

4. DISPLAY
   └── Show phase plan for user confirmation

5. EXECUTE
   └── Per phase: spawn parallel Task subagents → wait → verify → next

6. VERIFY
   └── Run full quality checks + done criteria validation

7. REPORT
   └── Summary table with phase results
```

---

## Step 1: Load Plan

### Find the plan

If `$ARGUMENTS` is `--latest` or empty:
```bash
ls -t thoughts/plans/*.md 2>/dev/null | head -1
```

If `$ARGUMENTS` is a path, use it directly.

Also check `thoughts/STATE.md` for an `Active Plan` reference.

### Parse the plan

Extract from the plan file:
- **Tasks**: All `#### Task X.Y` headers with their descriptions and file lists
- **Dependencies**: The `## Task Dependencies` YAML block
- **Done Criteria**: The `## Done Criteria` section (if present)

---

## Step 2: Validate

### Check dependency graph

1. All task IDs in dependencies must match a `Task X.Y` header
2. All `Task X.Y` headers should appear in the dependencies
3. No circular dependencies (A→B→C→A)
4. No self-dependencies

### If validation fails

```markdown
## Validation Error

**Issue**: [description]

**Details**:
- Task 2.3 referenced in dependencies but not found in plan
- Circular dependency: 1.1 → 2.1 → 1.1

**Action**: Fix the plan and re-run `/execute-plan`
```

---

## Step 3: Compute Phases

Group tasks into phases using topological sort:

```markdown
## Execution Phases

| Phase | Tasks | Dependencies Met |
|-------|-------|-------------------|
| 1 | 1.1, 1.2 | None (starting tasks) |
| 2 | 2.1, 2.2 | Phase 1 complete |
| 3 | 3.1 | Phase 2 complete |
```

Algorithm:
1. Tasks with empty dependency arrays = Phase 1
2. Tasks whose dependencies are all in previous phases = next phase
3. Repeat until all tasks are assigned

---

## Step 4: Display and Confirm

Show the computed phase plan and ask for confirmation:

```markdown
## Phase Execution Plan

**Plan**: `thoughts/plans/[file].md`
**Total tasks**: X
**Total phases**: Y
**Estimated**: [parallel task count per phase]

### Phase 1 (parallel: 2 tasks)
- **Task 1.1**: [name] → `file1.ts`, `file2.ts`
- **Task 1.2**: [name] → `file3.ts`

### Phase 2 (parallel: 2 tasks)
- **Task 2.1**: [name] → `file4.ts` (needs: 1.1, 1.2)
- **Task 2.2**: [name] → `file5.ts` (needs: 1.1)

### Phase 3 (sequential: 1 task)
- **Task 3.1**: [name] → `file6.ts` (needs: 2.1, 2.2)

Proceed with execution?
```

---

## Step 5: Execute Phases

### Model Selection

Check `thoughts/CONFIG.md` for model profile:

| Profile | Subagent model |
|---------|---------------|
| quality | opus |
| balanced | sonnet (default) |
| budget | haiku |

### Per Phase

For each phase, spawn parallel Task subagents:

```markdown
Each subagent receives:
- Task description from the plan
- List of files to create/modify
- Phase done criteria (if available)
- Instruction to NOT modify files outside its scope
```

**Task subagent prompt template**:
```
Implement Task [X.Y]: [task name]

## Description
[task description from plan]

## Files
[file list from plan]

## Done Criteria
[phase criteria if available]

## Rules
- Only modify the files listed above
- Follow existing code patterns
- Do NOT run quality checks (will be run after phase)
- If blocked, return with explanation instead of guessing
```

### Visual Progress

Display text-based progress after each phase:

```
● Phase 2/3                    api-routes, validators
  ✔ api-routes               done
  ● validators               running
  ○ middleware                pending
```

Indicators:
- `●` — currently executing
- `✔` — completed successfully
- `✖` — failed
- `○` — pending

### After each phase completes

1. Check all subagent results for success/failure
2. Run quality checks: `<pm> run typecheck && <pm> run lint`
3. If all pass, invoke the **commit-changes** agent to create atomic commits for the phase's changes
4. If `thoughts/CONTEXT.md` exists (orchestration mode), write an inter-phase handoff summary:
   - What phase N accomplished
   - Key decisions made during execution
   - Files modified and their state
   - Relevant context for phase N+1 tasks
   Provide this summary to phase N+1 subagents as additional context.
5. Proceed to next phase
6. If quality checks fail, handle errors (see Error Handling) before committing

---

## Step 6: Verify

After all phases complete:

```bash
# Full quality check
<pm> run typecheck && <pm> run lint && <pm> test
```

### Done Criteria Validation

If the plan has a `## Done Criteria` section, validate each criterion:

```markdown
## Done Criteria Validation

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | [text] | PASS/FAIL | [how verified] |
| 2 | [text] | PASS/FAIL | [how verified] |

**Result**: X/Y criteria met
```

---

## Step 7: Report

```markdown
## Execution Report

**Plan**: `thoughts/plans/[file].md`
**Status**: Complete / Partial / Failed
**Duration**: [phase count] phases

### Phase Results

| Phase | Tasks | Status | Notes |
|------|-------|--------|-------|
| 1 | 1.1, 1.2 | PASS | All tasks complete |
| 2 | 2.1, 2.2 | PASS | All tasks complete |
| 3 | 3.1 | PASS | All tasks complete |

### Quality Checks
- Types: PASS/FAIL
- Lint: PASS/FAIL
- Tests: PASS/FAIL

### Done Criteria
- X/Y criteria met

### Files Modified
| File | Task | Status |
|------|------|--------|
| `path/to/file.ts` | 1.1 | Complete |

### Next Steps
- [Any remaining actions]
```

---

## Step 7.5: Recap (orchestration mode)

If `thoughts/CONTEXT.md` exists, also write `thoughts/RECAP.md`:

```markdown
# Execution Recap

**Plan**: `thoughts/plans/[file].md`
**Date**: YYYY-MM-DD HH:MM
**Branch**: [current branch]

## Phases

### Phase 1
- **Task 1.1**: [name] — done
- **Task 1.2**: [name] — done

### Phase 2
- **Task 2.1**: [name] — done

## Files Modified

| File | Task | Status |
|------|------|--------|
| `path/to/file.ts` | 1.1 | Complete |

## Pending Work

- [ ] [Any remaining items]

## Next Steps

1. [Most logical follow-up]
```

Also update `thoughts/STATE.md` with the current workflow position.

---

## Error Handling

### Automatic Retry Policy

Before escalating to the user, retry failed tasks automatically:

1. **Attempt 1 fails**: Re-read task context, retry immediately
2. **Attempt 2 fails**: Include error context from both attempts, retry with expanded instructions
3. **Attempt 3 fails**: Escalate to user with full error history and options (Retry/Skip/Abort)

### Task Failure

When a subagent task fails:

```markdown
## Task [X.Y] Failed

**Error**: [description]

Options:
1. **Retry** — Re-run this task
2. **Skip** — Mark as skipped, cascade to dependents
3. **Abort** — Stop execution entirely
```

If skipped, all tasks that depend on it are also skipped:
```markdown
**Skipped due to dependency**: Tasks 2.1, 3.1 (depend on failed 1.1)
```

### Quality Check Failure After Phase

```markdown
## Phase [N] Quality Check Failed

**Errors**:
- [error details]

Options:
1. **Fix and continue** — Fix issues, then resume from this phase
2. **Abort** — Stop execution
```

---

## Limitations

- **Claude Code only** — Uses Task tool for parallel subagents
- **No interactive tasks** — Subagents cannot ask user questions mid-task
- **File conflict risk** — Tasks in the same phase must NOT modify the same files
- **Sequential fallback** — If Task tool is unavailable, executes tasks sequentially

---

## Examples

```bash
# Execute the latest plan
/execute-plan --latest

# Execute a specific plan
/execute-plan thoughts/plans/2024-01-15_user-auth.md
```

---

## Tips

1. **Ensure plan has Task Dependencies** — Without them, execution is sequential
2. **Review phase plan before confirming** — Check for file conflicts
3. **Start with balanced profile** — Switch to budget for large plans
4. **Check done criteria** — They're your verification checklist
5. **Commit after each phase** — The commit-changes agent handles this automatically
