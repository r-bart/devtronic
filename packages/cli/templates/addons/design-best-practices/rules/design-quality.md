# Design Quality

Auto-loaded rule for frontend design quality. Active during frontend file editing.

---

## AI Slop Detection

Watch for these common AI-generated design anti-patterns:

### DON'T

- Generic blue/purple gradients with no design rationale
- Excessive border-radius on everything (the "pill everything" syndrome)
- Drop shadows on every element — creates visual noise, not depth
- Meaningless hover animations (scale, glow) on non-interactive elements
- Placeholder-quality copy: "Welcome to our platform", "Get started today"
- Stock illustration style with flat characters and oversized props
- Symmetric card grids with identical spacing — no visual hierarchy
- Rainbow-colored dashboards with competing accent colors
- Decorative icons that add no information
- Equal visual weight on all elements — nothing stands out
- Dark navy + bright purple/lime accent palette (the "SaaS 2020" look)
- Using `opacity` to create text hierarchy instead of proper color/weight choices

### DO

- Build a constrained color palette: neutrals first, one intentional accent
- Create clear typographic hierarchy: vary size, weight, and color deliberately
- Use whitespace as a design tool — tighter for groups, generous for hero content
- Design for real content: actual copy, realistic data, edge-case lengths
- Apply the 60-30-10 color rule: dominant, secondary, accent
- Test contrast ratios — WCAG AA minimum (4.5:1 body, 3:1 large text)
- Use consistent spacing rhythm based on a 4px or 8px grid
- Make interactive elements obviously interactive (cursor, state changes)
- Ensure focus indicators are visible for keyboard navigation
- Design error, empty, and loading states — not just happy paths
- Prefer information on surfaces over boxing everything in cards
- Vary scale and weight to create visual interest, not just grid sameness

---

## Quick Reference

For detailed guidance, see the reference docs in the `design-harden` skill:

- `reference/typography.md` — Type scales, fluid sizing, vertical rhythm
- `reference/color-and-contrast.md` — OKLCH, WCAG contrast, functional palettes
- `reference/spatial-design.md` — Grid systems, spacing rhythm, optical alignment
- `reference/motion-design.md` — Easing, duration rules, reduced motion
- `reference/interaction-design.md` — States, focus management, form patterns
- `reference/responsive-design.md` — Breakpoints, container queries, touch targets
- `reference/ux-writing.md` — Error copy, CTAs, empty states, microcopy
