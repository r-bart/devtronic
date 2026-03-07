---
name: design-critique
description: Design critique with AI slop detection — visual hierarchy, information architecture, emotional resonance, actionable report
user-invokable: true
allowed-tools: Read, Glob, Grep
---

# Design Review

Perform a structured design critique on the current UI. Produces an actionable report covering visual quality, hierarchy, accessibility, and AI slop detection.

## When to Use

- After implementing a new page or component
- Before shipping UI changes
- When UI "feels off" but you can't pinpoint why
- Periodic design quality audits

---

## Process

### 1. Gather Context

- Read the Design Context from CLAUDE.md (if exists)
- Identify the files/components under review
- Understand the purpose of the UI being reviewed

### 2. AI Slop Test

Check for common AI-generated design anti-patterns:

| Signal | What to Look For |
|--------|-----------------|
| Generic gradients | Blue/purple gradients with no design rationale |
| Border-radius abuse | Everything is a pill or has identical rounding |
| Shadow soup | Drop shadows on every element |
| Meaningless animation | Hover scales/glows on non-interactive elements |
| Placeholder copy | "Welcome to our platform", "Lorem ipsum" in production |
| Color overload | Rainbow dashboards, competing accents |
| Flat hierarchy | Everything has equal visual weight |
| Card-itis | Every piece of information boxed in a card |

**Severity**: Flag each as `slop` (definite AI pattern) or `risk` (borderline).

### 3. Visual Hierarchy Audit

- Is there a clear focal point on each view?
- Does the type hierarchy communicate importance? (H1 > H2 > body > caption)
- Is whitespace used intentionally to group and separate?
- Are interactive elements visually distinct from static content?

### 4. Information Architecture

- Is the content structure logical?
- Can users find what they need without thinking?
- Are labels clear and consistent?
- Do empty states guide users toward action?

### 5. Emotional Resonance

- Does the design match the intended mood/brand?
- Is there a human touch (warmth, personality)?
- Would a real user trust this interface?

### 6. Accessibility Quick Check

- Color contrast ratios (4.5:1 body text, 3:1 large text)
- Focus indicators visible?
- Touch targets adequate (44x44px minimum)?
- Screen reader landmarks present?

---

## Output Format

```markdown
## Design Review: [Component/Page Name]

### AI Slop Score: [0-10] (0 = no slop, 10 = fully generic)

**Flagged patterns:**
- [pattern]: [severity] — [specific location and fix]

### Visual Hierarchy: [Strong / Adequate / Weak]
- [finding 1]
- [finding 2]

### Information Architecture: [Clear / Adequate / Confused]
- [finding 1]

### Accessibility: [Pass / Needs Work / Fail]
- [finding 1]

### Recommended Actions (priority order)
1. [Most impactful fix]
2. [Second fix]
3. [Third fix]
```

---

## Tips

- Be specific: "The card shadow is too heavy at `shadow-lg`" not "shadows need work"
- Suggest concrete CSS/Tailwind changes
- Reference the Design Context for project-specific standards
- Praise what works — don't just list problems
