---
name: design-harden
description: Production hardening — text overflow, i18n, error states, accessibility, responsive, edge cases with severity report
user-invokable: true
allowed-tools: Read, Glob, Grep
---

# Design Harden

Systematically test UI components against real-world edge cases. Produces a severity-ranked report of issues found and fixes applied.

## When to Use

- Before shipping any user-facing UI
- After implementing a new feature or page
- During pre-release QA
- When inheriting UI code from another team

---

## Process

### 1. Text Overflow & Content Limits

Test every text element with:

- **Long content**: 200+ character strings, no spaces (e.g., long URLs, German compound words)
- **Short content**: Single character, empty string
- **Special characters**: Quotes, ampersands, angle brackets, emoji, RTL characters
- **Numbers**: Large numbers (1,000,000+), negative numbers, decimals

**Check for:**
- Text clipping without ellipsis
- Layout breaking from long strings
- Container overflow
- Missing `text-overflow`, `overflow`, `word-break` properties

### 2. Internationalization (i18n)

- **Text expansion**: German/Finnish text is 30-40% longer than English
- **RTL layout**: Does the layout mirror correctly?
- **CJK text**: Chinese/Japanese/Korean characters may affect line height
- **Date/number formats**: Localized formatting
- **Pluralization**: "1 item" vs "2 items" vs "0 items"

### 3. Error States

Every interactive element needs:

- **Validation errors**: Inline, accessible, not just color-coded
- **Network failures**: What happens when the API is unreachable?
- **Empty states**: No data, no results, first-time user
- **Partial failures**: Some items load, others fail
- **Timeout states**: Slow network, pending responses

### 4. Accessibility Audit

- **Keyboard navigation**: Tab order logical? All interactive elements reachable?
- **Focus management**: Focus trap in modals? Focus restored on close?
- **Screen reader**: Landmarks, headings hierarchy, ARIA labels, live regions
- **Color contrast**: WCAG AA (4.5:1 body, 3:1 large text, 3:1 UI components)
- **Motion**: `prefers-reduced-motion` respected?
- **Touch targets**: 44x44px minimum on mobile

### 5. Responsive Testing

Test at these critical widths:
- 320px (small mobile)
- 375px (standard mobile)
- 768px (tablet)
- 1024px (small desktop)
- 1440px (standard desktop)
- 1920px+ (large desktop)

**Check for:**
- Horizontal scroll at any viewport
- Touch targets too small on mobile
- Text unreadable at small sizes
- Images not scaling
- Navigation usability on all sizes

### 6. Edge Cases

- **Loading states**: Skeleton screens, spinners, progressive loading
- **Stale data**: What shows when cached data is outdated?
- **Concurrent actions**: Double-click submit, rapid toggle
- **Browser back/forward**: State preserved?
- **Deep linking**: Direct URL access to specific states

---

## Output Format

```markdown
## Hardening Report: [Component/Page]

### Summary
- Critical: N issues
- Major: N issues
- Minor: N issues

### Critical (must fix before ship)

| # | Category | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 1 | Overflow | Long text breaks card layout | `Card.tsx:34` | Add `overflow-hidden truncate` |
| 2 | A11y | No focus indicator on buttons | `Button.tsx:12` | Add `focus-visible:ring-2` |

### Major (fix soon)

| # | Category | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 3 | Responsive | Nav overlaps content at 320px | `Nav.tsx:22` | Use hamburger below 640px |

### Minor (nice to have)

| # | Category | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 4 | i18n | Hardcoded "items" string | `List.tsx:45` | Use i18n key |
```

---

## Reference Docs

Detailed guidance for each area is available in the `reference/` directory:

- `reference/typography.md` — Type scales, fluid sizing, vertical rhythm
- `reference/color-and-contrast.md` — OKLCH, WCAG, functional palettes
- `reference/spatial-design.md` — Grid, spacing rhythm, optical alignment
- `reference/motion-design.md` — Duration, easing, reduced motion
- `reference/interaction-design.md` — States, focus, forms, keyboard nav
- `reference/responsive-design.md` — Breakpoints, container queries, safe areas
- `reference/ux-writing.md` — Error messages, CTAs, empty states

---

## Tips

- Start with critical categories (overflow, a11y) before minor ones
- Test with real content, not "Lorem ipsum"
- Use browser DevTools to simulate slow network, different viewports
- Run this skill on individual components, not entire pages at once
