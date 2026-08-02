# Pricing Strategy

## Tiers

| Plan       | Price     | Features                                                                     | Target                         |
| ---------- | --------- | ---------------------------------------------------------------------------- | ------------------------------ |
| **Free**   | $0/mo     | 1 active campaign, basic styling, "Powered by" branding                      | Testing, very small stores     |
| **Growth** | $12.99/mo | 5 active campaigns, analytics dashboard, page-level targeting, no branding   | Growing stores ($10K–$100K/mo) |
| **Pro**    | $24.99/mo | Unlimited campaigns, A/B testing, priority support (4h response), cart timer | Established stores ($100K+/mo) |

## Rationale

**Why $12.99 for Growth?**

- Undercuts Amai ($19.95) and matches Urgency+ ($12.95) while offering more value
- Analytics dashboard is the primary differentiator — justifies premium over Essential ($6.99)
- At $12.99/mo with 20% conversion lift on a $50K/mo store = $10,000+ ROI

**Why Free tier?**

- Free plan accelerates installs and reviews (critical for algorithm ranking)
- "Powered by" branding on free tier drives organic discovery
- Goal: 100 free installs → 20 paid conversions in first 30 days

**Why not $9.99 (matching Hextom)?**

- Hextom is the market leader with 1,278 reviews — we can't compete on social proof yet
- $12.99 positions us as a premium alternative with analytics (something Hextom lacks)
- Price sensitivity research shows merchants are willing to pay $15-20/mo if analytics is included

## Billing Model

- Monthly subscription via Shopify Billing API
- Annual discount: 2 months free (17% savings) — offered at month 3 of subscription
- No refunds for partial months (standard Shopify app billing)
- 14-day free trial for all paid plans

## Feature Gating

| Feature               | Free      | Growth    | Pro           |
| --------------------- | --------- | --------- | ------------- |
| Active campaigns      | 1         | 5         | Unlimited     |
| Analytics (30 days)   | ✗         | ✓         | ✓             |
| Analytics (90 days)   | ✗         | ✗         | ✓             |
| Page targeting        | ✗         | ✓         | ✓             |
| "Powered by" branding | ✓         | ✗         | ✗             |
| A/B testing           | ✗         | ✗         | ✓             |
| Cart timer            | ✗         | ✗         | ✓             |
| Support SLA           | Community | 24h email | 4h email/chat |
| Custom CSS            | ✗         | ✓         | ✓             |

## Revenue Projections (Conservative)

| Month | Installs | Free | Growth | Pro | MRR    |
| ----- | -------- | ---- | ------ | --- | ------ |
| 1     | 50       | 45   | 4      | 1   | $77    |
| 3     | 150      | 120  | 24     | 6   | $461   |
| 6     | 400      | 300  | 80     | 20  | $1,539 |
| 12    | 1,000    | 700  | 240    | 60  | $4,617 |
