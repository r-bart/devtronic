# Spatial Design Reference

Guide to spacing, layout, and visual hierarchy through spatial relationships.

---

## Base Unit: 4px Grid

All spacing values should be multiples of 4px:

```
4px  → tight inline spacing, icon padding
8px  → compact element spacing
12px → related element groups
16px → standard element spacing (1rem)
24px → section padding, card padding
32px → between distinct groups
48px → section separation
64px → major section breaks
96px → hero/page-level spacing
```

**Why 4px:** Divisible into halves (2px for borders/outlines) and works at all scale factors. 8px is also common — pick one and be consistent.

---

## Spacing Hierarchy

Use spacing to communicate relationships:

| Relationship | Spacing | Example |
|-------------|---------|---------|
| Tight coupling | 4-8px | Icon + label, badge + text |
| Related items | 12-16px | Form field + label, list items |
| Group boundary | 24-32px | Card sections, form groups |
| Section break | 48-64px | Page sections, content blocks |
| Page-level | 96px+ | Hero to content, footer spacing |

**Rule:** Smaller gaps = related. Larger gaps = distinct. Don't use equal spacing everywhere.

---

## Layout Grids

### CSS Grid for Page Layout

```css
/* 12-column responsive grid */
.layout {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: 16px;
}

/* Content areas span columns */
.main { grid-column: 1 / 9; }
.sidebar { grid-column: 9 / 13; }

/* Responsive collapse */
@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .main, .sidebar { grid-column: 1 / -1; }
}
```

### Container Queries

Use container queries for component-level responsive design:

```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card { flex-direction: row; }
}

@container (max-width: 399px) {
  .card { flex-direction: column; }
}
```

---

## Visual Hierarchy Through Space

### Scale Contrast

Pair large elements with small ones for visual interest:

- Large headline + small meta text
- Big number + small label
- Full-width hero + narrow text column

### Asymmetric Layouts

Break visual monotony:

```css
/* Instead of equal columns */
.grid-interesting {
  display: grid;
  grid-template-columns: 2fr 1fr; /* or 1fr 2fr */
  gap: 32px;
}
```

### Optical Alignment

Sometimes mathematical alignment looks wrong. Adjust visually:

- Text with leading whitespace (quotes, bullets) may need negative indent
- Icons in circles need slight offset from center (visual center ≠ mathematical center)
- Padding inside rounded containers should be slightly larger than flat ones
- Top padding often needs to be slightly less than bottom padding for visual balance

---

## Max Width Constraints

Prevent layouts from becoming too wide:

```css
/* Content wrapper */
.container { max-width: 1200px; margin-inline: auto; }

/* Prose content */
.prose { max-width: 65ch; }

/* Cards */
.card { max-width: 400px; }

/* Full-bleed sections break out of container */
.full-bleed {
  width: 100vw;
  margin-inline: calc(50% - 50vw);
}
```

---

## Z-Index Scale

Define a z-index scale to avoid conflicts:

```css
:root {
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-toast: 600;
  --z-tooltip: 700;
}
```
