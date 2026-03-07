---
name: learn
description: Post-task teaching breakdown. After any task, get a detailed explanation of what was done, why, and how to apply the concepts yourself. Use when you say "explain what you did" or "teach me".
allowed-tools: Read, Grep, Glob, AskUserQuestion
argument-hint: "[topic or recent task]"
---

# Learn - Post-Task Teaching

Transforms completed work into a learning opportunity. If `$ARGUMENTS` specifies a topic, focus on that; otherwise teach about the most recent task in the conversation.

## When to Use

- After any task you want to understand better
- After debugging sessions
- After configuration changes that seem magical
- When you think "I couldn't have done that myself"

---

## Teaching Framework

### 1. Summary (TL;DR)

One paragraph explaining what was accomplished in plain language.

### 2. Step-by-Step Breakdown

```markdown
#### Step N: [Action Name]

**What I did:**
- Concrete action taken

**Why this approach:**
- Reasoning behind the decision
- Alternatives considered

**The code:**
\`\`\`[language]
// Code with explanatory comments
\`\`\`
```

### 3. Key Concepts

```markdown
#### Concept: [Name]

**What it is:**
Brief explanation.

**Why it matters:**
When and why you'd use this.

**Real-world analogy:**
(If helpful)

**Example:**
\`\`\`[language]
// Minimal example
\`\`\`
```

### 4. Patterns to Remember

```markdown
#### Pattern: [Name]

**When to use:**
Situations where this applies.

**Template:**
\`\`\`[language]
// Generic template to copy
\`\`\`

**In this task:**
How it was applied here.
```

### 5. Common Pitfalls

```markdown
#### Pitfall: [Name]

**What goes wrong:**
Description of the mistake.

**Why it happens:**
Common cause.

**How to avoid:**
Prevention strategy.

**If it happens:**
How to fix it.
```

### 6. Try It Yourself

```markdown
#### Exercise: [Name]

**Goal:**
What you'll practice.

**Steps:**
1. First step
2. Second step
3. ...

**Expected result:**
What success looks like.

**Hint:**
> Spoiler hint
```

### 7. Go Deeper

```markdown
#### Resources

**Documentation:**
- [Relevant docs]

**Related concepts:**
- Concept X - how it connects

**In this codebase:**
- `path/to/example.ts` - Similar pattern
```

---

## Knowledge Check (Optional)

End with 3-5 quiz questions to reinforce learning:

```markdown
## Knowledge Check

### Q1: [Conceptual question]
Options:
a) ...
b) ...
c) ...

### Q2: [Practical question - which code is correct?]
...

### Q3: [Debugging question - what's wrong?]
...
```

Use `AskUserQuestion` tool to make it interactive.

---

## Output Guidelines

1. **Match complexity to task** - Simple task = shorter explanation
2. **Use actual code from the task** - Not generic examples
3. **Be honest about tradeoffs** - What was sacrificed
4. **Connect to existing knowledge** - Reference similar patterns
5. **Encourage experimentation** - Exercise should be doable

---

## Example: Adding a Hook

```markdown
## Learn: Custom React Hook

### 1. Summary

We created a custom hook `useDebounce` that delays updating a value until the user stops typing. This prevents excessive API calls while searching.

### 2. Step-by-Step

#### Step 1: Created the hook file

**What I did:**
Created `src/hooks/useDebounce.ts`

**Why:**
- Hooks go in `hooks/` by convention
- Reusable across components
- Separates timing logic from UI

**The code:**
\`\`\`typescript
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // Set up timer
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup: cancel timer if value changes before delay
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
\`\`\`

### 3. Key Concepts

#### Concept: Debouncing

**What it is:**
Waiting until activity stops before taking action.

**Real-world analogy:**
Like an elevator waiting for people to stop entering before closing doors.

### 4. Try It Yourself

Create `useThrottle` - similar but fires at most once per interval.

### 5. Go Deeper

- [usehooks-ts library](https://usehooks-ts.com/)
- In codebase: `src/hooks/useLocalStorage.ts`
```
