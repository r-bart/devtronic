---
name: design-refine
description: Directional design refinement — push the design bolder, quieter, more minimal, or more delightful
user-invokable: true
args:
  - name: direction
    description: "Refinement direction: bolder, quieter, minimal, delightful"
    required: true
---

# Design Refine

Apply a directional design transformation to existing UI. Each direction has a distinct set of moves that shift the design's personality without breaking functionality.

## Usage

```
/design-refine --direction bolder
/design-refine --direction quieter
/design-refine --direction minimal
/design-refine --direction delightful
```

---

## Mandatory Pre-Check

Before refining:
1. Read the Design Context from CLAUDE.md
2. Identify the target files/components
3. Run a quick design-review to understand current state
4. Confirm direction with the user if ambiguous

---

## Directions

### Bolder

Push the design toward more visual impact and confidence.

**Moves:**
- Increase type scale contrast (larger headlines, smaller labels)
- Strengthen the accent color or introduce a second accent
- Add asymmetric layout elements — break the grid intentionally
- Increase whitespace around hero elements
- Use heavier font weights for display text
- Add a single dramatic visual moment (oversized number, full-bleed image, bold divider)

**Anti-patterns to avoid:**
- Don't make everything bold — select 1-2 elements to amplify
- Don't add gradients/shadows for "boldness" — use scale and weight
- Don't sacrifice readability for impact

### Quieter

Pull the design toward restraint, sophistication, and calm.

**Moves:**
- Reduce color saturation across the palette
- Increase whitespace between sections
- Soften type hierarchy — less extreme size jumps
- Use lighter font weights for headings
- Remove decorative elements that don't serve function
- Mute borders and dividers (lighter colors, thinner strokes)

**Anti-patterns to avoid:**
- Don't make text too light to read — quiet ≠ invisible
- Don't flatten all hierarchy — some contrast is still needed
- Don't remove interactive affordances

### Minimal

Strip the design to its essential elements.

**Moves:**
- Remove cards/containers — let content sit on the surface
- Reduce to 2-3 colors maximum (background, text, one accent)
- Use a single font family with weight/size for hierarchy
- Replace icons with text labels where possible
- Remove borders — use spacing to define groups
- Eliminate decorative elements entirely

**Anti-patterns to avoid:**
- Don't remove navigation or wayfinding cues
- Don't make the UI ambiguous — clarity over minimalism
- Don't sacrifice accessibility for aesthetics

### Delightful

Add warmth, personality, and small moments of joy.

**Moves:**
- Add subtle micro-interactions (button press, toggle switch, state transitions)
- Use a warmer color temperature in neutrals
- Add personality to empty states (friendly copy, simple illustration)
- Introduce slight border-radius variety (not everything the same)
- Add a subtle texture or pattern to one surface
- Use playful but readable microcopy

**Anti-patterns to avoid:**
- Don't add animation to everything — pick 2-3 moments
- Don't use clip-art style illustrations — keep quality high
- Don't sacrifice performance for delight (heavy animations)
- Don't make the UI feel childish when the product is serious

---

## Process

1. **Confirm direction** with the user
2. **Identify 3-5 specific moves** from the direction's list that apply to this UI
3. **Apply changes** incrementally — one move at a time
4. **Review after each move** — does it push the right direction without breaking anything?
5. **Summarize** what was changed and why

---

## Tips

- Refinement is about shifting a slider, not flipping a switch
- Each direction should be noticeable but not jarring
- The best refinement feels like the design "was always supposed to be this way"
- Combine directions carefully: bolder + minimal can work; bolder + delightful often clashes
