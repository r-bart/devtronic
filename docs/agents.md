# Agents Reference

Agents are specialized subagents that Claude invokes via the Task tool for specific purposes. Unlike skills (which you invoke with `/command`), agents are called automatically or by the main Claude instance when needed.

---

## Overview

| Agent | Model | Invocation | Purpose |
|-------|-------|------------|---------|
| error-investigator | haiku | Automatic | Quick error diagnosis |
| code-reviewer | sonnet | On request | Thorough PR/code review |
| quality-runner | haiku | Proactive | Run tests, typecheck, and lint |
| commit-changes | haiku | Delegated by skills | Atomic conventional commits |
| test-generator | sonnet | On request | Generate unit tests following project patterns |
| dependency-checker | haiku | Delegated by `/audit` | Audit dependencies for vulnerabilities and issues |
| doc-sync | haiku | On request | Verify docs match the actual codebase |

### Invocation Map

Which skills delegate to which agents:

```
/execute-plan  ──→  commit-changes    (after each wave passes quality checks)
/quick         ──→  commit-changes    (step 5: commit)
/audit         ──→  dependency-checker (--security mode: dependency health)
```

Standalone agents (invoked by Claude or user directly):
- **error-investigator** — automatic on errors
- **code-reviewer** — on request
- **quality-runner** — proactive after changes
- **test-generator** — on request
- **doc-sync** — on request

---

## error-investigator

**Model**: Haiku (fast, cheap)

**Purpose**: Quick error diagnosis when something fails during development.

### When Invoked (Automatic)

Claude invokes this agent automatically when:
- A command fails with an error
- Tests fail
- TypeScript/build errors appear
- Runtime errors or stack traces are shown
- Any unexpected failure during development

### When NOT Invoked

Skip for:
- Obvious typos the main agent can fix inline
- Simple missing imports that are immediately clear
- Errors where the fix is already stated in the error message
- Warnings (not errors) that don't block execution

### Diagnosis Process

```
1. PARSE ERROR    → Extract error type, message, file:line, stack trace
2. LOCATE SOURCE  → Read the relevant code (max 3-4 files)
3. IDENTIFY CAUSE → Syntax? Type? Missing import? Logic? Config?
4. SUGGEST FIX    → Provide actionable solution
```

### Investigation Limits

To stay fast and focused:
- **Max 3-4 file reads** - If not resolved, escalate
- **Max 2 grep searches** - Be targeted, not exhaustive
- **No deep rabbit holes** - Surface-level diagnosis only

### Output Format

```
ERROR: [concise error description]

CAUSE: [root cause in 1-2 sentences]

LOCATION: [file:line]

FIX:
[specific code change or action needed]
```

### Examples

**TypeScript Error**:
```
ERROR: Property 'foo' does not exist on type 'Bar'

CAUSE: Accessing undefined property. Type 'Bar' was updated but this usage wasn't.

LOCATION: src/components/Widget.tsx:45

FIX:
- Add 'foo' to the Bar type definition in src/types/bar.ts:12
- OR use optional chaining: bar.foo → bar?.foo
```

**Import Error**:
```
ERROR: Cannot find module './useTeam'

CAUSE: File was renamed to useTeamStore.ts but import not updated.

LOCATION: src/pages/TeamPage.tsx:5

FIX:
Change import from './useTeam' to './useTeamStore'
```

### Escalation

If the agent can't confidently identify the root cause, it recommends `/investigate`:

```
ERROR: [description]

ANALYSIS: Investigated [files checked] but root cause is not clear.

POSSIBLE CAUSES:
1. [cause A] - [why uncertain]
2. [cause B] - [why uncertain]

RECOMMENDATION: Run `/investigate` with full stack trace for deeper analysis.
```

**Escalate when**:
- Root cause spans multiple files (3+)
- Error involves race conditions or timing issues
- More than 2 possible causes with no clear winner
- Stack trace involves 5+ frames in application code
- Error is intermittent or hard to reproduce

---

## code-reviewer

**Model**: Sonnet (thorough, capable)

**Purpose**: Expert code review for PRs and significant changes.

### When Invoked

Claude invokes this agent when:
- User asks for a code review
- A PR needs to be reviewed
- User says "use subagents for code review"
- Complex changes need a second opinion

### Review Checklist

#### 1. Correctness
- Does the code do what it claims?
- Are edge cases handled?
- Is the logic sound?

