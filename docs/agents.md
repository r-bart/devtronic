# Agents Reference

Agents are specialized subagents that Claude invokes via the Task tool for specific purposes. Unlike skills (which you invoke with `/command`), agents are called automatically or by the main Claude instance when needed.

---

## Overview

| Agent | Model | Invocation | Purpose |
|-------|-------|------------|---------|
| error-investigator | haiku | Automatic | Quick error diagnosis |
| code-reviewer | sonnet | On request | Thorough PR/code review |
| architecture-checker | sonnet | Delegated by `/post-review` | Validate Clean Architecture compliance |
| quality-runner | haiku | Proactive | Run tests, typecheck, and lint |
| commit-changes | haiku | Delegated by skills | Atomic conventional commits |
| test-generator | sonnet | On request | Generate unit tests following project patterns |
| dependency-checker | haiku | Delegated by `/audit` | Audit dependencies for vulnerabilities and issues |
| doc-sync | haiku | On request | Verify docs match the actual codebase |
| ux-researcher | sonnet | Delegated by `/design:research`, `/design:define` | Synthesize research, personas, user journeys |
| ia-architect | sonnet | Delegated by `/design:ia` | Navigation structure, user flows, sitemaps |
| design-critic | sonnet | Delegated by `/design:audit` | Nielsen's 10 heuristics evaluation |
| a11y-auditor | haiku | Delegated by `/design:audit` | WCAG 2.1 AA compliance checks |
| design-token-extractor | haiku | Delegated by `/design:system` skills | Extract and normalize design tokens |
| design-system-guardian | haiku | Delegated by `/design:system-audit`, `/post-review` | Detect design system drift (read-only) |
| visual-qa | sonnet | Delegated by `/design:review` | Compare implementation vs design specs |

### Invocation Map

Which skills delegate to which agents:

```
/execute-plan  ──→  commit-changes    (after each phase passes quality checks)
/quick         ──→  commit-changes    (step 5: commit)
/audit         ──→  dependency-checker (--security mode: dependency health)
/post-review   ──→  architecture-checker (architecture compliance check)
/design:research   ──→  ux-researcher          (competitive analysis, persona generation)
/design:define     ──→  ux-researcher          (personas, journeys, HMW questions)
/design:ia         ──→  ia-architect           (sitemap, navigation model, user flows)
/design:audit      ──→  design-critic          (Nielsen's 10 heuristics)
                   ──→  a11y-auditor           (WCAG 2.1 AA checks)
/design:system-*   ──→  design-token-extractor (extract and normalize tokens)
/design:system-audit──→ design-system-guardian (drift detection)
/design:review     ──→  visual-qa              (implementation vs spec comparison)
/post-review       ──→  design-system-guardian (design system compliance on changed files)
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

## architecture-checker

**Model**: Sonnet (requires understanding architecture rules)

**Purpose**: Validate that code changes respect the project's architecture rules (layer boundaries, dependency direction, domain purity).

### When Invoked

Delegated by skills:
- **`/post-review`** — runs architecture compliance check on changed files

Also invoked directly when:
- User asks to "check architecture" or "validate layer boundaries"
- Before merging significant PRs with structural changes

### How It Learns the Architecture

The agent does NOT have hardcoded rules. It discovers them at runtime from:
1. `CLAUDE.md` / `AGENTS.md` — Project rules and conventions
2. `docs/ARCHITECTURE.md` — Folder structure and layer definitions
3. `.claude/architecture-rules.md` — Explicit rules (if exists)

### Checks Performed

| Check | What It Validates |
|-------|-------------------|
| Layer dependency direction | Inner layers don't import from outer layers |
| Domain purity | Domain layer doesn't import ORM, HTTP, or SDK libraries |
| Pattern compliance | Use case return types, controller patterns, DI conventions |
| Module structure | New modules follow project's standard structure |
| No business logic in infra | Infrastructure files are thin wrappers |

### Output Format

```
## Architecture Check

**Project rules from:** [source files]
**Files analyzed:** N
**Violations:** X critical, Y warnings

### VIOLATIONS (must fix)
1. **[CHECK N] [Rule name]**
   `file/path.ts:42` — [description]

### WARNINGS (should fix)
...

