---
name: design-research
description: Discovery phase — synthesizes competitive analysis, target audience, and business context into a research document.
allowed-tools: Task, Read, Glob, AskUserQuestion, Write, WebFetch
argument-hint: "[topic]"
---

# Design:Research - Discovery & Competitive Analysis

Runs the discovery phase for a new product or feature. Gathers context, analyzes competitors, and produces a structured research document to inform design decisions.

## When to Use
- Starting a new product or feature with no prior research
- After `/spec` to enrich requirements with market context
- When competitive landscape is unknown

**Skip for:** Internal tools with no competition, or when research already exists in `thoughts/design/research.md`.

---

## Process
```
1. LOAD CONTEXT
   └── Read thoughts/specs/ (if exists) for requirements
   └── Read thoughts/design/design.md (if exists) for prior decisions

2. GATHER INPUT (AskUserQuestion)
   ├── Who is the target user? (demographics, technical level, context of use)
   ├── What problem does this solve? (pain point, current workarounds)
   ├── Competitors or reference products? (URLs or names)
   └── Business constraints? (timeline, budget, platform, team size)

3. COMPETITIVE ANALYSIS
   └── Invoke ux-researcher subagent with competitor list
   └── Analyze: features, UX patterns, strengths, weaknesses, differentiation opportunities

4. SYNTHESIS
   └── Key insights from research
   └── Target audience definition
   └── Differentiation opportunities
   └── Research questions for user interviews (if applicable)

5. PERSIST
   └── Write thoughts/design/research.md
   └── Append status to thoughts/design/design.md
```

## Step 2: Gather Input

Ask these questions via AskUserQuestion (combine into 2-3 questions max):
- Target audience and their context
- Core problem and current workarounds
- Competitor names or URLs (3-5 max)
- Any known constraints

## Step 3: Competitive Analysis

For each competitor:
- Core value proposition
- Key UX patterns (navigation, onboarding, key flows)
- Strengths from user perspective
- Weaknesses / gaps

Invoke the `ux-researcher` subagent with the gathered data.

## Step 4: Synthesis

Produce:
- **Target Audience**: primary persona sketch (expand in `/design:define`)
- **Key Insights**: 3-5 bullets from competitive analysis
- **Differentiation Opportunities**: where the product can win
- **Open Questions**: what we don't know yet, for user interviews

## Output: `thoughts/design/research.md`

```markdown
# Design Research: [Feature/Product]

**Date**: YYYY-MM-DD
**Status**: draft

## Target Audience
[Who, context of use, technical level]

## Problem Statement
[Core pain point and current workarounds]

## Competitive Analysis

### [Competitor 1]
- Value prop: ...
- UX patterns: ...
- Strengths: ...
- Weaknesses: ...

### [Competitor 2]
...

## Key Insights
1. ...
2. ...

## Differentiation Opportunities
- ...

## Open Questions
- ...

## Next Step
Run `/design:define` to build personas and user journeys.
```

## Tips
- Keep competitor analysis factual, not opinionated
- 3 competitors is usually enough — depth over breadth
- Open Questions become the agenda for user interviews
