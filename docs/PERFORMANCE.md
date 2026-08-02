# Performance

## Targets

| Metric                      | Target     | Reason                          |
| --------------------------- | ---------- | ------------------------------- |
| Countdown bar JS (gzipped)  | < 5kb      | Storefront weight budget        |
| Countdown bar CSS (gzipped) | < 3kb      | Storefront weight budget        |
| Settings API TTFB           | < 100ms    | Perceived storefront load       |
| Lighthouse delta (CWV)      | < 5 points | Built for Shopify requires < 10 |
| Admin bundle (gzipped)      | < 300kb    | Embedded app responsiveness     |
| DB query time (settings)    | < 20ms     | With indexes, should be fast    |

## Storefront Performance

### countdown-bar.js

- **requestAnimationFrame** instead of `setInterval` — uses browser's native animation
  loop, respects browser throttling, reduces CPU usage when tab is hidden
- **DOM updates only on second change** — avoids 60fps DOM mutations; only touches DOM ~1×/sec
- **Single fetch per page load** — no polling, no websockets
- **Fire-and-forget tracking** — analytics events use `sendBeacon` so they never block page unload

### countdown-bar.css

- **No runtime style injection** — all styles are loaded as a static asset
- **`prefers-reduced-motion`** — animation disabled for users who need it
- **No external fonts** — uses system font stack

### Settings API Caching

- `Cache-Control: public, max-age=60, stale-while-revalidate=30`
- Stale-while-revalidate means Vercel Edge can serve stale content instantly while
  revalidating in background
- Campaign queries use indexed lookups: `shop + isActive` composite index

### Database

- `Campaign` table: indexed on `(shop)` and `(shop, isActive)` — fast active campaign lookup
- `CampaignAnalytics`: unique index on `(campaignId, date)` — upsert is O(log n)
- Connection pooling: configure `pgBouncer=true` in `DATABASE_URL` for production Vercel

## Measuring Lighthouse Delta

Before submitting to App Store:

1. Install app on a test store with Dawn theme
2. Run Lighthouse on homepage **without** extension active → record baseline
3. Activate countdown bar extension
4. Run Lighthouse again → record score
5. Delta must be ≤ 10 points (target ≤ 5)

```bash
# Using Lighthouse CLI
lighthouse https://your-test-store.myshopify.com --output=json --output-path=./lh-before.json
# activate extension
lighthouse https://your-test-store.myshopify.com --output=json --output-path=./lh-after.json
# compare performance scores manually
```

## Admin App Performance

- Remix code splitting: each route is a separate JS chunk
- Polaris CSS loaded once via `links()` export
- No client-side data fetching beyond Remix loaders (no SWR/React Query needed)
- `SkeletonPage` for loading states prevents layout shift
