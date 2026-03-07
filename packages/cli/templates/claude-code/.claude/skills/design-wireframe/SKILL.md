---
name: design-wireframe
description: Wireframe specification phase — generates structured text-based wireframe specs per screen. Tool-agnostic. Reads IA and define artifacts.
allowed-tools: Task, Read, Write, AskUserQuestion
argument-hint: "[screen-name|--all]"
---

# Design:Wireframe - Screen Wireframe Specifications

## When to Use
- After `/design:ia` — reads thoughts/design/ia.md for screen list
- Before implementation planning — wireframes inform component breakdown
- When: layout decisions need to be made explicit before coding

**Skip for:** Screens already designed in a design tool (use `/design:review` instead).

---

## Process
```
1. LOAD CONTEXT
   ├── Read thoughts/design/ia.md (screen list, hierarchy, flows)
   ├── Read thoughts/design/define.md (personas — who uses each screen)
   └── Determine scope: all screens or specific screen from $ARGUMENTS

2. PER SCREEN — generate wireframe spec:
   ├── Layout zones (header, main, sidebar, footer, modals)
   ├── Component list (what appears and where)
   ├── Content hierarchy (order of elements)
   ├── Interactive elements (buttons, inputs, links) + their actions
   ├── States (empty, loading, error, success)
   └── ASCII layout sketch (optional but helpful)

3. REVIEW
   └── Ask user to confirm key layout decisions

4. PERSIST
   └── Write thoughts/design/wireframes.md
   └── Append to thoughts/design/design.md
```

## Wireframe Spec Format (per screen)

Each screen uses this structure:

```markdown
### Screen: [Name]

**Route/location**: [URL pattern or nav path]
**Primary persona**: [who uses this most]
**Primary action**: [the one thing users do here]

#### Layout Zones
- **Header**: [logo, nav, user menu, search]
- **Main**: [primary content area]
- **Sidebar**: [secondary navigation or filters — or "none"]
- **Footer**: [secondary links, legal — or "none"]

#### Components
1. [Component name] — [brief description of content/purpose]
2. [Component name] — [brief description]
...

#### Content Hierarchy
1. [Most prominent element]
2. [Secondary element]
3. [Supporting content]

#### Interactive Elements
| Element | Type | Action |
|---------|------|--------|
| [Button label] | button | [what happens] |
| [Field label] | input | [what it accepts] |

#### States
- **Empty**: [what shows when no content]
- **Loading**: [skeleton? spinner? what kind]
- **Error**: [how errors surface]
- **Success**: [confirmation pattern]

#### ASCII Sketch (optional)
\`\`\`
┌─────────────────────────────┐
│ Logo         Nav    [Login] │
├─────────────────────────────┤
│ [Hero content]              │
│                             │
│ [Card] [Card] [Card]        │
└─────────────────────────────┘
\`\`\`
```

## Output: `thoughts/design/wireframes.md`

Header:
```markdown
# Wireframe Specs: [Feature/Product]

**Date**: YYYY-MM-DD
**Screens**: N
**Status**: draft

## Screens
[table of contents linking to each screen spec]
```

Then one section per screen using the format above.

Footer:
```markdown
## Next Steps
- Run `/design:system` to define design tokens and components
- Run `/create-plan` — wireframes inform component breakdown in implementation plan
```

## Tips
- Specs are tool-agnostic — no Figma required to write them
- ASCII sketches clarify layout faster than 100 words of description
- Every screen needs all 4 states defined (empty/loading/error/success)
- Components listed here become the component list for `/create-plan`
