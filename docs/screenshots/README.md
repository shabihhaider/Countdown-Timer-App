# App Store listing screenshots

Raw captures for the listing design (see `docs/APP_LISTING.md` for the
screenshot plan and caption rules). All desktop shots are **2560×1600**
(Shopify's 1280×800 retina spec) — real widget code rendered against the real
API, not mockups.

| File                                 | Shows                                                                                       | Suggested caption (from APP_LISTING.md)                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `01-storefront-bar-black-friday.png` | Announcement bar: dark BFCM theme, live countdown, BF40 copy-code chip, CTA                 | "Grab shoppers' attention with a bold announcement bar"  |
| `02-storefront-product-timer.png`    | Product-page timer (card style) above Add to cart                                           | "Urgency right where customers decide"                   |
| `03-storefront-cart-timer.png`       | Cart reservation timer over a 2-item cart                                                   | "Recover carts with a reservation countdown"             |
| `04-storefront-mobile.png`           | Mobile product page (390×844 @3x), bar + timer stacked                                      | "Beautiful on every device and theme"                    |
| `05-black-friday-showcase.png`       | Hero collage: tilted masonry of Black Friday bar/card designs (marketing-style promo image) | Use as the first/promo image — style variety at a glance |

## Regenerating

```shell
# 1. App API running locally (any port; update data-api-url in the HTML if not 3100)
PORT=3100 npm run start
# 2. Serve the repo root so the demo page can load the built widget assets
python -m http.server 8899
# 3. Seed the demo campaigns (Black Friday bar + flash-sale product timer,
#    30 days of analytics) — see the seed block in git history, or create
#    equivalent campaigns for shop demo-store.myshopify.com
# 4. Capture
node docs/screenshots/capture.mjs
```

`bf-showcase.html` is the hero-collage source (static, hand-designed;
capture with `node docs/screenshots/capture-bf.mjs`). `demo-storefront.html` is the harness — a realistic storefront page (product +
cart views via `?view=`) that loads the real extension assets from
`extensions/countdown-bar/assets/`. Set the bar campaign's animation to
`none` before capturing so digits are never mid-flip.

## Still to capture (requires a logged-in Shopify admin session)

Admin shots for the listing — the demo shop is pre-seeded with 30 days of
rich analytics (≈90K impressions, 5.2% CTR) so these look great with zero
setup. With `FORCE_PRO_PLAN=true` in `.env` (Pro UI, no locks), capture at a
1280×800 browser viewport:

1. **Dashboard** (`/app`) — metric cards + campaign list
2. **Analytics** (`/app/analytics`) — the charts are the differentiator shot
3. **Campaign editor** (`/app/campaigns/new/bar`) — form + live preview panel
4. **Campaigns list** (`/app/campaigns`) — type badges, active/inactive mix
