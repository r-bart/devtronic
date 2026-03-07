---
name: design-define
description: Synthesis phase — generates personas, user journey maps, and HMW problem statements from research.
allowed-tools: Task, Read, Write, AskUserQuestion
argument-hint: "[topic]"
---

# Design:Define - Personas, Journeys & Problem Framing

## When to Use
- After `/design:research` (reads thoughts/design/research.md)
- When you have enough context to model the user
- Before jumping to wireframes or IA

**Skip for:** B2B internal tools where users are well-known, or when define artifacts already exist.

---

## Process
```
1. LOAD CONTEXT
   └── Read thoughts/design/research.md (required or ask for input)
   └── Read thoughts/specs/ for functional requirements

2. CLARIFY (if research is thin)
   └── AskUserQuestion: fill gaps in audience / pain points

3. INVOKE ux-researcher
   └── Input: research doc + any additional context
   └── Output: personas, journeys, HMW questions

4. REVIEW & REFINE
   └── Present output to user for validation
   └── Adjust persona names, priorities if needed

5. PERSIST
   └── Write thoughts/design/define.md
   └── Append status to thoughts/design/design.md
```

## Step 3: What ux-researcher produces

Ask the `ux-researcher` subagent to generate:

**Personas (2-3 max)**:
- Name, role, age range
- Goals (what they want to achieve)
- Frustrations (pain points)
- Context of use (device, environment, frequency)
- Quote that captures their mindset

**User Journey Maps (per primary persona)**:
- Stages: Discover → Onboard → Use → Return
- Actions per stage
- Touchpoints
- Pain points at each stage
- Opportunities for improvement

**How Might We questions**:
- 5-8 HMW questions from the pain points
- Format: "How might we [solve pain point] for [persona] so that [outcome]?"

**Problem Statement**:
- One crisp sentence: "[Persona] needs a way to [action] because [insight]"

## Output: `thoughts/design/define.md`

```markdown
# Design Define: [Feature/Product]

**Date**: YYYY-MM-DD
**Status**: draft

## Personas

### [Name] — [Role]
- **Goals**: ...
- **Frustrations**: ...
- **Context**: ...
- **Quote**: "..."

### [Name 2] — [Role]
...

## User Journey: [Primary Persona]

| Stage | Actions | Touchpoints | Pain Points | Opportunities |
|-------|---------|-------------|-------------|---------------|
| Discover | ... | ... | ... | ... |
| Onboard | ... | ... | ... | ... |
| Use | ... | ... | ... | ... |
| Return | ... | ... | ... | ... |

## Problem Statement
"[Persona] needs a way to [action] because [insight]."

## How Might We...
1. HMW [question 1]?
2. HMW [question 2]?
...

## Next Step
Run `/design:ia` to define navigation structure and information architecture.
```

## Tips
- 2 personas is usually better than 5 — focus over completeness
- HMW questions should be optimistic but not solution-prescriptive
- The Problem Statement is the single most important output — get it right
