---
name: design-tokens
description: Design system extraction and normalization — find patterns or apply consistent tokens across the codebase
user-invokable: true
allowed-tools: Read, Edit, Glob, Grep
argument-hint: "--mode [extract|normalize]"
args:
  - name: mode
    description: "Mode: extract (find patterns and tokens) or normalize (apply system consistently)"
    required: true
---

# Design System

Two modes for working with design tokens and patterns:

- **Extract** — Scan the codebase, find recurring values, propose a token system
- **Normalize** — Apply an existing token system consistently across all files

## Usage

```
/design-system --mode extract
/design-system --mode normalize
```

---

## Extract Mode

Scan the codebase for design patterns and propose a unified token system.

### Process

1. **Scan for values**
   - Colors: hex, rgb, hsl, oklch values in CSS/Tailwind/JS
   - Typography: font sizes, weights, line heights, font families
   - Spacing: margin, padding, gap values
   - Borders: radius values, border widths, colors
   - Shadows: box-shadow definitions
   - Breakpoints: media query values

2. **Cluster similar values**
   - Group colors within ΔE < 3 (perceptually identical)
   - Group spacing within 2px tolerance
   - Identify size scale patterns (linear, modular)

3. **Propose token system**

   ```
   ## Extracted Design Tokens

   ### Colors (N unique → M tokens)
   --color-bg: #fafafa (used 23 times as #fafafa, #f9f9f9, #fafbfc)
   --color-text: #1a1a1a (used 18 times as #1a1a1a, #171717, #1c1c1c)
   ...

   ### Typography (N declarations → M scale steps)
   --text-xs: 12px (used 8 times)
   --text-sm: 14px (used 15 times)
   ...

   ### Spacing (N values → M tokens)
   --space-1: 4px
   --space-2: 8px
   ...
   ```

4. **Flag inconsistencies**
   - Near-duplicate colors that should be unified
   - Off-grid spacing values
   - Typography values that don't fit a scale
   - Hardcoded values that should reference tokens

### Output

A report with:
- Proposed token definitions (CSS custom properties or Tailwind config)
- Migration checklist: which files need which replacements
- Inconsistency count and severity

---

## Normalize Mode

Apply an existing design system (from Design Context, Tailwind config, or CSS custom properties) consistently across the codebase.

### Process

1. **Load the canonical token system**
   - Read Design Context from CLAUDE.md
   - Read Tailwind config (`tailwind.config.*`)
   - Read CSS custom properties (`:root` declarations)

2. **Scan for deviations**
   - Find hardcoded values that should use tokens
   - Find near-matches (e.g., `#333` when `--text-primary` is `#2d2d2d`)
   - Find inconsistent patterns (some buttons use tokens, others don't)

3. **Apply corrections**
   - Replace hardcoded values with token references
   - Unify near-duplicate values to the canonical token
   - Update component styles to use the design system

4. **Generate migration report**

   ```
   ## Normalization Report

   ### Files Modified: N
   ### Replacements: M

   | File | Change | Before → After |
   |------|--------|---------------|
   | Button.tsx | color | #333 → var(--text-primary) |
   | Card.tsx | spacing | 18px → var(--space-5) |
   ```

---

## Tips

- Run extract before normalize on projects without a formal design system
- Extract can reveal design debt — use it for audits
- Normalize is non-destructive: review the migration report before applying
- For Tailwind projects, prefer theme config tokens over CSS custom properties
- Consider running design-review after normalize to verify visual consistency
