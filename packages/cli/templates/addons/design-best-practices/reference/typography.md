# Typography Reference

Comprehensive guide to typographic best practices for frontend development.

---

## Type Scale

### Modular Scale

Use a consistent ratio to generate font sizes. Common ratios:

| Name | Ratio | Use Case |
|------|-------|----------|
| Minor Third | 1.2 | Compact UI, data-dense apps |
| Major Third | 1.25 | General purpose, most apps |
| Perfect Fourth | 1.333 | Editorial, marketing pages |
| Golden Ratio | 1.618 | Display-heavy, hero sections |

**Example (Major Third, base 16px):**
```
12px → 14px → 16px → 20px → 25px → 31px → 39px → 49px
```

### Fluid Type with `clamp()`

Scale font sizes smoothly between viewport breakpoints:

```css
/* clamp(min, preferred, max) */
h1 { font-size: clamp(2rem, 5vw + 1rem, 4rem); }
h2 { font-size: clamp(1.5rem, 3vw + 0.75rem, 2.5rem); }
body { font-size: clamp(1rem, 1vw + 0.75rem, 1.25rem); }
```

**Rules:**
- Minimum must be readable (≥14px for body, ≥12px for captions)
- Maximum prevents text from becoming absurdly large
- Preferred value uses `vw` + a fixed base for smooth scaling

---

## Font Selection

### System Font Stacks

```css
/* Modern system stack */
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace */
font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
```

### Web Font Performance

- Limit to 2 font families maximum (display + body)
- Load only needed weights (typically 400, 500, 700)
- Use `font-display: swap` for body, `font-display: optional` for display
- Subset fonts to Latin characters when possible
- Prefer variable fonts for multiple weights

---

## Vertical Rhythm

Maintain consistent spacing based on line height:

```css
:root {
  --line-height-base: 1.5;    /* 24px at 16px base */
  --rhythm: calc(1rem * var(--line-height-base)); /* 24px */
}

/* All vertical spacing is multiples of the rhythm unit */
h1 { margin-bottom: var(--rhythm); }
p { margin-bottom: var(--rhythm); }
section { padding-block: calc(var(--rhythm) * 2); }
```

---

## Line Length

Optimal reading line length: **45-75 characters** (65ch ideal).

```css
.prose {
  max-width: 65ch;
}
```

For narrow containers (sidebars, cards): 35-50 characters is acceptable.

---

## Letter Spacing (Tracking)

- **Large display text** (>32px): Tighten tracking (-0.02em to -0.04em)
- **Body text** (14-18px): Leave at default (0)
- **Small caps / tiny labels** (<12px): Open tracking (+0.05em to +0.1em)
- **All-uppercase text**: Always add tracking (+0.05em minimum)

```css
.display { letter-spacing: -0.02em; }
.label-caps { letter-spacing: 0.05em; text-transform: uppercase; }
```

---

## OpenType Features

Enable useful ligatures and numeric features:

```css
/* Tabular numbers for data tables */
.data { font-variant-numeric: tabular-nums; }

/* Old-style numbers for body text */
.prose { font-variant-numeric: oldstyle-nums; }

/* Common ligatures */
body { font-variant-ligatures: common-ligatures; }
```

---

## Hierarchy Checklist

A well-structured page should have:

1. **One dominant element** — largest text, most visual weight
2. **Clear heading progression** — H1 > H2 > H3 (don't skip levels)
3. **Body text contrast** — noticeably smaller/lighter than headings
4. **Caption/meta text** — smallest, lowest contrast (but still readable)
5. **Weight variation** — pair heavy display weights with light/regular body
