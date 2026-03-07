---
name: brief
description: Quick contextual briefing with pre-flight validation. Scans docs, code, git, and runs health checks before starting work.
allowed-tools: Task, Glob, Grep, Read, Bash
argument-hint: "[topic]"
---

# Brief - Quick Session Briefing

Fast contextual briefing when starting work on a feature. Displays relevant docs, code, and git activity in under 60 seconds.

## When to Use

- Starting a new session on existing work
- Quickly orienting yourself on a feature
- Checking what exists before `/research` or `/spec`
- Resuming after a break

**Skip for:** Brand new features with no prior work, or when you need deep analysis (use `/research` instead).

---

## Comparison with Other Skills

| Skill | Purpose | Creates File | Depth |
|-------|---------|--------------|-------|
| `/brief` | Quick briefing at session start | No (display only) | Superficial |
| `/research` | Deep codebase analysis | Yes | Deep |
| `/checkpoint` | Save session progress | Yes | State snapshot |

**Rule of thumb**: Start with `/brief`, escalate to `/research` if you need more.

---

## Process

```
0. READ PERSISTENT STATE
   ├── thoughts/STATE.md (current position)
   └── thoughts/SUMMARY.md (last session recap)

0.5. PRE-FLIGHT VALIDATION
     ├── Quality scripts exist? (typecheck, lint, test)
     ├── Quality passes? (quick run)
     ├── Stale state? (STATE.md older than latest commit)
     └── Referenced specs/plans exist?

1. PARSE INPUT
   └── Extract keywords + generate synonyms

2. PARALLEL SCANS (via subagents)
   ├── DOCS: thoughts/specs|plans|checkpoints|research/*keyword*
   ├── CODE: Glob + Grep for key files
   └── GIT: Recent commits, branches, PRs

3. SYNTHESIZE
   └── Combine into executive briefing

4. DISPLAY
   └── Show directly (no file created)

5. SUGGEST NEXT STEP
   └── Resume checkpoint, /research, or start implementing
```

---

## Step 0: Read Persistent State (ALWAYS first)

Before parsing input or launching scans, check for persistent state:

1. Read `thoughts/STATE.md` if it exists
2. Read `thoughts/SUMMARY.md` if it exists

### If STATE.md exists:

Display prominently at the top of the briefing output:

---

**Current State** (from STATE.md):
- **Active Feature**: [from file]
- **Workflow Position**: [e.g., "implementing Phase 2"]
- **Branch**: [from file]
- **Blockers**: [from file or "None"]

