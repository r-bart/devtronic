# Responsive Design Reference

Guide to mobile-first responsive design, breakpoints, and adaptive layouts.

---

## Mobile-First Approach

Write base styles for mobile, then add complexity for larger screens:

```css
/* Base: mobile (320px+) */
.grid { display: flex; flex-direction: column; gap: 16px; }

/* Tablet (768px+) */
@media (min-width: 768px) {
  .grid { flex-direction: row; flex-wrap: wrap; }
  .grid > * { flex: 1 1 calc(50% - 8px); }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .grid > * { flex: 1 1 calc(33.333% - 11px); }
}
```

**Why mobile-first:**
- Forces you to prioritize content
- Progressive enhancement is more robust than graceful degradation
- Mobile CSS is simpler (fewer overrides needed)

---

## Content-Driven Breakpoints

Don't use device-specific breakpoints. Break where the content breaks:

```css
/* Bad: targeting specific devices */
@media (min-width: 375px) { }  /* iPhone */
@media (min-width: 414px) { }  /* iPhone Plus */

/* Good: where content needs it */
@media (min-width: 40em) { }   /* ~640px — content gets cramped */
@media (min-width: 52em) { }   /* ~832px — space for 2 columns */
@media (min-width: 72em) { }   /* ~1152px — space for sidebar */
```

### Recommended Breakpoint Scale

| Name | Width | Use Case |
|------|-------|----------|
| sm | 640px | Phone landscape, small tablet |
| md | 768px | Tablet portrait, two-column |
| lg | 1024px | Tablet landscape, small desktop |
| xl | 1280px | Desktop |
| 2xl | 1536px | Large desktop |

---

## Container Queries

Use container queries for component-level responsive design:

```css
/* Define the container */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* Respond to container size, not viewport */
@container card (min-width: 300px) {
  .card { flex-direction: row; }
}

@container card (max-width: 299px) {
  .card { flex-direction: column; }
}
```

**When to use container queries vs media queries:**
- **Container queries**: Reusable components that may be placed in different-width containers
- **Media queries**: Page-level layout decisions (columns, navigation mode)

---

## Input Detection

Adapt UI based on input method:

```css
/* Fine pointer (mouse) — smaller targets OK */
@media (pointer: fine) {
  .button { padding: 8px 16px; }
}

/* Coarse pointer (touch) — larger targets */
@media (pointer: coarse) {
  .button { padding: 12px 24px; min-height: 48px; }
}

/* Hover capability */
@media (hover: hover) {
  .card:hover { box-shadow: var(--shadow-md); }
}

@media (hover: none) {
  /* Don't rely on hover states for mobile */
}
```

---

## Safe Areas

Handle device-specific safe areas (notch, home indicator):

```css
/* iOS safe area insets */
.app {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Fixed bottom navigation */
.bottom-nav {
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
```

---

## Responsive Images

```html
<!-- srcset for resolution switching -->
<img
  src="image-400.jpg"
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
  alt="Description"
  loading="lazy"
/>
```

```css
/* Responsive image defaults */
img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

---

## Responsive Typography

Use fluid type instead of breakpoint-based size changes:

```css
/* Better than @media jumps */
h1 { font-size: clamp(1.75rem, 4vw + 1rem, 3.5rem); }
body { font-size: clamp(1rem, 0.5vw + 0.875rem, 1.125rem); }
```

---

## Testing Checklist

- [ ] No horizontal scroll at any viewport width (320px minimum)
- [ ] Touch targets ≥ 44x44px on mobile
- [ ] Text readable without zooming on mobile
- [ ] Navigation accessible on all screen sizes
- [ ] Images scale appropriately
- [ ] Forms usable on mobile (proper input types, no tiny fields)
- [ ] Content priority matches viewport size (most important content visible first on mobile)
