# Pricing Strategy

> Last updated: 2026-08-21. This document reflects the pricing that is actually
> implemented in code (`app/shopify.server.js`, `app/utils/billing.server.js`,
> `app/routes/app.billing.jsx`). Keep all three in sync with this file.

## Launch Tiers (implemented)

| Plan     | Price    | Features                                                                                                                                                | Target                        |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **Free** | $0/mo    | 1 active campaign, all 3 timer surfaces (bar, product page, cart), all templates, full styling, impressions analytics, no view limits                   | Acquisition + reviews         |
| **Pro**  | $6.99/mo | Unlimited active campaigns, full analytics (impressions, clicks, CTR), run multiple surfaces simultaneously, priority email support. 14-day free trial. | Any store running real promos |

## Rationale (validated against competitor research, 2026-08)

**Competitive landscape** (Shopify App Store, August 2026):

- Category leader Essential Countdown: free tier capped at 1,000 monthly views; paid $6.99 / $9.99 / $29.99 gated by **view caps**
- Hextom Countdown Timer Bar: free + $9.99/mo Premium, 7-day trial
- GSC / Countdown Timer Ultimate: free + ~$9.99/mo
- Amai Urgency+ bundle: $12.95–$26.95, 14-day trial
- POWR: $5.49 / $13.49 / $89.99
- Urgency Bear: 100% free (review-acquisition play)
- Growth Suite: $139/mo selling "real server-side timers" — proof of willingness-to-pay for our core differentiator

**Why $6.99 Pro (not $9.99 or $12.99)?**

- A zero-review app cannot price above the $9.99 leaders on social proof it doesn't have
- $6.99 matches Essential's entry tier while including analytics nobody at this price offers
- Single-tier simplicity: one decision for the merchant, one gate to maintain in code

**Why campaign-count gating (not view caps)?**

- View caps punish merchants exactly during BFCM traffic spikes — the moment they need timers most (Essential's structural weakness)
- "No traffic or view limits, ever" is a marketable line that reinforces the Honest Urgency brand
- The 1-active-campaign Free cap still forces upgrade for any real promo calendar (bar + product timer simultaneously = 2 campaigns = Pro)

**Why all 3 surfaces free?**

- Competitors gate cart timers behind $9.99+ plans; giving all surfaces away with 1 campaign is the strongest zero-review install pitch
- Server-side honest timers are never gated on any plan — that's the brand, not a feature

**Why 14-day trial (not 7)?**

- Amai runs 14 days; zero-review apps need the longer runway
- A trial started mid-November still converts before BFCM peak

## Post-launch: Scale tier (planned, do NOT ship until features exist)

Add a **Scale — $19.99/mo** tier once A/B testing and geo-targeting ship (target: October, pre-BFCM):

| Feature                   | Free | Pro | Scale (future) |
| ------------------------- | ---- | --- | -------------- |
| Active campaigns          | 1    | ∞   | ∞              |
| All 3 timer surfaces      | ✓    | ✓   | ✓              |
| Honest server-side timers | ✓    | ✓   | ✓              |
| Analytics: impressions    | ✓    | ✓   | ✓              |
| Analytics: clicks + CTR   | ✗    | ✓   | ✓              |
| Analytics retention       | 7d   | 90d | 365d + CSV     |
| A/B testing               | ✗    | ✗   | ✓              |
| Geo targeting             | ✗    | ✗   | ✓              |
| Support                   | —    | 24h | Same-day       |

Scale exists as an anchor: it makes Pro feel cheap and captures BFCM whales. It sits
deliberately between Essential's $9.99 and $29.99 tiers.

## Billing Model

- Monthly subscription via Shopify Billing API (`Every30Days`), `trialDays: 14`
- Test charges auto-enabled for development stores (reviewer-safe; see `isTestCharge()` in `app/routes/app.billing.jsx`)
- Annual discount: 2 months free (17% savings) — offer at month 2–3 of subscription (not implemented yet)
- No refunds for partial months (standard Shopify app billing)

## Revenue Projections (Conservative)

| Month | Installs | Free | Pro | MRR    |
| ----- | -------- | ---- | --- | ------ |
| 1     | 50       | 46   | 4   | $28    |
| 3     | 150      | 126  | 24  | $168   |
| 6     | 400      | 320  | 80  | $559   |
| 12    | 1,000    | 780  | 220 | $1,538 |

Projections assume ~20% free→paid conversion at steady state, driven by the
1-campaign cap and clicks/CTR analytics gate.
