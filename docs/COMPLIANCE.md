# Compliance — GDPR, CCPA, Shopify App Store

## Data Inventory

| Data Type            | Where Stored                  | Retention       | PII? |
| -------------------- | ----------------------------- | --------------- | ---- |
| Shop domain          | PostgreSQL Session + Campaign | Until uninstall | No   |
| OAuth access token   | PostgreSQL Session            | Until uninstall | No   |
| Campaign settings    | PostgreSQL Campaign           | Until uninstall | No   |
| Analytics aggregates | PostgreSQL CampaignAnalytics  | Until uninstall | No   |
| Onboarding state     | PostgreSQL OnboardingState    | Until uninstall | No   |

**No personal data from storefront visitors is collected or stored.**

## GDPR Requirements

- [x] Privacy Policy publicly accessible at `/privacy`
- [x] Data collection described in plain language
- [x] Right to erasure: handled by `app/uninstalled` webhook (cascades all deletions)
- [x] Data portability: can be requested via support email
- [x] No third-party data processors used (analytics are self-hosted)
- [x] No cookies set on merchant storefronts

## CCPA Requirements

- [x] Privacy Policy includes CCPA disclosure
- [x] "Do not sell" requirement: we do not sell data
- [x] California residents can request deletion at `support@countdown-timer-app.com`

## Shopify App Store Requirements

### Technical

- [x] OAuth implemented with `@shopify/shopify-app-remix`
- [x] Sessions stored via Prisma session storage adapter
- [x] Webhooks: `app/uninstalled` and `app/scopes_update` handled
- [x] Polaris v12 used throughout admin UI
- [x] App Bridge v4 used
- [x] Theme App Block (OS 2.0 compatible)
- [ ] Lighthouse performance delta < 10 points (must be measured before submission)
- [x] HTTPS only (Vercel enforces)

### Scopes

Current: `write_themes`

- `write_themes`: Required to install theme app extensions

No other scopes are requested. This is the minimum necessary.

### Sensitive Data Handling

- Access tokens: stored in PostgreSQL, never logged or exposed to client
- No customer PII collected
- No third-party analytics scripts injected into storefront

## Built for Shopify Checklist

- [ ] 50+ net installs from active shops on paid plans
- [ ] 5+ reviews on Shopify App Store
- [x] Latest App Bridge version
- [x] Polaris design system
- [x] No prohibited content
- [ ] Lighthouse performance delta < 10 points (measure before applying)
- [ ] Annual revalidation (schedule reminder)

## App Store Listing Restrictions

The following are NOT allowed in the listing:

- Superlatives: "best", "only", "#1", "most popular"
- Unverified statistics
- Customer testimonials
- Misleading feature descriptions

Approved copy patterns:

- "Helps merchants create urgency with countdown timers"
- "Shows impressions and clicks in a built-in dashboard"
- "Works with Online Store 2.0 themes"
