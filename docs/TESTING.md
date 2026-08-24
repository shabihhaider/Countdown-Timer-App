# Testing Strategy

## Coverage Target: 80% minimum

## Test Types

### Unit Tests (Vitest)

Test pure logic isolated from Shopify and database. The suite is
**231 unit tests across 9 files** (`tests/unit/**/*.test.js`), for example:

```
tests/unit/
  utils/color.test.js       — hexToHsb, hsbToHex conversion
  utils/validation.test.js  — validateCampaignForm, isValidShop
  utils/countdown.test.js   — time remaining calculation, edge cases
```

See [docs/QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md) for the full per-file breakdown.

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

**26 E2E tests across 5 files** (`tests/e2e/*.spec.js`):

```
tests/e2e/
  accessibility.spec.js  — axe-core accessibility scan (zero violations)
  health.spec.js         — health endpoint smoke checks
  public-api.spec.js     — storefront settings + track endpoints
  rate-limiting.spec.js  — rate limiter (429) behavior
  screenshots.spec.js    — UI screenshots across viewports
```

Key Playwright flows:

1. `/health` returns healthy status (smoke)
2. `GET /apps/countdown/settings` returns campaign settings; bad/missing shop → 4xx
3. `POST /apps/countdown/track` records analytics events
4. Rate limiter returns `429` once the request budget is exceeded
5. `axe-core` accessibility scan reports zero violations; UI screenshots captured

### Accessibility, Theme & Device Coverage

Automated accessibility (`axe-core`) runs in the E2E suite. For the manual
accessibility checks, theme-compatibility matrix, and browser/device matrix,
see the runbook in [docs/QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md) rather than
duplicating it here.

## Running Tests

```bash
# Unit + Integration
npm run test

# E2E (requires Shopify dev store)
npm run test:e2e

# Coverage report
npm run test:coverage
```
