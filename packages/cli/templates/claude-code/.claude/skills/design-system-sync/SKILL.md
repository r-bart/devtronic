---
name: design-system-sync
description: Syncs design tokens from thoughts/design/design-system.md to project config files (Tailwind, CSS vars, tokens.json).
allowed-tools: Task, Read, Write, Edit, Glob, Bash, AskUserQuestion
argument-hint: "[--dry-run]"
---

# Design:System-Sync - Token Synchronization

Syncs `thoughts/design/design-system.md` (source of truth) → project config files.

Use `--dry-run` to preview changes without applying them.

## When to Use
- After `/design:system-define` — apply newly defined tokens to project
- When design tokens change in the design file — propagate to code
- Before `/execute-plan` — ensure tokens are available before implementation starts

**Direction**: Always `design-system.md → project files`. Never reverse.

---

## Process

```
1. LOAD DESIGN SYSTEM
   └── Read thoughts/design/design-system.md

2. DETECT PROJECT CONFIG FORMAT
   ├── tailwind.config.* → Tailwind format
   ├── tokens.json / style-dictionary → Style Dictionary format
   ├── CSS :root { } → CSS custom properties
   └── Combination of above

3. INVOKE design-token-extractor
   └── Current state of project config tokens
   └── Compute diff: design-system.md vs current config

4. SHOW DIFF
   └── Tokens to ADD, MODIFY, REMOVE
   └── --dry-run: stop here

5. CONFIRM & APPLY
   └── AskUserQuestion to confirm if changes are significant
   └── Apply to config files

6. VERIFY
   └── Re-read config files to confirm changes applied correctly
```

## Step 2: Config Format Detection

### Tailwind
```javascript
// tailwind.config.js / tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: { primary: '#...' },
      spacing: { ... }
    }
  }
}
```

### CSS Custom Properties
```css
/* globals.css or tokens.css */
:root {
  --color-primary: #...;
  --space-4: 16px;
}
```

### Style Dictionary / tokens.json
```json
{
  "color": { "primary": { "value": "#..." } }
}
```

## Step 4: Diff Format

```
Design System Sync — Diff Preview

+ ADD: color.brand (new token)
  tailwind: colors.brand → '#4F46E5'
  CSS var: --color-brand → '#4F46E5'

~ MODIFY: color.primary
  current: '#3B82F6' → new: '#4F46E5'

- REMOVE: color.secondary.light (unused)
  Action: Remove from config (confirm first)

N tokens added, M modified, K removed.
Apply changes? [y/N]
```

## Tips
- Always `--dry-run` first on production codebases
- Removing tokens can break components — search for usages before removing
- After sync, run the build to catch any broken references
- Commit the sync as a separate `chore:` commit with message "sync design tokens"