#### 2. Architecture
- Does it follow project patterns?
- Is it in the correct layer (Clean Architecture)?
- Are dependencies pointing the right direction?

#### 3. Security
- Input validation present?
- SQL injection possible?
- XSS vulnerabilities?
- Sensitive data exposed?
- Auth/authz checks in place?

#### 4. Performance
- N+1 queries?
- Unnecessary re-renders?
- Memory leaks?
- Large bundle impact?

#### 5. Maintainability
- Is it readable?
- Are names descriptive?
- Is complexity justified?
- Will future devs understand this?

#### 6. Testing
- Are new paths tested?
- Do existing tests still pass?
- Edge cases covered?

### Review Process

```bash
# Get changed files
git diff --name-only main...HEAD

# Get full diff
git diff main...HEAD
```

Then for each file:
1. Read the changed file
2. Check surrounding context
3. Identify issues with severity
4. Provide file:line references

### Output Format

```markdown
# Code Review

**Branch**: [branch name]
**Files Changed**: [count]
**Lines**: +[added] / -[removed]

---

## Summary

[1-2 sentence overview]

## Findings

### Blockers

[Must fix before merge]

#### [Issue Title]
**File**: `path/to/file.ts:line`
**Severity**: Blocker
**Issue**: [description]
**Suggestion**: [how to fix]

### Warnings

[Should fix, not blocking]

### Suggestions

[Nice to have improvements]

## Security Check

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Auth checks in place
- [ ] No SQL injection vectors
- [ ] No XSS vulnerabilities

## Architecture Check

- [ ] Follows Clean Architecture
- [ ] Dependencies point inward
- [ ] Proper layer separation

## Verdict

[APPROVED / CHANGES REQUESTED / NEEDS DISCUSSION]

---

[Summary of required actions]
```

### Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| Blocker | Bug, security hole, breaks functionality | Must fix |
| Warning | Logic flaw, missing validation, code smell | Should fix |
| Suggestion | Style, minor improvement, nice-to-have | Optional |

### Review Principles

1. **Be thorough but not pedantic** - Focus on what matters
2. **Be specific** - Include file:line references
3. **Be constructive** - Suggest solutions, not just problems
4. **Prioritize** - Bugs > Security > Design > Style
5. **Acknowledge good code** - Positive feedback matters too

---

## quality-runner

**Model**: Haiku (fast)

**Purpose**: Run quality checks (tests, typecheck, lint) and report results concisely.

### When Invoked

Claude invokes this agent proactively after code changes to verify nothing is broken.

### Commands Used

```bash
# Run all quality checks
npm run typecheck && npm run lint && npm test

# Individual checks
npm run typecheck    # Type checking
npm run lint         # Linting
npm test             # Tests

# Run tests for specific area
npm test -- --filter [pattern]
```

### Process

