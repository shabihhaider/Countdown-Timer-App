# Analytics — Schema & Tracking Plan

## What We Track

All tracking is **server-side and privacy-safe** — no third-party scripts, no cookies, no PII.

| Event        | When                                | How                                      |
| ------------ | ----------------------------------- | ---------------------------------------- |
| `impression` | Countdown bar is shown on page load | `navigator.sendBeacon` from extension JS |
| `click`      | Merchant's CTA button is clicked    | `navigator.sendBeacon` from extension JS |
| `close`      | User dismisses bar                  | `navigator.sendBeacon` from extension JS |

Events go to `POST /apps/countdown/track` (App Proxy endpoint).

## Storage Schema

```
CampaignAnalytics {
  id          Int      -- auto-increment
  campaignId  Int      -- FK to Campaign
  date        Date     -- UTC date bucket (YYYY-MM-DD)
  impressions Int      -- total for this day
  clicks      Int      -- total for this day
  closes      Int      -- total for this day
  createdAt   DateTime
  updatedAt   DateTime
  UNIQUE (campaignId, date)
}
```

Data is aggregated daily using `upsert` with increments, so there's always exactly one row per (campaign, date) pair.

## Metrics Dashboard

| Metric      | Formula                       | Display                          |
| ----------- | ----------------------------- | -------------------------------- |
| Impressions | SUM(impressions) last 30 days | Integer with comma separator     |
| Clicks      | SUM(clicks) last 30 days      | Integer with comma separator     |
| CTR         | clicks / impressions × 100    | "12.4%" or "—" if no impressions |

## Future Metrics (v1.2+)

- Revenue attribution: correlate campaign active periods with Shopify Orders API
- Conversion rate: clicks that resulted in a purchase (requires Order webhook)
- A/B testing metrics: variant impressions/clicks side-by-side

## GDPR / Privacy

- No cookies used for tracking
- No visitor IP addresses stored
- No session identifiers stored
- Only shop-level aggregate counts stored (no individual visitor data)
- Fully compliant with GDPR, CCPA, and Shopify's data processing requirements

## Data Retention

Analytics data is retained for the lifetime of the app installation. On app uninstall, all Campaign and CampaignAnalytics records are deleted via cascading delete triggered by the `app/uninstalled` webhook.
