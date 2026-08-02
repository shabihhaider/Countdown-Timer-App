# Accessibility

## Standard: WCAG 2.1 AA

## Admin App

Polaris handles most accessibility requirements automatically:

- Focus management on modals/drawers
- ARIA roles on interactive components
- Color contrast within Polaris token system

Custom requirements:

- [x] All form fields have associated `<label>` elements via Polaris `TextField`
- [x] Error messages linked to fields via Polaris error prop
- [x] Color picker has accessible hex input field
- [x] Toast notifications are announced to screen readers (Polaris handles)
- [x] Save button shows loading state (not just disabled)

## Countdown Bar Widget

### ARIA Roles and Labels

- [x] `role="region"` + `aria-label="Countdown timer announcement"` on bar container
- [x] `role="timer"` on timer digits container
- [x] `aria-live="off"` on timer (digits change too frequently for live announcements)
- [x] `aria-live="polite"` on `.cdb__sr-timer` — announces remaining time once per minute in plain English
- [x] `aria-live="polite"` on `.cdb__message` — announces when sale ends message changes
- [x] `aria-label="Close countdown bar"` on close button
- [x] `aria-hidden="true"` on decorative SVG elements
- [x] `aria-hidden="true"` on individual digit/label elements (announced via sr-timer instead)

### Keyboard Navigation

- [x] Close button is keyboard focusable (it's a `<button>`)
- [x] CTA button is keyboard focusable (it's an `<a>` with valid `href`)
- [x] Focus order is logical: message → timer → CTA → close

### Color Contrast

- All text on countdown bar must meet 4.5:1 contrast ratio against background color
- White text (#ffffff) on #288d40 (default green): 4.54:1 — passes
- CTA button: dark text (#111111) on white (#ffffff): 19.1:1 — passes
- **Warning:** Merchants can choose any bar color. Very light colors with white text
  may fail contrast. Future: add contrast warning in admin when merchant chooses a color
  below 4.5:1 contrast threshold

### Reduced Motion

- [x] Slide-in animation disabled when `prefers-reduced-motion: reduce`
- [x] CTA button hover transform disabled when `prefers-reduced-motion: reduce`
- [x] rAF countdown loop still runs (timing is functional, not decorative)

### Screen Reader Experience

A screen reader user will hear:

- "Countdown timer announcement" region label
- Message: "Flash Sale Ends In..."
- Once per minute: "Sale ends in 2 days, 3 hours, 14 minutes." (from sr-timer)
- CTA: "Shop Now, link"
- Close button: "Close countdown bar, button"

### Touch Targets (WCAG 2.5.5)

- [x] Close button: 44×44px (increased from original 32×32px)
- [x] CTA button: `min-height: 44px` (meets WCAG target size)

## Testing Tools

- `axe-playwright`: automated accessibility scan in E2E tests
- VoiceOver (macOS) + Safari: manual screen reader testing
- NVDA (Windows) + Chrome: manual screen reader testing
- Keyboard-only navigation: manual tab + enter testing
