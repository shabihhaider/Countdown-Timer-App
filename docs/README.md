# Documentation

Reference documentation for **Countdown Timer Bar**, a Shopify embedded app
(Remix + Polaris + Prisma/PostgreSQL + Redis) that ships three storefront
surfaces — an announcement bar, a product-page timer, and a cart reservation
timer — with server-side end dates and built-in analytics.

New here? Start with [`ARCHITECTURE.md`](ARCHITECTURE.md) for the system design,
then [`DEVELOPER.md`](DEVELOPER.md) to run it locally.

## Product

| Doc                              | What's inside                                                         |
| -------------------------------- | --------------------------------------------------------------------- |
| [PRD.md](PRD.md)                 | v1 product requirements — problem, scope, success metrics             |
| [PRICING.md](PRICING.md)         | Pricing strategy and tier rationale — **source of truth for pricing** |
| [APP_LISTING.md](APP_LISTING.md) | App Store listing plan (copy, pricing, screenshots)                   |
| [ANALYTICS.md](ANALYTICS.md)     | Analytics event model and dashboard metrics                           |

## Engineering

| Doc                                                          | What's inside                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)                           | System design, data flow, data models, environment         |
| [DEVELOPER.md](DEVELOPER.md)                                 | Local setup, env vars, project structure, scripts, deploy  |
| [DATABASE-OPS.md](DATABASE-OPS.md)                           | Connections, migrations, backups, seeds, useful queries    |
| [PERFORMANCE.md](PERFORMANCE.md)                             | Performance budgets and optimization notes                 |
| [MIGRATION-LEGACY-SETTINGS.md](MIGRATION-LEGACY-SETTINGS.md) | Retiring the legacy `Setting` model in favor of `Campaign` |

## Quality, security & compliance

| Doc                                        | What's inside                                          |
| ------------------------------------------ | ------------------------------------------------------ |
| [TESTING.md](TESTING.md)                   | Test strategy — unit, integration, E2E, accessibility  |
| [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md) | Full manual QA runbook across every surface            |
| [ACCESSIBILITY.md](ACCESSIBILITY.md)       | WCAG posture for the admin and storefront widgets      |
| [SECURITY.md](SECURITY.md)                 | Threat model, input validation, rate limiting, secrets |
| [COMPLIANCE.md](COMPLIANCE.md)             | GDPR/CCPA and App Store compliance posture             |

## Operations

| Doc                                | What's inside                                  |
| ---------------------------------- | ---------------------------------------------- |
| [GIT-WORKFLOW.md](GIT-WORKFLOW.md) | Branch model and commit/PR conventions         |
| [RELEASE.md](RELEASE.md)           | Versioning, release checklist, changelog       |
| [ROLLBACK.md](ROLLBACK.md)         | Rollback and point-in-time-recovery procedures |
| [ONBOARDING.md](ONBOARDING.md)     | Post-install onboarding wizard spec            |

## Assets

| Doc                                            | What's inside                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| [screenshots/README.md](screenshots/README.md) | App Store screenshot gallery (the `gallery-01…08.png` set) and how it's built |

## Archive

Historical, non-authoritative documents live in [`archive/`](archive/) — kept for
record only and superseded by the current docs above.
