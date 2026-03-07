---
name: spec
description: Create a product specification (PRD) by interviewing the user. Captures requirements, UX decisions, edge cases, and success metrics before technical work begins.
allowed-tools: AskUserQuestion, Write, Read, Glob
argument-hint: "[feature]"
---

# Spec - Product Requirements Interview

Creates a PRD through structured interviewing for `$ARGUMENTS`. Captures WHAT to build and WHY before technical work.

## When to Use

- Starting a significant new feature
- Requirements are vague or incomplete
- Multiple approaches are possible
- Feature affects user experience significantly

**Skip for:** Bug fixes, simple changes, pure refactoring.

---

## Process

```
1. GATHER INITIAL INPUT
   ├── User provides rough idea
   └── Ask: "Do you have design mockups for this feature?" (Figma, Sketch, etc.)

2. STRUCTURED INTERVIEW
   ├── Problem & Goals
   ├── User Experience
   ├── Technical Considerations
   ├── Edge Cases & Errors
   ├── Success Metrics
   └── [If mockups] Design Reference

3. WRITE PRD
   └── Save to thoughts/specs/

4. REVIEW & ITERATE
   └── User validates before proceeding
```

---

## Interview Areas

### Problem & Goals
- What problem does this solve?
- Why is this important now?
- What happens if we don't build this?

### User Experience
- Who are the primary users?
- What's the ideal user journey?
- Mobile vs desktop behavior?

### Technical Considerations
- Performance requirements?
- Offline support needed?
- External integrations?
- Security implications?

### Edge Cases
- What happens when X fails?
- Empty states?
- Limits (max items, size)?
- Concurrent access?

### Success Metrics
- How will we know it's successful?
- What metrics to track?

### Design Reference (if mockups provided)

If the user provides a design tool link (Figma, Sketch, etc.), use the appropriate MCP to analyze and extract:

- **Design System Alignment**:
  - Tokens used (colors, typography, spacing from Figma variables)
  - DS components reused (existing components from the system)
  - New components needed (gaps - what doesn't exist yet)

- **Visual Specs**: Key dimensions, constraints, documented interactions

- **Screenshot**: Export main frame for quick reference

---

## PRD Template

Save to: `thoughts/specs/YYYY-MM-DD_[feature-slug].md`

```markdown
# PRD: [Feature Name]

**Date**: YYYY-MM-DD
**Status**: draft | reviewed | approved

---

## Executive Summary

[2-3 sentences: what we're building and why]

---

## Problem Statement

### Current State
[How things work today]

### Pain Points
- [Pain point 1]
- [Pain point 2]

---

## Goals & Non-Goals

### Goals
1. [Primary goal]
2. [Secondary goal]

### Non-Goals
- [What we're NOT doing]

---

## User Stories

**As a** [user type]
**I want to** [action]
**So that** [benefit]

Acceptance Criteria:
- [ ] [Criterion 1]
- [ ] [Criterion 2]

---

## Functional Requirements

### Feature 1
- Description: [What it does]
- Behavior: [How it works]
- Edge cases: [Boundaries]

---

## Technical Considerations

<!-- CUSTOMIZE: Add relevant sections for your stack -->

- Data model changes
- API changes
- Performance requirements
- Security requirements

---

## Design Reference

<!-- Include this section only if design mockups were provided -->

> Source: [Design Tool Link](url)

### Design System Alignment

| Aspect | Details |
|--------|---------|
| **Tokens used** | [colors, typography, spacing from design variables] |
| **DS components reused** | [existing components from the system] |
| **New components needed** | [gaps - what doesn't exist yet] |

### Visual Specs

- Key dimensions/constraints: [extracted from design]
- Documented interactions: [if any in Figma]

### Reference Screenshot

[Embedded frame export or link to Figma frame]

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| [Metric] | [Target] | [Method] |

---

## Open Questions

- [ ] [Unresolved question]

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | High/Med/Low | [How to address] |
```

---

## After Writing

```
I've created the product specification:
thoughts/specs/YYYY-MM-DD_[feature].md

Please review:
1. Problem Statement - Captures the real problem?
2. User Stories - Right use cases?
3. Requirements - Anything missing?
4. Risks - Concerns not addressed?

Once approved, proceed to:
- /generate-tests (generate failing tests as Definition of Done)
- /research (if code investigation needed)
- /create-plan (if ready to design implementation)
```

---

## Tips

1. **Ask NON-OBVIOUS questions** - Don't ask what's already clear
2. **Challenge assumptions** - Explore alternatives
3. **Include non-goals** - Clarify scope
4. **Match depth to complexity** - Simple feature = shorter spec