### Verdict: PASS / FAIL
```

### Critical Rules

- **Read-only** — never modifies code, only reports
- Always reads project rules before checking
- Provides exact file:line for every finding
- Distinguishes VIOLATIONS from WARNINGS
- Checks only changed files unless asked for full scan

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
- **`/execute-plan`** — after each phase passes quality checks
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

## ux-researcher

**Model**: Sonnet (requires reasoning for synthesis)

**Purpose**: Synthesizes user research into personas, user journeys, competitive analysis, and HMW questions.

### When Invoked

Delegated by:
- **`/design:research`** — competitive analysis and research synthesis
- **`/design:define`** — persona generation and user journey mapping

### Capabilities

1. **Competitive Analysis** — identifies value propositions, UX patterns, strengths/weaknesses from competitor descriptions or URLs
2. **Persona Generation** — builds realistic personas with goals, frustrations, context of use, and behavioral insights
3. **User Journey Mapping** — maps stages (Discover → Onboard → Use → Return) with touchpoints, pain points, and opportunities
4. **HMW Questions** — generates 5-8 "How Might We" questions from identified pain points
5. **Problem Statements** — articulates "[Persona] needs a way to [action] because [insight]"

### Critical Rules

- Never invent user data — base everything on provided context
- When context is thin, explicitly note what assumptions were made
- Personas should feel like real people, not archetypes
- Journey maps must surface pain points, not just the happy path

---

## ia-architect

**Model**: Sonnet (requires reasoning for structure)

**Purpose**: Designs information architecture, navigation structures, and user flows from personas and requirements.

### When Invoked

Delegated by **`/design:ia`** with personas, journeys, and functional scope as input.

### Capabilities

1. **Sitemap Generation** — hierarchical screen/page structure (max 3 levels recommended)
2. **Navigation Model** — primary nav, secondary nav, entry and exit points aligned with users' mental model
3. **Content Hierarchy** — per screen: what content/actions appear and in what order
4. **User Flows** — critical paths with happy path + error/edge case paths
5. **IA Issues** — flags orphaned screens, dead-ends, navigation depth > 3 levels, missing states

### Critical Rules

- Navigation must serve users' goals, not mirror the database schema
- Every flow needs an error path — never design only the happy path
- Depth > 3 levels is a red flag — flatten or reconsider

---

## design-critic

**Model**: Sonnet (requires UX expertise)

**Purpose**: Evaluates designs against Nielsen's 10 usability heuristics.

### When Invoked

Delegated by **`/design:audit`** with wireframe text, screen descriptions, or UI code as input.

### The 10 Heuristics Checked

1. Visibility of system status
2. Match between system and real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

### Output Format

```
## Heuristic Evaluation

| # | Heuristic | Status | Finding | Recommendation |
|---|-----------|--------|---------|----------------|
| 4 | Consistency and standards | ⚠️ warn | ... | ... |
| 8 | Aesthetic and minimalist design | ❌ blocker | ... | ... |

Severity summary: N blockers, M warnings, K suggestions
```

Severity: ❌ blocker = must fix before launch, ⚠️ warning = should fix, 💡 suggestion = nice to have.

---

## a11y-auditor

**Model**: Haiku (pattern-matching checks)

**Purpose**: Validates WCAG 2.1 AA compliance across color contrast, keyboard navigation, ARIA, touch targets, and more.

### When Invoked

Delegated by **`/design:audit`** with HTML/JSX/CSS source files or wireframe text descriptions.

### Checks Performed

| Check | WCAG | What It Validates |
|-------|------|-------------------|
| Color contrast | 1.4.3 | 4.5:1 normal text, 3:1 large text and UI components |
| Touch targets | 2.5.5 | Minimum 44×44 CSS pixels for interactive elements |
| Alt text | 1.1.1 | All images have descriptive alt attributes |
| Form labels | 1.3.1 | Every input has an associated label |
| Keyboard nav | 2.1.1 | All interactive elements keyboard accessible |
| ARIA | 4.1.2 | Correct roles, required attributes, landmark regions |
| Reduced motion | 2.3.3 | Animations have `prefers-reduced-motion` override |

### Critical Rules

- AA compliance is the minimum for public-facing products
- Contrast must be calculated, not guessed
- Report file:line references for every violation

---

## design-token-extractor

**Model**: Haiku (parsing and normalization)

**Purpose**: Extracts design tokens from CSS, Tailwind config, or Style Dictionary files and normalizes them to a tool-agnostic format.

### When Invoked

Delegated by `/design:system-define`, `/design:system-sync`, `/design:system-audit`.

### Supported Sources

- `tailwind.config.js/ts` → extracts `theme.colors`, `theme.spacing`, `theme.fontFamily`, `theme.fontSize`, `theme.borderRadius`, `theme.boxShadow`
- CSS `:root { }` → extracts all `--variable: value` pairs
- `tokens.json` / Style Dictionary → extracts value fields

### Normalization Format

All tokens normalized to: `category.name: value`

Examples:
- Tailwind `colors.primary` → `color.primary: #value`
- CSS `--space-4` → `space.4: 16px`
- Tailwind `spacing[4]` → `space.4: 16px`

