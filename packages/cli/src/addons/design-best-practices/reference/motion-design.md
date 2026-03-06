# Motion Design Reference

Guide to animation, transitions, and motion in frontend interfaces.

---

## Duration Rules

### The 100 / 300 / 500 Rule

| Duration | Use Case | Example |
|----------|----------|---------|
| 100-150ms | Micro-interactions | Button press, toggle, hover state |
| 200-300ms | Standard transitions | Panel open, tab switch, fade in |
| 400-500ms | Complex animations | Page transition, modal entrance, list reorder |

**Rules:**
- Never exceed 500ms for UI transitions (feels sluggish)
- Entrances can be slightly slower than exits (300ms in, 200ms out)
- Content-shifting animations need to be fast (≤200ms) to avoid feeling broken

---

## Easing Curves

### Standard Curves

```css
/* Entering the screen — starts fast, decelerates */
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1.0);

/* Leaving the screen — starts slow, accelerates */
--ease-in: cubic-bezier(0.4, 0.0, 1.0, 1.0);

/* Moving on screen — accelerates then decelerates */
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1.0);

/* Playful spring effect */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1.0);
```

### When to Use Each

| Curve | Use When |
|-------|----------|
| ease-out | Elements appearing, expanding, entering view |
| ease-in | Elements disappearing, collapsing, leaving view |
| ease-in-out | Elements moving position on screen |
| spring | Toggles, switches, playful micro-interactions |
| linear | Progress bars, continuous animations, opacity fades |

---

## Reduced Motion

**Always respect `prefers-reduced-motion`:**

```css
/* Default: full animation */
.element {
  transition: transform 300ms var(--ease-out), opacity 300ms var(--ease-out);
}

/* Reduced motion: instant or minimal */
@media (prefers-reduced-motion: reduce) {
  .element {
    transition: opacity 100ms linear;
    /* Remove transform animations, keep opacity */
  }

  /* Disable all non-essential animations */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**What to keep in reduced motion:**
- Opacity transitions (shorter duration)
- Color changes
- Essential state indicators

**What to remove:**
- Transform animations (slide, scale, rotate)
- Parallax effects
- Auto-playing animations
- Decorative motion

---

## Perceived Performance

Use motion to make loading feel faster:

### Skeleton Screens

```css
.skeleton {
  background: linear-gradient(
    90deg,
    oklch(0.92 0 0) 0%,
    oklch(0.96 0 0) 50%,
    oklch(0.92 0 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Progressive Loading

1. Show skeleton layout immediately
2. Fade in critical content first (text, primary actions)
3. Load images/media progressively
4. Animate list items in with staggered delay (50ms between items, max 5 items)

---

## Animation Patterns

### Enter / Exit

```css
/* Fade up enter */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scale enter (modals, popovers) */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

### Stagger

```css
.list-item {
  animation: fadeUp 300ms var(--ease-out) both;
}

.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
/* Cap at 5 items — don't stagger infinitely */
```

---

## Performance Guidelines

- Animate only `transform` and `opacity` (GPU-accelerated, no layout recalc)
- Avoid animating `width`, `height`, `top`, `left`, `margin`, `padding`
- Use `will-change` sparingly and only on elements about to animate
- Test on low-end devices — smooth on MacBook Pro ≠ smooth everywhere
- Prefer CSS transitions/animations over JavaScript when possible
