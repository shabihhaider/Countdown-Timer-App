# App Store screenshots

## ▶ SUBMISSION SET — upload these, in order (`gallery-01…07.png`)

The final Shopify App Store gallery. 1600×900 (Shopify's recommended ratio),
captured @2x (3200×1800). One design system (`gallery/frame.css`): dark premium
ground, brand-green accent, a recurring browser/phone frame, one benefit per
slide, benefit-first headlines, no arrows or callouts. Real product UI only.

| #   | File             | Benefit (headline)            | Visual                                                      |
| --- | ---------------- | ----------------------------- | ----------------------------------------------------------- |
| 1   | `gallery-01.png` | Honest urgency that converts  | Announcement bar live on a store                            |
| 2   | `gallery-02.png` | Urgency where they decide     | Product-page timer above Add to Cart                        |
| 3   | `gallery-03.png` | Show timers where you want    | Targeting rule (admin) → the timer live on the product page |
| 4   | `gallery-04.png` | Proof, not guesswork          | Built-in analytics — real impressions/clicks/CTR            |
| 5   | `gallery-05.png` | Matches your brand in seconds | Three real bar renders (one widget, three looks)            |
| 6   | `gallery-06.png` | Live in two minutes           | Campaign builder with live preview                          |
| 7   | `gallery-07.png` | Flawless on mobile, too       | Responsive storefront on a phone                            |

**Accuracy:** every frame is real product UI. Slides 1–2 & 7 embed live
storefront-widget captures; slide 3 pairs a live admin capture (the targeting
rule) with the live storefront result (the timer on the product page); slides 4
& 6 use live admin captures (real seeded data — 37,271 impressions · 1,926
clicks · 5.2% CTR) with dev-mode chrome cropped out; slide 5 stacks three
genuine live bar renders. No mockups, no invented features, no arrows/callouts.

> The app also ships a **cart reservation timer**, but it is intentionally
> **not** featured as a dedicated slide: it was verified at the widget-code and
> block-install level but not observed end-to-end on a live store cart with
> items, so it was left out rather than shown on a claim not fully tested.

### Regenerating the gallery

```shell
PORT=3100 npm run start                 # app API
python -m http.server 8899              # serve repo root
node docs/screenshots/gallery/prep-admin.mjs     # clean dev chrome from admin/*
node docs/screenshots/gallery/crop-assets.mjs    # slide insets (product result, clean targeting)
node docs/screenshots/listing/capture-bars.mjs   # real bar variants (bar-*.png)
node docs/screenshots/gallery/capture.mjs        # → gallery-01…07.png
```

Edit copy/layout in `gallery/slide-*.html`; shared styling in `gallery/frame.css`.

## Source & raw assets (not for direct upload)

- `01`–`04-storefront-*.png` — raw full-page storefront widget captures
- `admin/*.jpg` — raw live admin captures (carry dev-mode chrome)
- `gallery/assets/adm-*.png` — admin captures with dev chrome cropped
- `listing/bar-{black,green,crimson}.png` — real single-bar renders
- `demo-storefront.html` — storefront capture harness (product/cart via `?view=`)
- `listing-*.png` — earlier explorations, **superseded** by the `gallery-*` set;
  kept for reference only.

## Promotional collage — "every major sale, one app"

`occasions-showcase.png` (1600×900 @2x) — a tilted masonry of the **same widget
the app actually renders**, themed for the biggest shopping moments of the year:
Black Friday, Cyber Monday, Christmas, New Year, Valentine's, Halloween, Summer,
Back to School, and a free-shipping bar. Every tile is faithful to the real
extension anatomy (icon + message · 4-unit `DD:HH:MM:SS` with labels · dashed
discount chip + Copy · CTA button · ✕ close; plus one product-page banner) — no
invented layouts or fake digit styles. Source: `bf-showcase.html`; regenerate with:

```shell
node docs/screenshots/capture-bf.mjs        # → occasions-showcase.png
```
