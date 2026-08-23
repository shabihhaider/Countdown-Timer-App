# Product Requirements Document — Countdown Timer Bar v1.0

## Problem Statement

Shopify merchants running time-limited sales (BFCM, seasonal events, flash sales) need a reliable way to communicate urgency to shoppers. Existing apps either:

- Use client-side-only timers that reset on page refresh (destroying trust)
- Lack analytics so merchants can't prove ROI
- Have poor onboarding, leaving merchants unsure if the timer is even working

## Target Users

| Segment            | Revenue       | Pain                          | Willingness to Pay |
| ------------------ | ------------- | ----------------------------- | ------------------ |
| Small stores       | <$10K/mo      | Want simple, free or cheap    | $0–$7              |
| Growing stores     | $10K–$100K/mo | Want reliability + analytics  | $10–$20            |
| Established stores | $100K+/mo     | Want power features + support | $20–$40            |

## Value Proposition

> "A countdown timer app that shows you whether it's actually increasing conversions."

Three pillars:

1. **Honest timers** — end dates are stored in UTC and served server-side, so every visitor sees the same deadline
2. **Provable ROI** — built-in analytics track impressions, clicks, and CTR without any external tools
3. **Setup in 2 minutes** — guided onboarding ensures the timer is live before merchants leave the app

## v1.0 Scope

### In Scope

- [ ] Countdown bar (announcement bar with timer, message, CTA button)
- [ ] Product-page timer (app block)
- [ ] Cart reservation timer (app block)
- [ ] Admin settings form with live preview
- [ ] 3-step onboarding wizard with extension installation verification
- [ ] Analytics dashboard (impressions, clicks, CTR per campaign)
- [ ] Multiple campaigns (Free = 1 active campaign, Pro = unlimited — see [PRICING.md](./PRICING.md) for the source of truth)
- [ ] UTC-aware end dates with timezone selector
- [ ] Server-side settings served to storefront via App Proxy
- [ ] Theme App Block (OS 2.0 compatible)
- [ ] Privacy Policy + Terms of Service
- [ ] Webhook handlers: app/uninstalled, app/scopes_update, customers/data_request, customers/redact, shop/redact

### Out of Scope (v1.1+)

- Stock counter widget
- A/B testing
- Email timer integration
- Shopify Markets / multi-language support

## Success Metrics

| Metric                  | Target (30 days) | Target (90 days) |
| ----------------------- | ---------------- | ---------------- |
| App installs            | 50               | 200              |
| Paid conversions        | 10%              | 20%              |
| App Store rating        | ≥ 4.7★           | ≥ 4.8★           |
| Churn rate              | < 15%/mo         | < 10%/mo         |
| Built for Shopify badge | —                | Achieved         |

## Non-Functional Requirements

- Countdown bar JS: < 5kb gzipped
- Settings API TTFB: < 100ms
- Lighthouse performance delta: < 5 points
- Uptime: > 99.9%
- GDPR/CCPA compliant
