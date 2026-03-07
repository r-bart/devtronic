---
name: investigate
description: Deep analysis of errors and bugs. Use when you paste an error for detailed investigation. Identifies root cause, analyzes flow, and proposes fix with code.
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
argument-hint: "[error or description]"
---

# Investigate - Deep Error Analysis

Systematic error investigation that identifies the root cause and proposes concrete solutions. The error to investigate is provided in `$ARGUMENTS`.

## When to Use

Invoke `/investigate` when:
- You paste an error/stack trace for analysis
- A bug is not obvious and requires investigation
- You need to understand the flow that caused the failure
- The error repeats and you want to document the solution

**For simple errors during development**: The `error-investigator` agent is invoked automatically.

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      INVESTIGATE WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PARSE ERROR                                                 │
│     └── Extract key information from the error                  │
│                                                                 │
│  2. LOCATE SOURCE                                               │
│     └── Find files and lines involved                          │
│                                                                 │
│  3. TRACE FLOW                                                  │
│     └── Follow execution flow that caused the error            │
│                                                                 │
│  4. IDENTIFY ROOT CAUSE                                         │
│     └── Determine the root cause (not the symptom)             │
│                                                                 │
│  5. PROPOSE FIX                                                 │
│     └── Concrete code to solve the problem                     │
│                                                                 │
│  6. VERIFY FIX                                                  │
│     └── Run tests and typecheck to confirm                     │
│                                                                 │
│  7. (OPTIONAL) SAVE ANALYSIS                                    │
│     └── For complex bugs, save to thoughts/debug/              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Parse Error

When the user invokes `/investigate [error]`, extract:

| Field | Description |
|-------|-------------|
| **Type** | TypeError, ReferenceError, build error, test failure, etc. |
| **Message** | The main error message |
| **Location** | File and line where it occurred |
| **Stack trace** | Calls that led to the error (if present) |
| **Context** | What the user was doing when it occurred |

### Parsing Example

```
User input:
TypeError: Cannot read properties of undefined (reading 'map')
    at TeamList (src/components/TeamList.tsx:23:15)
    at renderWithHooks (react-dom.development.js:14985:18)

Parsing:
- Type: TypeError
- Message: Cannot read properties of undefined (reading 'map')
- Location: src/components/TeamList.tsx:23
- Stack: TeamList → renderWithHooks (React render)
- Context: Rendering TeamList component
```

---

## Step 2: Locate Source

Read the code at the error location:

```bash
# Read main file
Read src/components/TeamList.tsx

# Search for definition of undefined value
Grep "teams" --type ts -C 3
```

Identify:
- The exact code that fails
- Where the problematic value comes from
- What conditions lead to that state

---

## Step 3: Trace Flow

Follow the flow backwards to understand how the error occurred:

```
Where does 'teams' come from?
    └── Component props
        └── Who passes the props?
            └── src/pages/TeamsPage.tsx:45
                └── useTeams() hook
                    └── src/hooks/useTeams.ts:12
                        └── teamStore.teams (Zustand)
```

Document each step with file:line.

---

## Step 4: Identify Root Cause

Distinguish between **symptom** and **root cause**:

| Symptom | Root Cause |
|---------|------------|
| `teams.map is undefined` | Initial state is `null` instead of `[]` |
| `404 on API call` | Expired token not refreshing |
| `Test timeout` | Unresolved promise due to missing mock |

### Questions to identify root cause:
- Why is the value in that state?
- What prior condition caused this?
- Is it a timing/race condition issue?
- Is validation or default value missing?

---

## Step 5: Propose Fix

Provide concrete, copy-pasteable code:

### Fix Format

```markdown
## Proposed Fix

**File**: `src/stores/teamStore.ts`
**Line**: 15

**Before**:
```typescript
teams: null,
```

**After**:
```typescript
teams: [],
```

**Why it works**: Initial state should be empty array, not null,
to avoid the `.map()` error during initial render.

**Alternative** (if null is intentional):
```typescript
// In TeamList.tsx:23
{teams?.map(team => ...) ?? <EmptyState />}
```
```

