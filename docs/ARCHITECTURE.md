# Architecture — Countdown Timer Bar

## Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Framework  | Remix v2 (full-stack, SSR)                    |
| Runtime    | Node.js 20+                                   |
| UI         | Shopify Polaris v12 + App Bridge React v4     |
| Database   | PostgreSQL + Prisma v6                        |
| Deployment | Vercel (serverless)                           |
| Extension  | Shopify Theme App Block (Liquid + Vanilla JS) |

## System Diagram

```
┌────────────────────────────────────────────────────────┐
│                   Shopify Admin                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Embedded App (Remix + Polaris)                 │  │
│  │   /app → Settings, Analytics, Campaigns          │  │
│  └────────────┬─────────────────────────────────────┘  │
└───────────────│────────────────────────────────────────┘
                │ Shopify OAuth / session
                ▼
┌────────────────────────────────────────────────────────┐
│               Vercel (App Server)                       │
│   ┌──────────────────────────────────────────────┐     │
│   │   Remix Routes                               │     │
│   │   /app/*         → admin UI (authenticated)  │     │
│   │   /apps/countdown/settings → storefront API  │     │
│   │   /apps/countdown/track   → analytics API   │     │
│   │   /webhooks/*   → lifecycle events           │     │
│   └────────────────────┬─────────────────────────┘     │
└────────────────────────│───────────────────────────────┘
                         │ Prisma
                         ▼
┌────────────────────────────────────────────────────────┐
│               PostgreSQL Database                       │
│   Session · Setting (legacy) · Campaign                │
│   CampaignAnalytics · OnboardingState                  │
└────────────────────────────────────────────────────────┘

Merchant Storefront:
┌─────────────────────────────────────────────────────────┐
│   Theme (Dawn, Debut, etc.)                             │
│   ┌─────────────────────────────────────────────────┐  │
│   │   countdown-bar.liquid (App Block)              │  │
│   │   ↓ loads countdown-bar.js + countdown-bar.css  │  │
│   │   ↓ fetches /apps/countdown/settings?shop=...   │  │
│   │   ↓ starts UTC countdown (requestAnimationFrame) │  │
│   │   ↓ POSTs /apps/countdown/track on events       │  │
│   └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Settings Save

1. Merchant fills form → `POST /app` (Remix action)
2. Action validates + upserts `Campaign` in PostgreSQL
3. `apps.countdown.settings` edge cache invalidated (60s TTL)

### Storefront Render

1. Browser requests store page
2. `countdown-bar.liquid` block renders static HTML (bar hidden)
3. `countdown-bar.js` fetches `/apps/countdown/settings?shop=...`
4. Shopify App Proxy forwards to Vercel → reads `Campaign` from DB
5. JS applies settings, shows bar, starts rAF countdown from UTC `endDate`
6. On impression/click/close: fires `POST /apps/countdown/track`

## Database Models

### Campaign

Primary model. One per sale event per shop. Stores all display + scheduling config.

### CampaignAnalytics

Daily bucketed metrics per campaign. Upserted on each tracking event.
Composite unique index: `(campaignId, date)`.

### OnboardingState

One record per shop. Tracks 3-step wizard completion.

### Session

Managed by `@shopify/shopify-app-session-storage-prisma`. Standard OAuth session table.

### Setting (legacy)

Original JSON blob per shop. Read-fallback during migration to Campaign model.
Will be removed after all shops migrated.

## API Reference

### GET /apps/countdown/settings?shop=:shop

Public (App Proxy). Returns active campaign settings for storefront.

**Response:**

```json
{
  "success": true,
  "settings": {
    "barMessage": "Flash Sale Ends In...",
    "buttonText": "Shop Now",
    "buttonUrl": "/collections/all",
    "endDate": "2024-11-29T23:59:00.000Z",
    "barColor": "#288d40",
    "barPosition": "top",
    "endAction": "hide",
    "customEndMessage": ""
  }
}
```

### POST /apps/countdown/track

Public (App Proxy). Records analytics events from storefront.

**Body:**

```json
{ "shop": "example.myshopify.com", "event": "impression" | "click" | "close" }
```

## Environment Variables

| Variable             | Required | Description                                   |
| -------------------- | -------- | --------------------------------------------- |
| `SHOPIFY_API_KEY`    | ✓        | Partner Dashboard app API key                 |
| `SHOPIFY_API_SECRET` | ✓        | Partner Dashboard app secret                  |
| `SHOPIFY_APP_URL`    | ✓        | Public HTTPS URL of the app                   |
| `DATABASE_URL`       | ✓        | PostgreSQL connection string (pooled)         |
| `DIRECT_URL`         | ✓        | PostgreSQL direct connection (for migrations) |
| `NODE_ENV`           | ✓        | `production` or `development`                 |
