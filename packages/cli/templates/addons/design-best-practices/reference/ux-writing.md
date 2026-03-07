# UX Writing Reference

Guide to interface copy: error messages, labels, CTAs, empty states, and microcopy.

---

## Error Messages

### Structure

Every error message needs three parts:

1. **What happened** — Clear description of the problem
2. **Why it happened** — Brief explanation (if helpful)
3. **What to do** — Actionable next step

### Examples

```
❌ "Error 422: Validation failed"
✅ "This email is already registered. Try signing in instead."

❌ "Something went wrong"
✅ "We couldn't save your changes. Check your connection and try again."

❌ "Invalid input"
✅ "Password must be at least 8 characters with one number."
```

### Rules

- Never blame the user ("You entered an invalid email")
- Never use technical jargon ("Error 500", "null reference")
- Always provide a path forward
- Use the same tone as the rest of the UI
- Place error messages next to the field, not in a toast or alert

---

## Labels & Form Copy

### Input Labels

- Be specific: "Work email" not "Email"
- Use nouns, not instructions: "Full name" not "Enter your full name"
- Don't end with a colon in modern UI (the position above the input is enough)

### Placeholder Text

- Use for format hints only: "jane@example.com", "MM/DD/YYYY"
- Never use as the only label (disappears on type)
- Use lighter color than input text

### Help Text

- Place below the input, before error messages
- Keep to one line: "We'll only use this for password recovery."
- Don't repeat the label as help text

---

## Buttons & CTAs

### Primary Actions

Use specific verbs, not generic ones:

```
❌ "Submit"     → ✅ "Create account"
❌ "OK"         → ✅ "Save changes"
❌ "Click here" → ✅ "Download report"
❌ "Yes"        → ✅ "Delete project"
```

### Destructive Actions

- Name the action explicitly: "Delete project" not "Delete"
- Add confirmation context: "This will permanently delete 23 files"
- Use red/warning styling
- Make cancel the primary (default) action in confirmation dialogs

### Button Pairs

```
✅ "Cancel" / "Save changes"       (clear contrast)
✅ "Go back" / "Continue to payment"
❌ "No" / "Yes"                     (ambiguous)
❌ "Cancel" / "OK"                  (what does OK mean?)
```

---

## Empty States

Every empty state needs:

1. **Illustration or icon** (optional but effective)
2. **Headline** — What would be here
3. **Description** — Why it's empty
4. **Action** — How to fill it

### Examples

```
No projects yet
You haven't created any projects. Start with a template or from scratch.
[Create project]

No results for "flarbx"
Try a different search term or check your filters.
[Clear search]

All caught up!
No new notifications. We'll let you know when something needs your attention.
```

### Rules

- Don't leave empty containers without explanation
- Guide toward the most common action
- Keep tone encouraging, not apologetic
- Different empty states: first-time vs. filtered-to-zero vs. deleted-all

---

## Loading Copy

### Spinner/Skeleton Text

- Don't write "Loading..." everywhere
- Be specific when possible: "Loading your projects..."
- For long waits (>3s), add context: "Setting up your workspace. This usually takes a few seconds."

### Progress States

```
Uploading 3 of 12 files...
Almost there — analyzing your data...
Your report is ready!
```

---

## Confirmation & Success

### Inline Confirmation

- "Changes saved" (brief, next to the action)
- "Email sent to jane@example.com" (specific)
- Auto-dismiss after 3-5 seconds

### Don't Over-Confirm

- Saving a draft: no confirmation needed (auto-save)
- Adding to cart: show cart count update (visual confirmation)
- Deleting a major item: full confirmation dialog

---

## Tone Guidelines

### Default Tone: Clear, Warm, Concise

```
✅ Professional but human
✅ Direct without being cold
✅ Helpful without being patronizing
```

### Scale Formality by Context

| Context | Tone | Example |
|---------|------|---------|
| Onboarding | Warm, encouraging | "Welcome! Let's set up your workspace." |
| Error | Calm, helpful | "That file is too large. Try one under 10MB." |
| Success | Brief, positive | "Project created." |
| Destructive | Serious, clear | "This will permanently delete your account and all data." |
| Empty state | Friendly, guiding | "No messages yet. Start a conversation!" |

---

## Microcopy Checklist

- [ ] Every button says what it does (no generic "Submit")
- [ ] Every empty state guides toward action
- [ ] Error messages are actionable, not technical
- [ ] Tooltips add information, not restate labels
- [ ] Confirmation text matches the action severity
- [ ] Loading states are specific when possible
- [ ] Numbers and dates are formatted for locale