---

## Step 6: Verify Fix

After proposing or applying the fix, verify it works.

### Package Manager Detection

First, detect PM by checking lockfiles:
- `pnpm-lock.yaml` → `pnpm`
- `yarn.lock` → `yarn`
- `bun.lockb` → `bun`
- `package-lock.json` or none → `npm`

```bash
# Tests related to the affected file/component
<pm> test -- --grep "TeamList"

# Verify types
<pm> run typecheck

# If linter is configured
<pm> run lint -- --fix
```

### Verification criteria:
- [ ] Tests pass (or updated if behavior changed intentionally)
- [ ] No TypeScript errors
- [ ] No new linter warnings
- [ ] If applicable, manual verification of the flow

**If verification fails**, return to Step 4 to re-evaluate the root cause.

---

## Step 7: Save Analysis (Optional)

For complex bugs worth documenting:

**Note**: If the `thoughts/debug/` directory doesn't exist, create it first:
```bash
mkdir -p thoughts/debug
```

### Analysis format:

```markdown
# Debug: [Descriptive title]

**Date**: YYYY-MM-DD
**Error**: [Error message]
**Severity**: critical | high | medium | low

---

## Symptom

[What the user observed]

## Investigation

### Error Flow
[Diagram of the flow that caused the error]

### Files Involved
- `path/to/file.ts:line` - [role in the error]

## Root Cause

[Explanation of the fundamental cause]

## Solution

[Code of the applied fix]

## Prevention

[How to prevent it from happening again]
- [ ] Add test for this case
- [ ] Improve validation in X
- [ ] Document in CLAUDE.md
```

Save to: `thoughts/debug/YYYY-MM-DD_[short-description].md`

---

## Output Format

### For simple errors:

```
## Analysis

**Error**: [type and message]
**Location**: [file:line]

**Cause**: [explanation in 1-2 sentences]

## Fix

**File**: `path/to/file.ts`

```typescript
// Change this:
const teams = null;

// To this:
const teams = [];
```

Apply the fix and run verification?
```

### For complex errors:

```
## Analysis

**Error**: [type and message]
**Severity**: [critical/high/medium/low]

### Error Flow

1. User does X → `file1.ts:10`
2. Calls function Y → `file2.ts:25`
3. State Z is undefined → `file3.ts:40`
4. Error accessing property → `file1.ts:15`

### Root Cause

[Detailed explanation]

### Affected Files

| File | Line | Change |
|---------|-------|--------|
| `file1.ts` | 15 | Add optional chaining |
| `file3.ts` | 40 | Initialize with default |

## Proposed Fix

[Code for each file]

---

Apply the changes? I'll run automatic verification afterwards.
I can also save this analysis to thoughts/debug/.
```

---

## Common Error Types

### Runtime Errors
- TypeError, ReferenceError → Undefined/null values
- RangeError → Arrays/loops with incorrect indices

### Build Errors
- TypeScript → Incompatible types, missing imports
- Vite/Webpack → Configuration, modules not found

### Test Failures
- Assertions → Expected vs received values
- Timeouts → Unresolved promises, missing mocks
- Act warnings → State updates outside act()

### React Errors
- Hydration mismatch → Server/client render different
- Invalid hook call → Hooks outside components
- Too many re-renders → useEffect without correct deps

---

## Tips

1. **Read the full error** - Sometimes the cause is in previous lines
2. **Find the undefined value** - Trace backwards to its origin
3. **Check recent changes** - `git diff` can reveal the cause
4. **Reproduce first** - Make sure you understand how it occurs
5. **Test the fix** - Run the code after applying changes

---

## Integration with error-investigator

```
[Error during development]
    ↓
Agent: error-investigator (automatic, haiku, fast)
    ↓
[If error-investigator cannot resolve it]
    ↓
error-investigator suggests:
"Cannot determine root cause with confidence.
 Recommend running /investigate with full stack trace for deeper analysis."
    ↓
/investigate [paste full error] (deep analysis)
    ↓
[Fix applied and verified]
    ↓
(Optional) Save to thoughts/debug/ for reference
```