### Critical Rules

- Never invent token values — only extract what's in the files
- Report extraction errors rather than silently skipping
- Always note the source file for each extracted token

---

## design-system-guardian

**Model**: Haiku (fast pattern matching)

**Purpose**: Detects design system drift in source files — hardcoded values that should use tokens. **Read-only — never modifies code.**

### When Invoked

Delegated by:
- **`/design:system-audit`** — full codebase scan
- **`/post-review`** — check files modified in current branch

### Checks Performed

1. **Hardcoded Colors** — hex, rgb(), rgba(), hsl() values that match or are near a design system token
2. **Hardcoded Spacing** — numeric px/rem values where spacing tokens exist
3. **Token Coverage** — components in design system that aren't implemented in code

Requires `thoughts/design/design-system.md` to exist. If missing, reports: "No design system found. Run `/design:system --define` first."

### Output Format

```
## Design System Compliance

Files checked: N
Violations found: M

| File | Line | Type | Found | Token to use |
|------|------|------|-------|--------------|
| src/Button.tsx | 42 | hardcoded-color | #3B82F6 | color.primary |
| src/Card.tsx | 15 | hardcoded-spacing | padding: 16px | space.4 |

Compliance rate: X%
```

### Critical Rules

- **NEVER modifies any file** — reports only
- `disallowedTools: Edit, Write`
- File:line reference for every violation

---

## visual-qa

**Model**: Sonnet (requires visual reasoning)

**Purpose**: Compares implementation against wireframe specs or screenshots. Reports deviations in layout, components, states, and token usage.

### When Invoked

Delegated by **`/design:review`** with wireframe spec sections and implementation files (and optionally screenshot paths).

### Comparison Method

**Text-based** (primary): Compares wireframe spec → implementation code
- Components present
- Content hierarchy matches priority
- All interactive elements with correct labels
- All states implemented (empty, loading, error, success)
- Token usage (no hardcoded values)
- No placeholder copy in production

**Screenshot** (when provided): Compares layout zones, proportions, spacing, colors.

### Severity

- **Blocker**: Missing component, wrong primary action, broken state
- **Warning**: Token not used, layout deviation > 8px, missing state
- **Suggestion**: Copy refinement, animation, minor spacing polish

### Output Format

```
## Visual QA: [Component/Screen]

| Element | Expected | Found | Severity |
|---------|----------|-------|----------|
| Primary CTA | "Get Started" | "Start" | suggestion |
| Error state | Inline error | Toast | warning |
| Card padding | 16px (space.4) | 12px | warning |

N blockers, M warnings, K suggestions
```

### Critical Rules

- Only report deviations from the spec — no personal preferences
- Never modify implementation files
- Reference exact spec line for each deviation

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
| Examples | /spec, /create-plan, /post-review | error-investigator, architecture-checker, quality-runner, commit-changes, test-generator |

**Use a skill** when you want a structured workflow with user interaction.

**Use an agent** when you want Claude to autonomously handle a specific type of task.

---

## Related Documentation

- [Skills Reference](./skills.md) - Invocable workflows
- [CLI Reference](./cli-reference.md) - Command line tools
- [Customization Guide](./customization.md) - Creating custom agents
