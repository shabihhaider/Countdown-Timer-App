# Developer Guide

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+
- Shopify CLI 3+
- A Shopify Partner account with an app created

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/shabihhaider/Countdown-Timer-App.git
cd Countdown-Timer-App

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Fill in all required variables (see below)

# 4. Set up database
npx prisma migrate deploy
npx prisma generate

# 5. Start development server
npm run dev
# Opens Shopify CLI tunnel + Remix dev server
```

## Environment Variables

Create `.env` at project root:

```bash
# Shopify — from your Partner Dashboard app settings
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://your-ngrok-or-tunnel-url.ngrok.io

# PostgreSQL
# For local: postgresql://username:password@localhost:5432/countdown_timer
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...   # Same as DATABASE_URL for local dev

NODE_ENV=development
```

## Project Structure

```
Countdown-Timer-App/
├── app/
│   ├── routes/
│   │   ├── app.jsx                      # Main layout (App Bridge, NavMenu)
│   │   ├── app._index.jsx               # Settings page (campaign form)
│   │   ├── app.onboarding.jsx           # 3-step onboarding wizard
│   │   ├── app.analytics.jsx            # Analytics dashboard
│   │   ├── app.campaigns.jsx            # Campaigns management
│   │   ├── apps.countdown.settings.jsx  # Public API: storefront settings
│   │   ├── apps.countdown.track.jsx     # Public API: analytics tracking
│   │   ├── auth.$.jsx                   # OAuth callback
│   │   ├── auth.login/                  # Login page
│   │   ├── webhooks.app.uninstalled.jsx
│   │   ├── webhooks.app.scopes_update.jsx
│   │   ├── privacy.jsx                  # Privacy policy page
│   │   ├── terms.jsx                    # Terms of service page
│   │   └── _index/route.jsx             # Public landing page
│   ├── shopify.server.js                # Shopify app configuration
│   └── db.server.js                     # Prisma client singleton
├── extensions/
│   └── countdown-bar/                   # Theme App Extension
│       ├── blocks/countdown-bar.liquid
│       ├── assets/countdown-bar.js
│       ├── assets/countdown-bar.css
│       └── shopify.extension.toml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/                                # This directory
├── shopify.app.toml
├── vercel.json
└── package.json
```

## Available Scripts

```bash
npm run dev          # Start Shopify CLI dev server (with tunnel)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run setup        # Run Prisma migrations
npm run test         # Run Vitest tests (TODO: set up)
npm run test:e2e     # Run Playwright E2E tests (TODO: set up)
```

## Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name describe_your_change

# Apply migrations to production
npx prisma migrate deploy

# Open Prisma Studio (DB browser)
npx prisma studio
```

## Adding a New Route

1. Create `app/routes/app.your-route.jsx`
2. Add `<Link to="/app/your-route">Label</Link>` in `app/routes/app.jsx` NavMenu
3. Add loader with `authenticate.admin(request)` for all admin routes
4. Use `TitleBar` from `@shopify/app-bridge-react` for the page title

## Extension Development

The Theme App Extension is in `extensions/countdown-bar/`.

To test changes locally:

1. `npm run dev` starts the CLI which also serves extensions
2. In your Shopify development store: Online Store → Themes → Customize → Add block → Apps → Countdown & CTA Bar
3. Changes to `.liquid`, `.js`, `.css` are hot-reloaded

## Deployment

Production deploys automatically via Vercel on push to `main`.

Manual deploy:

```bash
npm run build
vercel --prod
```

After deploy, run migrations:

```bash
npx prisma migrate deploy
```
