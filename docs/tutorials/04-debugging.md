# Tutorial 04: Error Debugging

How to approach error debugging in a structured way with rbartronic.

---

## Objective

By the end of this tutorial:
- You'll know how to use `/investigate` to analyze errors
- You'll understand when error-investigator is invoked automatically
- You'll have a systematic process for resolving bugs

---

## Prerequisites

- Project with rbartronic installed
- An error to debug (or follow the example)

---

## The Debugging Process

```
Error occurs
     │
     ├─▶ Automatic: error-investigator analyzes
     │
     ▼
/investigate [error]   →  Deep analysis if needed
     │
     ▼
/research [area]      →  Understand code context
     │
     ▼
[fix]                 →  Implement solution
     │
     ▼
/post-review --quick       →  Verify the fix
```

---

## Case 1: Console Error

### The Error

```
TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (src/components/UserList.tsx:15)
    at renderWithHooks (react-dom.development.js:149)
```

### Step 1: Paste the Error

Simply paste the error in Claude:

```
TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (src/components/UserList.tsx:15)
```

The **error-investigator** is invoked automatically and analyzes:

```
Claude: Analyzing the error...

📍 Location: src/components/UserList.tsx:15
🔍 Probable cause: `users` is undefined when trying to .map()

Verifying the code...

The problem is in:
```tsx
export function UserList() {
  const { users } = useUserStore()
  return users.map(u => <UserCard key={u.id} user={u} />)
}
```

`users` can be undefined before data is loaded.

✅ Suggested fix:
```tsx
return users?.map(u => <UserCard key={u.id} user={u} />) ?? <Loading />
```

Would you like me to apply this fix?
```

### Step 2: Apply the Fix

```
Yes, apply the fix
```

### Step 3: Verify

```bash
pnpm typecheck && pnpm test
```

---

## Case 2: Complex Error

### The Error

```
Error: Hydration failed because the initial UI does not match
what was rendered on the server.
```

### Step 1: Use /investigate

For complex errors, use the full skill:

```
/investigate "hydration mismatch in user dashboard"
```

Claude will do deep analysis:

```
Claude: Investigating hydration mismatch...

## Analysis

### Possible causes
1. Using `Date.now()` or `Math.random()` in render
2. Difference between server/client in localStorage
3. Component using window/document without check

### Code search

Found localStorage usage without check:
```tsx
// src/components/ThemeProvider.tsx:12
const theme = localStorage.getItem('theme') || 'light'
```

This causes mismatch because:
- Server: localStorage doesn't exist → 'light'
- Client: localStorage exists → saved value

### Proposed fix

```tsx
const [theme, setTheme] = useState('light')

useEffect(() => {
  const saved = localStorage.getItem('theme')
  if (saved) setTheme(saved)
}, [])
```
```

### Step 2: Research if You Need More Context

```
/research "theme system implementation"
```

To understand how the theme system works before modifying it.

### Step 3: Apply Fix

```
Apply the fix for hydration mismatch
```

### Step 4: Review

```
/post-review --quick
```

---

## Case 3: Test Error

### The Error

```bash
 FAIL  src/domain/User/UseCases/CreateUser.test.ts
  ● CreateUserUseCase › should create user with valid data

    expect(received).toEqual(expected)

    Expected: {"id": "123", "email": "test@test.com"}
    Received: {"id": "123", "email": "test@test.com", "createdAt": 2026-02-05T...}
```

### Step 1: Analyze

```
Test failure in CreateUser.test.ts - receiving extra createdAt field
```

The error-investigator analyzes:

```
Claude: The test expects an object without createdAt, but the use case
is adding it.

Options:
1. Update the test to include createdAt
2. Modify the use case to not return createdAt
3. Use toMatchObject instead of toEqual

Recommendation: Option 1 - createdAt is a valid part of the model.

Would you like me to update the test?
```

### Step 2: Decide and Apply

```
Yes, update the test
```

---

## Case 4: Bug Without Visible Error

Sometimes the bug is incorrect behavior without explicit error.

### Describe the Problem

```
/investigate "users are not being filtered by role, all users shown regardless of filter"
```

Claude will investigate:

```
Claude: Investigating user filter...

## Search

Found the filter in:
- src/features/users/hooks/useFilteredUsers.ts

## Analysis

```ts
// Line 15
const filtered = users.filter(u => u.role === role)
```

The code looks correct. Verifying the flow...

The problem is in the component:
```tsx
// src/features/users/components/UserFilters.tsx:23
<Select onChange={(e) => setRole(e.target.value)}>
```

The initial value of `role` is `undefined`, but the select
shows "Admin". There's a mismatch between UI and state.

## Fix

Initialize state with select value:
```tsx
const [role, setRole] = useState<Role>('admin')
```
```

---

## The error-investigator Agent

### When It's Invoked Automatically

- You paste a stack trace
- A bash command fails
- Tests fail
- Build fails

### What It Does

1. Analyzes the error
2. Searches for location in code
3. Identifies probable cause
4. Suggests specific fix

### Model Used

**Haiku** - Fast and economical for initial diagnosis.

---

## Save Debug Analysis

For complex bugs, Claude saves the analysis:

```
thoughts/debug/2026-02-05_hydration-mismatch.md
```

Useful for:
- Future reference
- Documenting known bugs
- Sharing with team

---

## Verification

✅ You know how to paste errors for automatic analysis
✅ You can use `/investigate` for deep investigation
✅ You understand the flow: error → analysis → research → fix → verify

---

## Next Step

→ [Tutorial 05: Learning](./05-learning.md)

Learn to extract knowledge from what you implemented.

---

## Tips

1. **Paste the complete error** - Include stack trace
2. **Describe expected behavior** - "Should filter, but shows all"
3. **Use /research** if the fix requires understanding more context
4. **Always verify** - `typecheck && lint && test` after the fix
5. **Document complex bugs** - Save in thoughts/debug/

---

## Common Debugging Mistakes

### Not giving enough context

❌ "It doesn't work"
✅ "The submit button doesn't do anything when I click. No errors in console."

### Ignoring the stack trace

The stack trace indicates EXACTLY where the problem is. Always include it.

### Fixing without understanding

If you don't understand the proposed fix, use `/research` to understand the code area first.