1. Determine which checks to run based on the request (default: all)
2. Execute checks in order: typecheck → lint → test
3. Stop on first failure category (report it, don't continue)
4. If all pass: Report success briefly
5. If any fail: Provide actionable details

### Output Format

**All Passing**:
```
Quality checks passed:
- Types: OK
- Lint: OK
- Tests: X suites, Y tests
```

**Type Errors**:
```
TYPECHECK FAILED:

1. [file:line]
   Error: [TypeScript error message]
   Fix: [suggestion]
```

**Lint Errors**:
```
LINT FAILED:

1. [file:line]
   Rule: [eslint-rule-name]
   Error: [message]
   Fix: [suggestion or --fix command]
```

**Test Failures**:
```
TESTS FAILED:

1. [test file path]
   Test: [test name]
   Error: [concise error message]
   Location: [file:line]
   Suggestion: [brief fix suggestion]
```

### Common Fixes

**TypeScript**:
- Missing type annotation → Add explicit type
- Type 'X' is not assignable to 'Y' → Check expected type
- Property does not exist → Check spelling or add to interface
- Object possibly undefined → Add null check or optional chaining

**Lint**:
- Unused variable → Remove or prefix with `_`
- Missing dependency in useEffect → Add to deps array
- Prefer const → Change let to const

**Tests**:
- Assertion failed → Check expected vs actual values
- Timeout → Increase timeout or fix async handling
- Mock not called → Verify mock setup

### Invocation Modes

```
"Run quality checks"           # All checks
"Run typecheck only"           # Just types
"Run lint"                     # Just lint
"Run tests for auth"           # Filtered tests
"Quick quality check"          # Types + lint (no tests)
```

Focuses on actionable information. Does not dump full output unless specifically requested.

---

## commit-changes

**Model**: Haiku (fast, mechanical task)

**Purpose**: Create well-structured, atomic conventional commits from staged and unstaged changes.

### When Invoked

Primarily delegated by skills:
- **`/execute-plan`** — after each wave passes quality checks
- **`/quick`** — step 5, after implementation and verification

Also invoked directly when:
- The user says "commit these changes"
- Multiple logical changes need to be split into separate commits

### Commit Process

```
1. ANALYZE     → git status + git diff to see all changes
2. GROUP       → Split into atomic logical units
3. STAGE       → git add specific files (NEVER git add . or -A)
4. COMMIT      → Conventional commit with HEREDOC format
5. VERIFY      → git log + git status to confirm
```

### Commit Types

| Type | Use For |
|------|---------|
| feat | New features |
| fix | Bug fixes |
| refactor | Code restructuring (no behavior change) |
| test | Adding or updating tests |
| docs | Documentation changes |
| chore | Build process, dependencies, tooling |
| style | Formatting, whitespace (no code change) |
| perf | Performance improvements |
| ci | CI/CD changes |

### Commit Format

```bash
git commit -m "$(cat <<'EOF'
type(scope): concise description

Optional body with context.
EOF
)"
```

### Critical Rules

- **NEVER** runs `git push`
- **NEVER** uses `git add .` or `git add -A`
- **NEVER** amends existing commits unless explicitly asked
- **NEVER** commits files that look like secrets (.env, credentials, tokens)
- Read-only agent — cannot modify source files (only git operations)

### Output Format

```
COMMITS CREATED:

1. [hash] type(scope): description
   Files: [list of files]

Working tree: clean ✓
```

---

## test-generator

**Model**: Sonnet (requires reasoning for quality tests)

**Purpose**: Generate comprehensive unit tests for new or untested code, following existing project patterns.

### When Invoked

Claude invokes this agent when:
- New functions/modules are implemented without tests
- code-reviewer flags missing test coverage
- User asks to "generate tests for X"
- quality-runner reports low coverage on specific files

### When NOT Invoked

Skip for:
- Code that already has comprehensive tests
- Pure type-only changes (interfaces, type definitions)
- Configuration file changes
- Documentation-only changes

### Generation Process

```
1. DETECT SETUP  → Find test framework, patterns, conventions from existing tests
2. ANALYZE CODE  → Identify exports, inputs, outputs, errors, edge cases
3. GENERATE      → Create test file following project patterns
4. VERIFY        → Run tests, fix any failures
```

### Test Quality Rules

- Each test tests ONE behavior
- Test names describe expected behavior: "should return null when user not found"
- No test depends on another test's state
- Mock external dependencies, not internal logic
- Prefer realistic test data over trivial placeholders
- Cover: happy path, edge cases, error paths, boundary values
- Do NOT test implementation details (private methods, internal state)

### Output Format

```
TESTS GENERATED:

File: [path/to/file.test.ts]
Tests: [count] new tests in [count] describe blocks

Coverage:
- [function1]: happy path ✓, edge cases ✓, errors ✓
- [function2]: happy path ✓, edge cases ✓

Result: [X/Y tests passing]
```

### Escalation

If code is too tightly coupled to test effectively:

```
TESTING BLOCKED:

File: [source file]
Issue: [why it's hard to test]
Suggestion: [refactoring suggestion to improve testability]
```

---

## dependency-checker

**Model**: Haiku (mostly runs commands)

**Purpose**: Audit project dependencies for security vulnerabilities, outdated packages, unused dependencies, and license issues.

### When Invoked

Delegated by skills:
- **`/audit --security`** — handles the dependency audit portion (vulnerabilities, outdated, unused, licenses)

Also invoked directly when:
- The user asks about dependency health
- Before a release or major deployment
- After adding new dependencies

### Audit Process

```
1. DETECT ENV      → PM, monorepo, package.json
2. SECURITY AUDIT  → npm/pnpm/yarn audit
3. OUTDATED CHECK  → Flag major versions behind
4. UNUSED SCAN     → Compare imports vs package.json
5. LICENSE CHECK   → Flag copyleft/unknown licenses
```

### Checks Performed

| Check | What It Finds | Severity |
|-------|---------------|----------|
| Security audit | Known vulnerabilities (CVEs) | Critical to Low |
| Outdated | Packages behind latest version | Major = High |
| Unused | Dependencies never imported | Medium |
| Licenses | GPL, UNLICENSED, unknown | Varies |

### Output Format

```
DEPENDENCY HEALTH REPORT

## Security Vulnerabilities
| Package | Severity | Advisory | Fix |
...

## Outdated Packages
| Package | Current | Latest | Behind |
...

## Potentially Unused
| Package | Type | Confidence |
...

## License Issues
| Package | License | Risk |
...

Overall: [HEALTHY / NEEDS ATTENTION / ACTION REQUIRED]
```

### Limitations

- Cannot detect dependencies used only at runtime via dynamic require/import
- License check depends on `license-checker` availability
- Monorepo: checks root + workspace packages sequentially

---

## doc-sync

**Model**: Haiku (pattern matching, no deep reasoning)

**Purpose**: Verify that documentation accurately reflects the current state of the codebase. Read-only — never modifies files.

### When Invoked

Claude invokes this agent when:
- Before a release (catch stale docs before publishing)
- After significant changes (new features, removed features, renamed files)
- When code-reviewer flags potential doc inconsistencies
- When the user asks "are the docs up to date?"

### When NOT Invoked

Skip for:
- Trivial changes (typo fixes, formatting)
- When no documentation exists (nothing to check)

### Verification Process

```
1. INVENTORY       → Find all .md files, catalog claims
2. NUMERIC COUNTS  → Skills, agents, hooks counts vs actual
3. FILE REFERENCES → Verify backtick paths exist
4. COMMANDS        → Verify npm scripts and CLI flags
5. STRUCTURES      → Compare directory trees to reality
```

### What It Checks

| Category | Example |
|----------|---------|
| Stale counts | "16 skills" when there are actually 18 |
| Broken references | `` `src/old/path.ts` `` that no longer exists |
| Outdated commands | `npm run old-script` not in package.json |
| Stale structures | Directory tree missing new folders |
| Version mismatches | Docs say v1.7 but package.json says v1.8 |

### Output Format

```
DOCUMENTATION SYNC REPORT

## Stale Counts
| File | Claim | Actual | Fix |
...

## Broken References
| File | Reference | Issue |
...

## Outdated Commands
| File | Command | Issue |
...

Overall: [IN SYNC / NEEDS UPDATE]

Files needing updates:
1. [path] — [what to fix]
```

---

## Creating Custom Agents

To add your own agent, create a file in `.claude/agents/`:

```markdown
---
name: my-agent
description: What this agent does
tools: Bash, Read, Grep, Glob
model: haiku
---

You are a [role] specialist for this project.

## When to Invoke

Claude should invoke you when:
- [condition 1]
- [condition 2]

## Process

1. [Step 1]
2. [Step 2]

## Output Format

[Define expected output structure]
```

### Model Selection

| Model | Use For |
|-------|---------|
| haiku | Fast, simple tasks. Error diagnosis, running commands, quick checks. |
| sonnet | Complex tasks requiring reasoning. Code review, data analysis, planning. |
| opus | Most complex tasks. Deep analysis, architecture decisions. (Use sparingly) |

### Available Tools

Common tools to enable:
- `Bash` - Run commands
- `Read` - Read files
- `Grep` - Search content
- `Glob` - Find files
- `Edit` - Modify files (use carefully)
- `Write` - Create files

---

## Agent vs Skill: When to Use Which

| Aspect | Skill | Agent |
|--------|-------|-------|
| Invocation | Manual (`/command`) | Automatic or by Claude |
| Interaction | Often interactive | Usually autonomous |
| Context | Has full conversation | Isolated context |
| Purpose | Guided workflows | Specific focused tasks |
| Examples | /spec, /create-plan, /post-review | error-investigator, quality-runner, commit-changes, test-generator |

**Use a skill** when you want a structured workflow with user interaction.

**Use an agent** when you want Claude to autonomously handle a specific type of task.

---

## Related Documentation

- [Skills Reference](./skills.md) - Invocable workflows
- [CLI Reference](./cli-reference.md) - Command line tools
- [Customization Guide](./customization.md) - Creating custom agents