**Last Session** (from SUMMARY.md):
[What was done + what's pending]

---

[Then continue with regular scan results...]

### If neither file exists:

Proceed with normal flow. At the end suggest:
> No persistent state found. Run `/checkpoint` after this session to enable session continuity.

---

## Step 0.5: Pre-Flight Validation

Run quick health checks **in parallel** before diving into topic scans. This catches problems early so you don't discover broken builds mid-implementation.

### Checks to Run

Launch these checks in parallel (via Bash tool):

#### 1. Quality Scripts Exist

```bash
# Check package.json has the expected scripts
node -e "const p=require('./package.json'); const s=p.scripts||{}; const checks=['typecheck','lint','test'].map(k=>({name:k,exists:!!s[k]})); console.log(JSON.stringify(checks))"
```

#### 2. Quality Passes (quick run)

```bash
# Detect PM and run quality checks
# Use the project's quality command from CLAUDE.md, or fall back:
<pm> run typecheck 2>&1 | tail -5
<pm> run lint 2>&1 | tail -5
```

Skip `test` in pre-flight (too slow). Only run typecheck + lint.

#### 3. Stale State Detection

```bash
# Compare STATE.md timestamp with latest commit
git log -1 --format="%ci" 2>/dev/null
stat -f "%Sm" thoughts/STATE.md 2>/dev/null || echo "no STATE.md"
```

If STATE.md is older than the latest commit on the current branch, flag it:
> ⚠ STATE.md may be stale (last commit is newer). Consider running `/checkpoint` after this session.

#### 4. Referenced Files Exist

If STATE.md references an `Active Plan` path, verify the file exists. If it doesn't:
> ⚠ Active plan referenced in STATE.md not found: `thoughts/plans/[file].md`

### Pre-Flight Output

Display as a compact block before the main briefing:

```markdown
## Pre-Flight

| Check | Status |
|-------|--------|
| typecheck | ✅ Pass |
| lint | ✅ Pass |
| State freshness | ✅ Current |
| Referenced files | ✅ All found |
```

Or with issues:

```markdown
## Pre-Flight

| Check | Status |
|-------|--------|
| typecheck | ❌ 3 errors |
| lint | ✅ Pass |
| State freshness | ⚠️ Stale |
| Referenced files | ⚠️ Missing plan |

> Fix type errors before starting. Run: `<pm> run typecheck`
```

### When to Skip Pre-Flight

- If the user passes `--skip-preflight` in arguments
- If no `package.json` exists (not a Node project — skip quality checks)
- Still check state freshness and referenced files regardless

---

## Step 1: Parse Input

Parse the user's input from `$ARGUMENTS` to extract the main topic and any qualifiers:

```
Input: "telemetry sync"
Topic: telemetry
Qualifier: sync (narrows search)
```

---

## Model Selection

Before spawning Task subagents, check `thoughts/CONFIG.md` for model profile:

| Profile | Subagent model | Description |
|---------|---------------|-------------|
| quality | opus | Highest quality, most expensive |
| balanced | sonnet | Good balance (default) |
| budget | haiku | Fastest, cheapest |

If no CONFIG.md or no `profile:` line, default to **balanced** (sonnet for subagents).

---

## Step 2: Parallel Scans

Launch 3 parallel investigations using Task tool:

### Scan A: Documentation

```markdown
**Task**: Find documentation about [TOPIC]

Search these locations:
- thoughts/specs/*[keyword]*
- thoughts/plans/*[keyword]*
- thoughts/checkpoints/*[keyword]*
- thoughts/research/*[keyword]*
- thoughts/notes/*[keyword]*
- docs/*[keyword]*

Return: File paths with 1-line summary of each
Limit: Max 5 most recent/relevant docs
```

### Scan B: Code

```markdown
**Task**: Find code related to [TOPIC]

1. Glob for files: **/*[keyword]*.{ts,tsx,js,jsx,py,rs,go}
2. Grep for keywords in src/, apps/, packages/
3. Identify key files by import frequency

Return: File paths with purpose
Limit: Max 15 files, prioritize by relevance
```

### Scan C: Git Activity

```markdown
**Task**: Find git activity for [TOPIC]

1. Recent commits: git log --oneline --all --grep="[keyword]" -15
2. Branches: git branch -a | grep -i [keyword]
3. Recent PRs: gh pr list --search "[keyword]" --state all --limit 5

Return: Commit hashes, branch names, PR numbers
Limit: Max 15 commits, 5 branches, 5 PRs
```

---

## Step 3: Synthesize

Combine findings into brief sections. Keep it scannable.

---

## Step 4: Display Output

Display directly in conversation (DO NOT create a file):

```markdown
# Brief: [Topic]

## Summary

[2-3 sentences: what exists, current state, last activity]

---

## Documentation Found

| Type | File | Last Modified | Summary |
|------|------|---------------|---------|
| Spec | `thoughts/specs/auth-spec.md` | 2024-01-15 | OAuth2 implementation spec |
| Plan | `thoughts/plans/auth-plan.md` | 2024-01-16 | Implementation plan |
| Checkpoint | `thoughts/checkpoints/2024-01-18_auth.md` | 2024-01-18 | Paused at token refresh |

---

## Key Code Files

| File | Purpose |
|------|---------|
| `src/auth/AuthProvider.tsx` | Main auth context |
| `src/auth/useAuth.ts` | Auth hook |

---

## Git Activity

**Recent commits** (last 7 days):
- `a1b2c3d` feat: add JWT refresh logic
- `e4f5g6h` fix: session expiry bug

**Active branches**:
- `feature/auth-oauth`
- `fix/auth-token-refresh`

**Open PRs**:
- #123: OAuth2 implementation (draft)

---

## Next Steps

Based on findings:

1. **Resume checkpoint**: `thoughts/checkpoints/2024-01-18_auth.md`
   ```
   Continue from checkpoint. Next step: implement token refresh.
   ```

2. **Or start fresh**: The spec and plan exist, ready to implement.

3. **Need more depth?** Run `/research [topic]` for deep analysis.
```

---

## Limits

Keep output scannable:

| Category | Max Items |
|----------|-----------|
| Docs | 5 |
| Code files | 15 |
| Commits | 15 |
| Branches | 5 |
| PRs | 5 |

---

## Edge Cases

### No Results Found

```markdown
# Brief: [Topic]

## Summary

No existing documentation, code, or git activity found for "[topic]".

## Next Steps

This appears to be new work. Recommended flow:

1. `/spec [topic]` - Define requirements
2. `/research [topic]` - Investigate similar patterns
3. `/create-plan [topic]` - Create implementation plan
```

### Too Many Results

If initial scan returns >50 hits, ask user to narrow:

```markdown
Found 150+ files matching "user". Please be more specific:

- "user authentication" - Login/session related
- "user profile" - Profile/settings related
- "user management" - Admin/CRUD related
```

### Checkpoint Found

If a checkpoint exists, prioritize it:

```markdown
# Brief: [Topic]

## Active Checkpoint Found

`thoughts/checkpoints/2024-01-18_14-30_auth.md`

**Status**: Work in progress
**Last**: Token refresh implementation
**Next**: Handle edge case for expired tokens

**Recommended**: Resume from this checkpoint
```

---

## Tips

1. **Start broad, narrow if needed** - "auth" first, then "auth token refresh"
2. **Check for checkpoints first** - They contain actionable next steps
3. **Use for orientation, not analysis** - Deep dives need `/research`
4. **No file created** - This is display-only, context stays in conversation
5. **Fast turnaround** - Should complete in 30-60 seconds

---

## Examples

### Basic Usage

```
/brief authentication
/brief notifications
/brief user management
```

### With Specificity

```
/brief OAuth token refresh
/brief notification preferences API
/brief user role permissions
```

### After Long Break

```
/brief [feature I was working on last week]
```

Then follow up with checkpoint resume if one exists.
