# App Store screenshots

## ▶ Submission set — upload these, in order (`gallery-01…08.png`)

The final Shopify App Store gallery: eight slides at 1600×900 (Shopify's
recommended ratio), captured @2x (3200×1800). One design system
(`gallery/frame.css`): dark premium ground, brand-green accent, a recurring
browser/phone frame, one benefit per slide, benefit-first headlines, no arrows
or callouts. Real product UI only.

| #   | File             | Benefit (headline)            | Visual                                                      |
| --- | ---------------- | ----------------------------- | ----------------------------------------------------------- |
| 1   | `gallery-01.png` | Honest urgency that converts  | Announcement bar live on a store                            |
| 2   | `gallery-02.png` | Urgency where they decide     | Product-page timer above Add to Cart                        |
| 3   | `gallery-03.png` | Show timers where you want    | Targeting rule (admin) → the timer live on the product page |
| 4   | `gallery-04.png` | Proof, not guesswork          | Built-in analytics — real impressions/clicks/CTR            |
| 5   | `gallery-05.png` | Matches your brand in seconds | Three real bar renders (one widget, three looks)            |
| 6   | `gallery-06.png` | Live in two minutes           | Campaign builder with live preview                          |
| 7   | `gallery-07.png` | Flawless on mobile, too       | Responsive storefront on a phone                            |
| 8   | `gallery-08.png` | Built for every big sale      | Occasion collage — 9 events, all real widget renders        |

**Accuracy.** Every frame is real product UI. Slides 1–2 & 7 embed live
storefront-widget captures; slide 3 pairs a live admin capture (the targeting
rule) with the live storefront result (the timer on the product page); slides 4
& 6 use live admin captures (real seeded data — 37,271 impressions · 1,926
clicks · 5.2% CTR) with dev-mode chrome cropped out; slide 5 stacks three
genuine bar renders; slide 8 is the occasions collage — every tile faithful to
the real widget anatomy, themed for nine major sale events. No mockups, no
invented features, no arrows or callouts.

> The app also ships a **cart reservation timer**, but it is intentionally
> **not** featured as a dedicated slide: it was verified at the widget-code and
> block-install level, but not observed end-to-end on a live store cart with
> items — so it was left out rather than shown on a claim not fully tested.

## Layout

Everything the gallery needs is self-contained under `gallery/` — the eight
`gallery-0N.png` outputs render entirely from committed assets, no running app
required.

```
docs/screenshots/
├── gallery-01…08.png          # the submission set (outputs — upload these)
├── admin/                     # raw admin captures (source for the cropped adm-*.png)
└── gallery/
    ├── frame.css              # shared design system for every slide
    ├── slide-1…8.html         # one file per slide
    ├── capture.mjs            # renders slide-*.html → ../gallery-0N.png
    ├── prep-admin.mjs         # ../admin/*.jpg → assets/adm-*.png (crops dev chrome)
    ├── crop-assets.mjs        # slide insets (product result crop, clean targeting)
    ├── occasions.html         # source for the slide-8 collage (self-contained)
    ├── capture-occasions.mjs  # occasions.html → assets/occasions-showcase.png
    └── assets/                # every image the slides embed
        ├── storefront-bar.png / storefront-product.png / storefront-mobile.png
        ├── bar-black.png / bar-green.png / bar-crimson.png
        ├── adm-*.png / product-result-crop.png / adm-targeting-clean.png
        └── occasions-showcase.png
```

## Regenerating

Slide rendering is self-contained (no app or DB needed):

```shell
python -m http.server 8899                          # serve repo root (run from repo root)
node docs/screenshots/gallery/capture-occasions.mjs # (only if slide 8 changed)
node docs/screenshots/gallery/capture.mjs           # → gallery-01…08.png
```

Regenerate derived assets only when their sources change:

```shell
node docs/screenshots/gallery/prep-admin.mjs        # after re-capturing admin/*.jpg
node docs/screenshots/gallery/crop-assets.mjs        # after changing the product/targeting sources
```

Edit copy and layout in `gallery/slide-*.html`; shared styling lives in
`gallery/frame.css`. The `assets/storefront-*.png`, `bar-*.png`, and `admin/*.jpg`
files are committed captures from the development store; re-capturing raw imagery
from a live store is outside this folder's scope.
