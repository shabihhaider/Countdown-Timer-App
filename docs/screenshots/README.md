# App Store listing screenshots

All images are **2560×1600** (Shopify's 1280×800 retina listing spec).

## ▶ Submission set — use these (`listing-*.png`)

Six slides rendered through one shared design system (`listing/frame.css`):
consistent dark ground, brand-green accent, a recurring browser-frame motif,
identical headline band, numbered feature callouts with connector lines, and a
footer wordmark on every slide. This is the set to upload, in order.

| #   | File                              | Headline                           | Feature callouts                                             |
| --- | --------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| 1   | `listing-01-announcement-bar.png` | Real urgency, honest timers        | Server-side countdown · one-tap discount code · built-in CTA |
| 2   | `listing-02-product-timer.png`    | Urgency where they decide          | Five display styles · smart targeting                        |
| 3   | `listing-03-cart-timer.png`       | Rescue abandoned carts             | Reserved-cart countdown · rules on expiry                    |
| 4   | `listing-04-analytics.png`        | See what your timers actually earn | Impressions/clicks/CTR · 30-day trends                       |
| 5   | `listing-05-campaign-builder.png` | Launch a campaign in two minutes   | Live preview · templates & scheduling                        |
| 6   | `listing-06-every-look.png`       | One app, every look                | Three real widget renders (BFCM / brand / final-hours)       |

**What's real vs. designed:** Slides 1–3 and 6 embed genuine captures of the
live widget (real extension code against the running app). Slides 4–5 are
Polaris-faithful renders of the admin UI built from the **real seeded data**
(92,838 impressions · 4,716 clicks · 5.1% CTR — the actual analytics values).
Swap in pixel-exact admin captures from a logged-in session anytime; see below.

## Source captures (`01`–`05`, kept for reference / reuse)

`01`–`04` are the raw full-page storefront captures embedded inside slides 1–3
and the mobile shot. `05-black-friday-showcase.png` is the earlier standalone
BF collage (superseded by `listing-06` for consistency, kept as an alt promo).

## Regenerating

```shell
PORT=3100 npm run start                 # app API (any port; matches data-api-url)
python -m http.server 8899              # serve repo root
# seed demo campaigns + 30d analytics for demo-store.myshopify.com (see git history)
node docs/screenshots/capture.mjs               # raw storefront 01-04
node docs/screenshots/listing/capture-bars.mjs  # real bar variants for slide 6
node docs/screenshots/listing/capture-listing.mjs  # the six listing-*.png slides
```

- `listing/frame.css` — shared design system for all slides
- `listing/slide-*.html` — one file per slide (edit copy/callouts here)
- `demo-storefront.html` — realistic storefront harness (product/cart via `?view=`)
- Set the bar campaign's animation to `none` before capturing so digits are crisp.

## Optional: pixel-exact admin captures

To replace the slide 4–5 admin renders with real screenshots, open the app on a
dev store with `FORCE_PRO_PLAN=true` (Pro UI, no locks) and capture at a
1280×800 viewport: Dashboard (`/app`), Analytics (`/app/analytics`),
Campaign editor (`/app/campaigns/new/bar`), Campaigns list (`/app/campaigns`).
Drop them into the `.viewport` of the matching slide and re-run the capture.
