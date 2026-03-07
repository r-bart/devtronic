# Interaction Design Reference

Guide to interactive states, focus management, forms, and keyboard navigation.

---

## The 8 Interactive States

Every interactive element should define these states:

| State | Description | Visual Treatment |
|-------|-------------|-----------------|
| **Default** | Base appearance | Standard styling |
| **Hover** | Mouse over (desktop) | Subtle background change, cursor: pointer |
| **Focus** | Keyboard focused | Visible focus ring (2px+ offset) |
| **Active** | Being pressed | Slight scale-down or color shift |
| **Disabled** | Not available | Reduced opacity (0.5), cursor: not-allowed |
| **Loading** | Processing action | Spinner or skeleton, disable re-click |
| **Error** | Invalid state | Red border/text, error message |
| **Success** | Completed action | Green check, confirmation message |

### Implementation

```css
.button {
  /* Default */
  background: var(--accent-500);
  color: white;
  cursor: pointer;
  transition: background 150ms ease-out;
}

.button:hover { background: var(--accent-600); }

.button:focus-visible {
  outline: 2px solid var(--accent-500);
  outline-offset: 2px;
}

.button:active { transform: scale(0.98); }

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## Focus Management

### Focus Rings

```css
/* Global focus style */
:focus-visible {
  outline: 2px solid var(--accent-500);
  outline-offset: 2px;
}

/* Remove default outline only when using focus-visible */
:focus:not(:focus-visible) {
  outline: none;
}
```

**Rules:**
- Focus rings must be visible on all backgrounds
- Use `outline` not `box-shadow` (outlines respect `outline-offset` and don't affect layout)
- Minimum 2px width, contrasting color
- `focus-visible` only shows for keyboard navigation, not mouse clicks

### Focus Trapping (Modals)

```javascript
// When modal opens:
// 1. Move focus to first focusable element
// 2. Trap Tab/Shift+Tab within modal
// 3. Close on Escape
// 4. Return focus to trigger element on close
```

### Focus Restoration

After closing a modal, dropdown, or sidebar, return focus to the element that triggered it.

---

## Form Patterns

### Labels

- Every input needs a visible `<label>` (not just placeholder)
- Labels above inputs (not beside — better for mobile and scanning)
- Required fields: use `*` after label text + `aria-required="true"`

### Validation

```css
/* Show errors on blur, not on type */
.input:not(:focus):invalid {
  border-color: var(--color-error);
}

.error-message {
  color: var(--color-error);
  font-size: 0.875rem;
  margin-top: 4px;
}
```

**Rules:**
- Validate on blur (not on every keystroke)
- Show error messages below the field, not in alerts/toasts
- Don't clear the input on error — let users correct
- Use `aria-describedby` to associate error messages with inputs
- Provide positive feedback for complex fields (password strength)

### Input Sizing

- Text inputs: minimum width to fit expected content
- Select/dropdown: wide enough for longest option
- Textarea: show at least 3 lines by default
- Touch targets: 44x44px minimum (48px recommended)

---

## Keyboard Navigation

### Essential Patterns

| Key | Action |
|-----|--------|
| Tab | Move to next focusable element |
| Shift + Tab | Move to previous focusable element |
| Enter / Space | Activate focused element |
| Escape | Close overlay, cancel action |
| Arrow keys | Navigate within components (tabs, menus, radio groups) |

### Tab Order

- Follow visual reading order (top-left to bottom-right for LTR)
- Don't use `tabindex > 0` — rearranging tab order confuses users
- Use `tabindex="-1"` for programmatically focusable elements
- Use `tabindex="0"` to make non-interactive elements focusable (sparingly)

### Skip Links

```html
<a href="#main-content" class="skip-link">Skip to main content</a>

<style>
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 999;
}
</style>
```

---

## Loading States

### Button Loading

```html
<button disabled aria-busy="true">
  <span class="spinner" aria-hidden="true"></span>
  Saving...
</button>
```

- Disable the button to prevent double-clicks
- Show a spinner inside the button (not replacing it)
- Update button text to reflect action ("Save" → "Saving...")
- Use `aria-busy="true"` for screen readers

### Page/Section Loading

1. **Skeleton screen** — preferred for known content layouts
2. **Spinner** — for unknown content or short waits (<2s)
3. **Progress bar** — for file uploads, multi-step processes
4. **Optimistic UI** — show expected result immediately, rollback on failure

---

## Click/Touch Targets

- Minimum 44x44px (WCAG 2.5.8)
- Recommended 48x48px for primary actions
- Minimum 8px gap between adjacent targets
- Extend hit area with padding, not just visual size:

```css
.icon-button {
  /* Visual size: 24px icon */
  /* Hit area: 44px with padding */
  padding: 10px;
  margin: -10px; /* Prevent layout shift */
}
```
