---
name: design-ia
description: Information architecture phase — defines navigation structure, sitemap, and user flows from personas and journeys.
allowed-tools: Task, Read, Write, AskUserQuestion
argument-hint: "[scope]"
---

# Design:IA - Information Architecture & Navigation

## When to Use
- After `/design:define` — reads thoughts/design/define.md
- Before wireframing — IA is the skeleton that wireframes flesh out
- When navigation structure is unclear or complex

**Skip for:** Single-screen tools or features with no navigation.

---

## Process
```
1. LOAD CONTEXT
   ├── Read thoughts/design/define.md (personas, journeys)
   ├── Read thoughts/design/research.md (if exists)
   └── Read thoughts/specs/ for functional scope

2. CLARIFY SCOPE
   └── AskUserQuestion: how many screens? any existing navigation to respect?

3. INVOKE ia-architect
   └── Input: personas + journeys + functional requirements
   └── Output: sitemap, navigation model, content hierarchy, user flows

4. PRESENT & VALIDATE
   └── Show sitemap and primary flows to user
   └── Iterate if needed

5. PERSIST
   └── Write thoughts/design/ia.md
   └── Append to thoughts/design/design.md
```

## Step 3: What ia-architect produces

**Sitemap**: all screens/pages in hierarchical text format
**Navigation model**: primary nav, secondary nav, entry points
**Content hierarchy**: per screen — what content/actions appear and in what order
**User flows**: critical paths from persona journeys as step-by-step flows
**Dead-end check**: are there screens with no way back? Missing empty states?

## Output: `thoughts/design/ia.md`

```markdown
# Information Architecture: [Feature/Product]

**Date**: YYYY-MM-DD
**Status**: draft

## Sitemap

```
Home
├── [Section 1]
│   ├── [Screen 1.1]
│   └── [Screen 1.2]
└── [Section 2]
    └── [Screen 2.1]
```

## Navigation Model

- **Primary nav**: [items]
- **Secondary nav**: [items or "none"]
- **Entry points**: [how users arrive at key screens]
- **Exit points**: [where users go after completing main task]

## Content Hierarchy

### [Screen Name]
1. [Most important element]
2. [Secondary element]
3. [Supporting content]
4. [Actions]

## User Flows

### Flow: [Primary Task from Persona Journey]
```
[Step 1] → [Step 2] → [Step 3] → [Success State]
                    ↓
              [Error State] → [Recovery]
```

## IA Issues Found
- [ ] [Any dead-ends, missing states, or inconsistencies]

## Next Step
Run `/design:wireframe` to specify layout for each screen.
```

## Tips
- Sitemap depth beyond 3 levels usually indicates a UX problem
- Every flow needs an error/empty state
- Navigation should match users' mental model, not the technical structure
