# Countdown Timer Bar — Urgency & Sales

A Shopify app for honest urgency: server-side countdown timers that never reset
on refresh, with built-in analytics (impressions, clicks, CTR) so merchants see
exactly what their timers do.

**Surfaces:** announcement bar (app embed) · product page timer (app block) · cart reservation timer (app block)

## Why this app

- **Honest timers.** Sale deadlines are stored server-side in UTC. Every visitor
  sees the same countdown; refreshing never resets it. When the sale ends, it ends.
- **Built-in analytics.** Impression, click, and close events flow from the
  storefront widget to the app database — no competitor at this price offers this.
- **Zero theme pollution.** OS 2.0 theme app extension only (app embed + blocks).
  No ScriptTags, no code injected into theme files, assets under 3 KB gzipped.

## Tech stack

| Layer          | Technology                                                                              |
| -------------- | --------------------------------------------------------------------------------------- |
| Framework      | [Remix](https://remix.run) (Vite) + [Polaris](https://polaris.shopify.com) + App Bridge |
| Database       | PostgreSQL via [Prisma](https://prisma.io)                                              |
| Cache / limits | Redis (ioredis) — rate limiting on public endpoints                                     |
| Storefront     | Theme app extension (`extensions/countdown-bar/`), vanilla JS                           |
| Observability  | Pino structured logging, Sentry error tracking                                          |
| Hosting        | Vercel (app) + Shopify CDN (extension assets)                                           |

## Repository layout

```
app/                      Remix app (admin UI, API routes, webhooks)
  routes/app.*            Embedded admin pages (Polaris)
  routes/apps.countdown.* Public storefront API (app proxy: settings, tracking)
  routes/webhooks.*       Shopify webhooks incl. mandatory GDPR topics
  utils/                  Campaign logic, validation, billing gates, matching
src/extensions/           Widget JS SOURCE — edit these, not the built assets
extensions/countdown-bar/ Theme app extension (Liquid blocks + BUILT assets)
scripts/build-extensions.mjs  esbuild pipeline: src/ → extensions/.../assets/
prisma/                   Schema, migrations, seed data
tests/unit/               Vitest unit tests
tests/e2e/                Playwright E2E + accessibility tests
docs/                     Architecture, QA guide, pricing, compliance, listing
```

> **Widget JS is built.** `extensions/countdown-bar/assets/*.js` are minified
> artifacts. Edit `src/extensions/countdown-bar/*.js` and run
> `npm run build:extensions` (wired into `build`, `dev`, and `predeploy`).

## Development

```shell
make setup          # first-time: env → build → start → migrate → seed
make dev-shopify    # daily: DB+Redis via Docker, then `shopify app dev`
```

Or manually:

```shell
npm install
npm run dev:services   # Postgres + Redis via docker compose
npm run dev            # builds extensions, then shopify app dev
```

## Quality gates

```shell
npm run lint           # ESLint (security + sonarjs plugins) — zero warnings
npm run typecheck      # tsc --noEmit
npm test               # Vitest unit suite
npm run test:e2e       # Playwright (needs the app running on :3000)
npm run test:coverage  # coverage report (80% minimum)
npm run build          # extensions + prisma generate + remix build
```

CI runs lint → typecheck → tests → e2e → build on every PR. `main` is protected;
merging to `main` deploys to production.

## Pricing

Free ($0: 1 active campaign, all surfaces, impressions analytics) and
Pro ($6.99/mo: unlimited campaigns, full analytics, 14-day trial) via the
Shopify Billing API. See [docs/PRICING.md](docs/PRICING.md) for strategy and
[app/utils/billing.server.js](app/utils/billing.server.js) for the enforced gates.

## Docs

Full index: **[docs/README.md](docs/README.md)**. Highlights:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design & data flow
- [docs/DEVELOPER.md](docs/DEVELOPER.md) — local setup, structure, scripts
- [docs/PRICING.md](docs/PRICING.md) — pricing strategy (source of truth)
- [docs/QA-TESTING-GUIDE.md](docs/QA-TESTING-GUIDE.md) — full manual QA runbook
- [docs/SECURITY.md](docs/SECURITY.md) / [docs/COMPLIANCE.md](docs/COMPLIANCE.md) — security & GDPR posture
- [docs/RELEASE.md](docs/RELEASE.md) / [docs/ROLLBACK.md](docs/ROLLBACK.md) — ship & unship
- [docs/screenshots/README.md](docs/screenshots/README.md) — App Store gallery
