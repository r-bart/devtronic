---
name: design-init
description: One-time project design context setup — gathers visual direction, constraints, and writes Design Context to CLAUDE.md
user-invokable: true
---

# Design Init

Establish the design context for this project through a structured interview. Writes a **Design Context** section to CLAUDE.md so all future design work is grounded in project-specific decisions.

## When to Use

- First time working on frontend/UI for a project
- After a major design direction change
- When onboarding a new AI agent to an existing design system

**Run once per project.** The output persists in CLAUDE.md.

---

## Process

### 1. Codebase Scan

Before asking questions, scan the project for existing design signals:

- **CSS/Tailwind config** — existing color tokens, spacing scale, font stacks
- **Component library** — shadcn/ui, Radix, MUI, custom components
- **Design tokens** — CSS custom properties, Tailwind theme, Sass variables
- **Existing patterns** — card styles, button variants, layout grids

### 2. Context Interview

Ask the user about:

**Visual Direction**
- What is the product? Who are the users?
- What mood should the design convey? (e.g., professional, playful, minimal, editorial)
- Any reference sites or design systems to draw from?

**Constraints**
- Existing design system or brand guidelines?
- Accessibility requirements (WCAG AA, AAA)?
- Device targets (mobile-first, desktop-first, responsive)?
- Internationalization needs (RTL, long text, CJK)?

**Typography**
- Preferred font families (or "use system fonts")?
- Type scale approach (modular, custom, Tailwind defaults)?

**Color**
- Brand colors (hex values)?
- Light mode, dark mode, or both?
- Color palette strategy (neutral-first, vibrant, muted)?

### 3. Write Design Context

Append a `## Design Context` section to CLAUDE.md:

```markdown
## Design Context

### Visual Direction
[mood, references, personality]

### Typography
- Display: [font], [weights]
- Body: [font], [weights]
- Scale: [approach]

### Color Palette
- Background: [hex]
- Surface: [hex]
- Text primary: [hex]
- Text secondary: [hex]
- Accent: [hex]
- Error/Warning/Success: [hex values]

### Spacing
- Base unit: [4px/8px]
- Scale: [values]

### Constraints
- Accessibility: [level]
- Responsive: [approach]
- i18n: [requirements]
```

---

## Tips

- If the user says "just use defaults", write sensible defaults with system fonts, 4px grid, neutral palette
- Reference the project's existing tokens/config rather than inventing new ones
- Keep the output concise — this is a reference, not a design spec
