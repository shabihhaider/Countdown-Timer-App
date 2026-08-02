# Testing Strategy

## Coverage Target: 80% minimum

## Test Types

### Unit Tests (Vitest)

Test pure logic isolated from Shopify and database:

```
app/utils/
  colorUtils.test.ts    — hexToHsb, hsbToHex conversion
  validation.test.ts    — validateCampaignForm, isValidShop
  countdown.test.ts     — time remaining calculation, edge cases
```

Priority test cases:

- `hexToHsb` / `hsbToHex` roundtrip accuracy
- Validation: past end date → error; future date → pass
- Validation: invalid URL formats → error; relative paths → pass
- Countdown: seconds < 0 returns 0 not negative numbers
- Countdown: DST transition does not cause drift

### Integration Tests (Vitest + MSW)

Test API endpoints with mocked database responses:

- `GET /apps/countdown/settings` → returns campaign settings
- `GET /apps/countdown/settings` without shop param → 400
- `GET /apps/countdown/settings` with invalid shop → 400
- `GET /apps/countdown/settings` when rate limited → 429
- `POST /apps/countdown/track` with valid event → 200 + upsert analytics
- `POST /apps/countdown/track` with invalid event → 400
- Settings form `action` with past end date → 422 with errors
- Settings form `action` with valid data → 200 + saved to DB

### E2E Tests (Playwright)

Critical user flows tested in a Shopify development store:

```
tests/
  onboarding.spec.ts     — full 3-step wizard flow
  settings.spec.ts       — save/load settings, validation errors
  countdown-bar.spec.ts  — bar renders on storefront, counts down, end actions
  analytics.spec.ts      — impression/click tracking visible in dashboard
  mobile.spec.ts         — bar renders correctly on mobile viewports
  a11y.spec.ts           — axe-core accessibility scan (zero violations)
```

Key Playwright flows:

1. Install app → onboarding wizard → configure → install in theme → verify bar live
2. Save settings → open storefront → verify bar message/color/position matches
3. Set end date 10 seconds ago → open storefront → verify end action fires
4. Click CTA button → check analytics dashboard shows 1 click
5. Close bar → refresh → verify bar stays closed in same session

### Accessibility Tests

Run `axe-playwright` in E2E suite:

- Admin app: zero accessibility violations
- Countdown bar: `aria-live`, button labels, keyboard navigation, color contrast

### Theme Compatibility

Manual test matrix (run before each release):

| Theme   | Version | Status |
| ------- | ------- | ------ |
| Dawn    | Latest  | ⬜     |
| Debut   | Latest  | ⬜     |
| Refresh | Latest  | ⬜     |
| Sense   | Latest  | ⬜     |
| Craft   | Latest  | ⬜     |

### Browser/Device Matrix

| Device      | Browser        | Status |
| ----------- | -------------- | ------ |
| Desktop     | Chrome latest  | ⬜     |
| Desktop     | Firefox latest | ⬜     |
| Desktop     | Safari 17      | ⬜     |
| Desktop     | Edge latest    | ⬜     |
| iPhone 15   | Safari         | ⬜     |
| Samsung S23 | Chrome         | ⬜     |
| iPad        | Safari         | ⬜     |

## Running Tests

```bash
# Unit + Integration
npm run test

# E2E (requires Shopify dev store)
npm run test:e2e

# Coverage report
npm run test:coverage
```
