# Color & Contrast Reference

Guide to building functional, accessible color palettes for frontend interfaces.

---

## OKLCH Color Space

OKLCH (Oklab Lightness, Chroma, Hue) provides perceptually uniform color manipulation:

```css
/* oklch(lightness chroma hue) */
--accent: oklch(0.65 0.2 250);        /* Vivid blue */
--accent-light: oklch(0.85 0.1 250);  /* Same hue, lighter */
--accent-dark: oklch(0.45 0.2 250);   /* Same hue, darker */
```

**Why OKLCH over HSL:**
- Perceptually uniform lightness (50% L in HSL varies wildly across hues)
- Easier to create harmonious palettes
- Better for dark mode transformations (adjust L only)
- Chroma channel controls saturation more predictably

---

## Palette Construction

### Step 1: Neutrals First

Build the neutral palette before any color:

```
Near-white:  oklch(0.98 0.005 [warm/cool hue])
Light gray:  oklch(0.92 0.005 [same hue])
Mid gray:    oklch(0.70 0.005 [same hue])
Dark gray:   oklch(0.40 0.01 [same hue])
Near-black:  oklch(0.15 0.01 [same hue])
```

Slightly warm (hue ~80) or cool (hue ~250) — never pure neutral gray.

### Step 2: Functional Colors

```
Error:    oklch(0.55 0.2 25)    /* Red family */
Warning:  oklch(0.70 0.15 80)   /* Amber family */
Success:  oklch(0.60 0.15 150)  /* Green family */
Info:     oklch(0.60 0.15 240)  /* Blue family */
```

### Step 3: Accent (One Strong Color)

- Pick one accent color for primary actions and emphasis
- Generate 3-5 shades (lighter for backgrounds, darker for text)
- One intense color moment is stronger than five

### The 60-30-10 Rule

- **60%** — Dominant (background, surfaces)
- **30%** — Secondary (cards, text, supporting elements)
- **10%** — Accent (CTAs, active states, highlights)

---

## WCAG Contrast Requirements

### Minimum Ratios

| Text Size | Level AA | Level AAA |
|-----------|----------|-----------|
| Body text (<18px, <14px bold) | 4.5:1 | 7:1 |
| Large text (≥18px, ≥14px bold) | 3:1 | 4.5:1 |
| UI components & graphics | 3:1 | — |

### Testing

```css
/* Check in DevTools: Elements → Computed → color */
/* Or use: contrast-ratio.com, WebAIM contrast checker */
```

**Common traps:**
- Light gray text on white (#999 on #fff = 2.8:1 — fails)
- Colored text on colored background (check every combination)
- Placeholder text (often too light)
- Disabled states (still need 3:1 for the border/icon)

---

## Dark Mode

### Strategy: Don't Invert — Remap

```css
/* Light mode */
--bg: oklch(0.98 0.005 80);
--text: oklch(0.15 0.01 80);
--surface: oklch(0.95 0.005 80);

/* Dark mode — not simple inversion */
--bg: oklch(0.15 0.01 250);       /* Slightly cool */
--text: oklch(0.92 0.005 250);    /* Not pure white */
--surface: oklch(0.20 0.01 250);  /* Subtle elevation */
```

**Rules:**
- Dark mode backgrounds should never be pure black (#000)
- Reduce chroma slightly for dark mode (vivid colors are harsher on dark)
- Use elevation (lighter surfaces) instead of shadows for depth
- Accent colors may need lightness adjustment to maintain contrast

---

## Color Accessibility

- Never use color alone to convey meaning (add icons, text, patterns)
- Provide sufficient contrast between adjacent colors
- Test with color blindness simulators (protanopia, deuteranopia, tritanopia)
- Link text must be distinguishable from surrounding text (not just color — add underline)

---

## Practical Palette Template

```css
:root {
  /* Neutrals */
  --gray-50:  oklch(0.98 0.005 80);
  --gray-100: oklch(0.95 0.005 80);
  --gray-200: oklch(0.90 0.005 80);
  --gray-400: oklch(0.70 0.005 80);
  --gray-600: oklch(0.50 0.01 80);
  --gray-800: oklch(0.25 0.01 80);
  --gray-950: oklch(0.13 0.01 80);

  /* Accent */
  --accent-100: oklch(0.92 0.05 250);
  --accent-500: oklch(0.60 0.20 250);
  --accent-900: oklch(0.30 0.10 250);

  /* Semantic */
  --color-error: oklch(0.55 0.20 25);
  --color-warning: oklch(0.70 0.15 80);
  --color-success: oklch(0.60 0.15 150);
}
```
