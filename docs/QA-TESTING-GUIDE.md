# QA Testing Guide — Countdown Timer App

> **Version:** 2.0
> **Last Updated:** August 11, 2026
> **Environment:** Docker (Node 20 + PostgreSQL 16 + Redis 7) or `shopify app dev`
> **Prerequisite:** A Shopify Partner account with a development store

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Service Health Verification](#2-service-health-verification)
3. [Landing Page Tests](#3-landing-page-tests)
4. [Privacy & Terms Pages](#4-privacy--terms-pages)
5. [Shopify OAuth & App Install](#5-shopify-oauth--app-install)
6. [Onboarding Flow Tests](#6-onboarding-flow-tests)
7. [Dashboard (Home) Page Tests](#7-dashboard-home-page-tests)
8. [Create Campaign Tests](#8-create-campaign-tests)
9. [Edit Campaign Tests](#9-edit-campaign-tests)
10. [Campaigns List Tests](#10-campaigns-list-tests)
11. [Design Features — Icons, Fonts, Animations, Gradients, Templates](#11-design-features--icons-fonts-animations-gradients-templates)
12. [Timer Type Tests — One-Time, Daily, Evergreen](#12-timer-type-tests--one-time-daily-evergreen)
13. [Live Preview Component Tests](#13-live-preview-component-tests)
14. [Theme Extension — Countdown Bar (App Embed)](#14-theme-extension--countdown-bar-app-embed)
15. [Theme Extension — Product Timer (Block)](#15-theme-extension--product-timer-block)
16. [Theme Extension — Cart Timer (Block)](#16-theme-extension--cart-timer-block)
17. [Storefront Bar — Full Behavior Tests](#17-storefront-bar--full-behavior-tests)
18. [Analytics Page Tests](#18-analytics-page-tests)
19. [Billing & Plan Page Tests](#19-billing--plan-page-tests)
20. [Help Page Tests](#20-help-page-tests)
21. [Public API Tests](#21-public-api-tests)
22. [Rate Limiting Tests](#22-rate-limiting-tests)
23. [Accessibility Tests](#23-accessibility-tests)
24. [Mobile Responsiveness Tests](#24-mobile-responsiveness-tests)
25. [Automated Test Suite](#25-automated-test-suite)
26. [Test Data Reference](#26-test-data-reference)
27. [Pre-Release Checklist](#27-pre-release-checklist)

---

## 1. Environment Setup

### 1.1 Start with Docker

```bash
make setup-env         # First time only — creates .env from template
# Edit .env: add SHOPIFY_API_KEY, SHOPIFY_API_SECRET
make dev-d             # Start all services in background
make health-check      # Verify everything is healthy
```

### 1.2 Start with Shopify CLI (Alternative)

```bash
npm install
npx prisma migrate dev
shopify app dev        # Interactive — follow prompts to select your dev store
```

The CLI creates a Cloudflare tunnel and opens the app in your store's admin.

### 1.3 Verify Services Are Running

| Service    | How to Check                        | Expected                            |
| ---------- | ----------------------------------- | ----------------------------------- |
| App        | Open `http://localhost:3000`        | Landing page loads                  |
| Health     | Open `http://localhost:3000/health` | `{"status":"ok","timestamp":"..."}` |
| PostgreSQL | `make db-shell` then `\dt`          | Lists Session, Campaign, etc.       |
| Redis      | `make redis-cli` then `PING`        | `PONG`                              |

---

## 2. Service Health Verification

### TEST 2.1: Health Endpoint Returns 200

| Step | Action                                       | Expected Result                            |
| ---- | -------------------------------------------- | ------------------------------------------ |
| 1    | Open browser: `http://localhost:3000/health` | Page loads with JSON                       |
| 2    | Check JSON content                           | `{"status":"ok","timestamp":"<ISO date>"}` |
| 3    | Check Network tab → Response Headers         | `Cache-Control: no-store`                  |
| 4    | Check HTTP status code                       | `200 OK`                                   |

### TEST 2.2: Health Endpoint Reports DB Issues

| Step | Action                                      | Expected Result                                       |
| ---- | ------------------------------------------- | ----------------------------------------------------- |
| 1    | Stop the database: `docker compose stop db` | DB container stops                                    |
| 2    | Refresh `http://localhost:3000/health`      | `{"status":"error","message":"Database unreachable"}` |
| 3    | Check HTTP status code                      | `503 Service Unavailable`                             |
| 4    | Restart database: `docker compose start db` | DB restarts                                           |
| 5    | Wait 10 seconds, refresh `/health`          | Back to `{"status":"ok"}`                             |

---

## 3. Landing Page Tests

**URL:** `http://localhost:3000/`

### TEST 3.1: Page Content

| Step | Action                        | Expected Result                                       |
| ---- | ----------------------------- | ----------------------------------------------------- |
| 1    | Open `http://localhost:3000/` | Page loads without errors                             |
| 2    | Check page title              | "Countdown Timer Bar"                                 |
| 3    | Check subtitle                | "Create real urgency and drive more sales..."         |
| 4    | Check for login form          | "Shop domain" label + text input + "Log in" button    |
| 5    | Check placeholder text        | `e.g: my-shop-domain.myshopify.com`                   |
| 6    | Check feature #1              | "Easy setup in 2 minutes." heading                    |
| 7    | Check feature #2              | "Real countdown timers." heading                      |
| 8    | Check feature #3              | "Conversion analytics." heading                       |
| 9    | Check footer links            | "Privacy Policy" and "Terms of Service" links visible |

### TEST 3.2: Login Form

| Step | Action                                        | Expected Result                           |
| ---- | --------------------------------------------- | ----------------------------------------- |
| 1    | Leave field empty, click "Log in"             | Form submits (Shopify handles validation) |
| 2    | Type `my-store.myshopify.com`, click "Log in" | Redirects to Shopify OAuth                |
| 3    | Type invalid text like `not-a-store`          | Shopify shows error page                  |

---

## 4. Privacy & Terms Pages

### TEST 4.1: Privacy Policy Page (`/privacy`)

| Step | Action                               | Expected Result                     |
| ---- | ------------------------------------ | ----------------------------------- |
| 1    | Open `http://localhost:3000/privacy` | Page loads, no red error screen     |
| 2    | Check heading                        | "Privacy Policy" in large bold text |
| 3    | Check section count                  | 10 numbered sections visible        |
| 4    | Click email links (sections 5, 6, 7) | Opens `mailto:` link                |

### TEST 4.2: Terms of Service Page (`/terms`)

| Step | Action                             | Expected Result                       |
| ---- | ---------------------------------- | ------------------------------------- |
| 1    | Open `http://localhost:3000/terms` | Page loads, no red error screen       |
| 2    | Check heading                      | "Terms of Service" in large bold text |
| 3    | Check section count                | 12 numbered sections visible          |

---

## 5. Shopify OAuth & App Install

### TEST 5.1: First Install Flow

| Step | Action                                   | Expected Result                           |
| ---- | ---------------------------------------- | ----------------------------------------- |
| 1    | Open the app URL in your dev store admin | Shopify OAuth screen appears              |
| 2    | Click "Install app"                      | App installs successfully                 |
| 3    | Check scopes requested                   | Only `write_themes` — no `write_products` |
| 4    | App redirects to...                      | The home/dashboard page (`/app`)          |

### TEST 5.2: Session Persistence

| Step | Action                                | Expected Result                     |
| ---- | ------------------------------------- | ----------------------------------- |
| 1    | Close the browser tab                 | —                                   |
| 2    | Open the app again from Shopify admin | App loads without re-authenticating |
| 3    | Check the Shopify admin header        | App name and navigation visible     |

---

## 6. Onboarding Flow Tests

**URL:** Navigate to **Setup Guide** in the app sidebar.

### TEST 6.1: Initial State (Fresh Install)

| Step | Action               | Expected Result            |
| ---- | -------------------- | -------------------------- |
| 1    | Open the Setup Guide | 3 steps displayed          |
| 2    | Check progress bar   | 0% (empty)                 |
| 3    | Check progress text  | "0 of 3 steps complete"    |
| 4    | Step 1 badge         | "Pending" (attention tone) |
| 5    | Step 2 badge         | "Pending" (attention tone) |
| 6    | Step 3 badge         | "Pending" (attention tone) |

### TEST 6.2: Step 1 — Configure Campaign

| Step | Action                               | Expected Result                                       |
| ---- | ------------------------------------ | ----------------------------------------------------- |
| 1    | Click "Configure Campaign" button    | Navigates to `/app` (dashboard)                       |
| 2    | Create a campaign from the dashboard | Campaign saved                                        |
| 3    | Navigate back to Setup Guide         | Step 1 shows "Complete" badge (green)                 |
| 4    | Step 2 also shows "Complete"         | Both marked done simultaneously (step1 triggers both) |
| 5    | Progress bar                         | 66% filled                                            |
| 6    | Progress text                        | "2 of 3 steps complete"                               |

### TEST 6.3: Step 3 — Install Theme Extension

| Step | Action                              | Expected Result                              |
| ---- | ----------------------------------- | -------------------------------------------- |
| 1    | Click "Open Theme Editor" button    | New tab opens with your theme's editor URL   |
| 2    | In Theme Editor: go to App Embeds   | "Countdown & CTA Bar" should be listed       |
| 3    | Toggle the embed ON and Save        | Embed activates                              |
| 4    | Go back to Setup Guide              | —                                            |
| 5    | Click "Mark Extension as Installed" | Step 3 badge changes to "Complete" (green)   |
| 6    | Progress bar                        | 100% filled                                  |
| 7    | Success banner appears              | "Your countdown timer is live!" green banner |
| 8    | Banner has action button            | "Go to Settings" — click navigates to `/app` |

### TEST 6.4: Completed State Persists

| Step | Action                  | Expected Result                   |
| ---- | ----------------------- | --------------------------------- |
| 1    | Navigate away from page | —                                 |
| 2    | Return to Setup Guide   | All 3 steps still show "Complete" |
| 3    | Refresh the page (F5)   | State persisted — still 100%      |

---

## 7. Dashboard (Home) Page Tests

**URL:** Click **Home** in the sidebar (routes to `/app`).

### TEST 7.1: Empty State (No Campaigns)

| Step | Action                           | Expected Result                             |
| ---- | -------------------------------- | ------------------------------------------- |
| 1    | Open dashboard with no campaigns | Empty state with illustration               |
| 2    | Check action button              | "Create your first campaign" or similar CTA |
| 3    | Click the CTA                    | Navigates to new campaign page              |

### TEST 7.2: Dashboard With Campaigns

| Step | Action                        | Expected Result                                |
| ---- | ----------------------------- | ---------------------------------------------- |
| 1    | Create one or more campaigns  | —                                              |
| 2    | Open dashboard                | Campaign list visible (up to 5 most recent)    |
| 3    | Check 7-day analytics summary | Total Impressions and Total Clicks displayed   |
| 4    | Check each campaign row       | Name, status badge, and 7-day stats shown      |
| 5    | Status badge colors           | Active=green, Inactive=default, Scheduled=blue |
| 6    | Click a campaign name         | Navigates to edit page (`/app/campaigns/<id>`) |

### TEST 7.3: Navigation Menu

| Step | Action                  | Expected Result                                     |
| ---- | ----------------------- | --------------------------------------------------- |
| 1    | Check sidebar nav items | Home, Campaigns, Analytics, Plan, Setup Guide, Help |
| 2    | Click each nav item     | Each navigates to the correct page                  |

---

## 8. Create Campaign Tests

**URL:** Click **Campaigns** → **Create Campaign** (routes to `/app/campaigns/new`).

### TEST 8.1: Default Values on New Campaign Form

| Field              | Expected Default                        |
| ------------------ | --------------------------------------- |
| Campaign Name      | "My Sale"                               |
| Bar Message        | "Flash Sale Ends In..."                 |
| Timer Type         | "One-time countdown"                    |
| Timezone           | Your browser's timezone                 |
| Button Text        | "Shop Now"                              |
| Button Link        | "/collections/all"                      |
| Discount Code      | Empty                                   |
| Bar Background     | Green (#288d40)                         |
| Text Color         | White (#ffffff)                         |
| Button Background  | White (#ffffff)                         |
| Button Text Color  | Dark (#111111)                          |
| Bar Position       | Top of page                             |
| Bar Icon           | None                                    |
| Font Family        | System default                          |
| Digit Animation    | None (instant)                          |
| Background Type    | Solid color                             |
| End Action         | Hide the bar                            |
| Custom End Message | Hidden (only if "show_custom" selected) |

### TEST 8.2: Campaign Details Card — Validation

#### Bar Message

| Test              | Input                          | Action        | Expected Result                                            |
| ----------------- | ------------------------------ | ------------- | ---------------------------------------------------------- |
| Empty message     | Clear the field                | Click Create  | Red banner: "Bar message is required."                     |
| Over 200 chars    | Type 201 characters            | Click Create  | Red banner: "Bar message must be 200 characters or fewer." |
| Exactly 200 chars | Type 200 characters            | Click Create  | Saves successfully                                         |
| Normal message    | "Black Friday Sale — 50% OFF!" | Click Create  | Saves successfully                                         |
| XSS attempt       | `<script>alert(1)</script>`    | Click Create  | Saves as plain text (no XSS executed on storefront)        |
| Character counter | Type in the field              | Watch counter | Shows "X/200" below the field in real-time                 |

#### Timer Type Selection

| Test               | Selection                    | Expected Result                                    |
| ------------------ | ---------------------------- | -------------------------------------------------- |
| One-time (default) | Select "One-time countdown"  | Shows Start Date & End Date fields                 |
| Daily recurring    | Select "Daily recurring"     | Hides dates, shows Daily Reset Time (time picker)  |
| Evergreen          | Select "Evergreen"           | Hides dates, shows Duration (minutes) number field |
| Switch back        | Switch from Daily → One-time | Date fields reappear, daily time field disappears  |

#### One-Time Timer — Date Fields

| Test             | Input                     | Action       | Expected Result                                   |
| ---------------- | ------------------------- | ------------ | ------------------------------------------------- |
| No end date      | Leave end date empty      | Click Create | Red banner: "End date is required."               |
| Past end date    | Set to yesterday          | Click Create | Red banner: "End date must be in the future."     |
| Future end date  | Set to tomorrow           | Click Create | Saves successfully                                |
| Start after end  | Start=tomorrow, End=today | Click Create | Red banner: "Start date must be before end date." |
| Start date empty | Leave start date empty    | Click Create | Saves (starts immediately)                        |

#### Timezone

| Test             | Action                     | Expected Result                                 |
| ---------------- | -------------------------- | ----------------------------------------------- |
| Default timezone | Open the form              | Pre-selected to your browser's timezone         |
| Change timezone  | Select "Pacific Time (PT)" | Dropdown updates                                |
| Grouped options  | Open the timezone dropdown | Options grouped: Americas, Europe, Asia/Pacific |
| UTC option       | Select "UTC"               | Saves. Dates interpreted as UTC                 |

### TEST 8.3: Call-to-Action Button Card

| Test                | Input                      | Action       | Expected Result                                 |
| ------------------- | -------------------------- | ------------ | ----------------------------------------------- |
| Button text filled  | "Shop the Sale"            | Click Create | Saves. Button appears on storefront bar         |
| Button text empty   | Clear the field            | Click Create | Saves. Button hidden on storefront bar          |
| Relative path       | `/collections/all`         | Click Create | Saves successfully                              |
| HTTPS URL           | `https://mystore.com/sale` | Click Create | Saves successfully                              |
| HTTP URL            | `http://mystore.com`       | Click Create | Error: "Button link must be a relative path..." |
| JavaScript inject   | `javascript:alert(1)`      | Click Create | Error: "Button link must be a relative path..." |
| Protocol-relative   | `//evil.com`               | Click Create | Error: "Button link must be a relative path..." |
| Discount code       | Type "SAVE20"              | Click Create | Saves. Discount badge appears on storefront bar |
| Discount code empty | Leave blank                | Click Create | Saves. No discount badge shown                  |

### TEST 8.4: Design Card — All Fields

_(See Section 11 for detailed design feature testing)_

| Test              | Action                       | Expected Result                              |
| ----------------- | ---------------------------- | -------------------------------------------- |
| Pick a template   | Click "Urgent Red" template  | All 4 color fields update to the template    |
| Change bar color  | Use color picker or type hex | Preview updates in real-time                 |
| Change text color | Use color picker or type hex | Preview updates in real-time                 |
| Bar position      | Switch to "Bottom of page"   | Preview shows bar at the bottom              |
| Select icon       | Pick "🔥 Fire"               | Preview shows fire emoji before message      |
| Select font       | Pick "Bebas Neue"            | Preview text changes to Bebas Neue font      |
| Select animation  | Pick "Flip (airport board)"  | Saves (animation visible only on storefront) |
| Gradient bg       | Switch to "Gradient"         | Direction + 2 color pickers appear           |

### TEST 8.5: End Action Card

| Test                | Action                                        | Expected Result                            |
| ------------------- | --------------------------------------------- | ------------------------------------------ |
| Hide the bar        | Select "Hide the bar"                         | No extra fields shown                      |
| Show "Sale Ended"   | Select 'Show "Sale Ended" message'            | No extra fields shown                      |
| Show custom message | Select "Show custom message"                  | Custom End Message text field appears      |
| Custom msg required | Select "Show custom message", leave msg empty | Error: "Custom end message is required..." |
| Custom msg filled   | Type "Thanks for shopping!"                   | Saves successfully                         |
| Switch back to hide | Change from "Show custom" to "Hide"           | Custom message field disappears            |

### TEST 8.6: Successful Campaign Creation

| Step | Action                                   | Expected Result                                |
| ---- | ---------------------------------------- | ---------------------------------------------- |
| 1    | Fill all required fields with valid data | —                                              |
| 2    | Click "Create Campaign"                  | Button shows loading spinner ("Creating...")   |
| 3    | After submission                         | Redirects to campaigns list                    |
| 4    | Check campaigns list                     | New campaign appears with "Active" badge       |
| 5    | Visit your storefront                    | Countdown bar visible with configured settings |

---

## 9. Edit Campaign Tests

**URL:** Click a campaign name from the campaigns list → `/app/campaigns/<id>`

### TEST 9.1: Form Pre-Populated

| Step | Action                                   | Expected Result                        |
| ---- | ---------------------------------------- | -------------------------------------- |
| 1    | Create a campaign with all fields filled | —                                      |
| 2    | Click the campaign name to edit          | Edit page opens                        |
| 3    | Check all fields                         | Every field shows the saved values     |
| 4    | Check bar message                        | Matches what you typed during creation |
| 5    | Check bar color                          | Color picker shows the saved color     |
| 6    | Check bar icon                           | Dropdown shows the saved emoji         |
| 7    | Check font family                        | Dropdown shows the saved font          |
| 8    | Check animation style                    | Dropdown shows the saved animation     |
| 9    | Check gradient (if set)                  | Direction and both color stops match   |

### TEST 9.2: Edit and Save

| Step | Action                        | Expected Result                        |
| ---- | ----------------------------- | -------------------------------------- |
| 1    | Change the bar message        | Preview updates in real-time           |
| 2    | Change the bar icon           | Preview shows new emoji                |
| 3    | Change the font to "Orbitron" | Preview text changes to Orbitron       |
| 4    | Click "Save Campaign"         | Toast: "Campaign updated" (or similar) |
| 5    | Refresh the edit page         | All changes persisted                  |
| 6    | Visit storefront              | Bar reflects the updated settings      |

### TEST 9.3: Validation on Edit (Same as Create)

All validation rules from Section 8 apply identically on the edit form.

---

## 10. Campaigns List Tests

**URL:** Click **Campaigns** in the sidebar → `/app/campaigns`

### TEST 10.1: Empty State

| Step | Action                                | Expected Result                                                   |
| ---- | ------------------------------------- | ----------------------------------------------------------------- |
| 1    | Open campaigns page with no campaigns | "No campaigns yet" heading                                        |
| 2    | Check empty message                   | "Create your first countdown timer to start driving conversions." |
| 3    | Click the action button               | Navigates to create campaign page                                 |

### TEST 10.2: Campaign List Display

| Step | Action                    | Expected Result                                               |
| ---- | ------------------------- | ------------------------------------------------------------- |
| 1    | Create 2–3 campaigns      | —                                                             |
| 2    | Open campaigns list       | All campaigns listed                                          |
| 3    | Check each row shows      | Campaign name, status badge, bar message, end date            |
| 4    | Check status badge colors | Active=green, Inactive=default, Ended=default, Scheduled=blue |
| 5    | Check end date format     | "Dec 31, 2026, 11:59 PM" or "No end date set"                 |

### TEST 10.3: Toggle Campaign Active/Inactive

| Step | Action                                    | Expected Result                        |
| ---- | ----------------------------------------- | -------------------------------------- |
| 1    | Click "Deactivate" on an active campaign  | Button shows loading state             |
| 2    | After submission                          | Badge changes to "Inactive"            |
| 3    | Click "Activate" on the inactive campaign | Badge changes back to "Active"         |
| 4    | Visit the storefront                      | Bar only shows when campaign is active |

### TEST 10.4: Delete Campaign

| Step | Action                       | Expected Result                                    |
| ---- | ---------------------------- | -------------------------------------------------- |
| 1    | Click "Delete" on a campaign | Confirmation modal appears                         |
| 2    | Click "Delete" in the modal  | Campaign removed from list                         |
| 3    | Check the database           | Campaign row deleted                               |
| 4    | Check CampaignAnalytics      | Analytics for that campaign also deleted (CASCADE) |

### TEST 10.5: Edit Navigation

| Step | Action                | Expected Result                    |
| ---- | --------------------- | ---------------------------------- |
| 1    | Click a campaign name | Navigates to `/app/campaigns/<id>` |
| 2    | Edit form loads       | All saved values pre-populated     |

### TEST 10.6: Free Plan Limit

| Step | Action                                             | Expected Result                              |
| ---- | -------------------------------------------------- | -------------------------------------------- |
| 1    | On free plan, create 1 active campaign             | Succeeds                                     |
| 2    | Try to create a second campaign                    | Error: upgrade required (plan limit reached) |
| 3    | Deactivate the first campaign, then create another | Succeeds (limit is on _active_ campaigns)    |

---

## 11. Design Features — Icons, Fonts, Animations, Gradients, Templates

### TEST 11.1: Quick Start Templates

There are 8 templates: Classic Green, Urgent Red, Elegant Dark, Black Friday, Ocean Blue, Sunset Glow, Minimal Light, Holiday Festive.

| Step | Action                                 | Expected Result                                                              |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | Open create or edit campaign form      | "Quick Start Templates" section visible in Design card                       |
| 2    | Count the template cards               | 8 mini-preview cards displayed in a grid                                     |
| 3    | Click "Urgent Red" template            | Bar BG → #dc2626, Text → #ffffff, Button BG → #ffffff, Button Text → #dc2626 |
| 4    | Check Live Preview                     | Preview immediately shows red bar with white text                            |
| 5    | Click "Black Friday" template          | Bar BG → #000000, Text → #fbbf24 (gold), Button BG → #fbbf24                 |
| 6    | Check Live Preview                     | Preview shows black bar with gold text                                       |
| 7    | Manually change a color after template | Only that color changes, others stay from template                           |
| 8    | Click a different template             | All 4 colors reset to the new template's values                              |

### TEST 11.2: Bar Icon (Emoji Picker)

23 emojis across 4 categories plus "None" default.

| Step | Action                            | Expected Result                                           |
| ---- | --------------------------------- | --------------------------------------------------------- |
| 1    | Open the "Bar Icon" dropdown      | Options grouped: Urgency, Shopping, Celebration, Seasonal |
| 2    | Category headers are disabled     | "── Urgency ──" etc. shown but not selectable             |
| 3    | Select "🔥 Fire"                  | Dropdown shows "🔥 Fire"                                  |
| 4    | Check Live Preview                | 🔥 appears before the bar message text                    |
| 5    | Select "🛒 Cart"                  | Preview updates to show 🛒 before message                 |
| 6    | Select "None"                     | Preview shows message with no icon                        |
| 7    | Save with "⚡ Lightning" selected | Saves successfully                                        |
| 8    | Visit storefront                  | ⚡ appears before the bar message text                    |
| 9    | Inspect the icon element          | `<span class="cdb__icon" aria-hidden="true">⚡</span>`    |
| 10   | Icon size                         | `font-size: 1.3em`, vertically centered with text         |

### TEST 11.3: Font Family (35+ Options with Google Fonts)

Fonts are grouped by category: Defaults, Sans-Serif Modern, Display & Bold, Serif Elegant, Monospace & Digital, Web-Safe.

| Step | Action                                 | Expected Result                                                                 |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------- |
| 1    | Open the "Font Family" dropdown        | Options grouped with `──` headers                                               |
| 2    | Category headers are disabled          | Not selectable                                                                  |
| 3    | Select "System default"                | Uses the browser's system font stack                                            |
| 4    | Select "Theme font (inherit)"          | Inherits the store's theme font                                                 |
| 5    | Select "Inter" (Google Font)           | Preview text changes to Inter                                                   |
| 6    | Inspect the page `<head>` in DevTools  | A `<link>` tag to `fonts.googleapis.com/css2?family=Inter` added                |
| 7    | Select "Bebas Neue"                    | Preview text changes to Bebas Neue (tall, condensed)                            |
| 8    | Select "Orbitron"                      | Preview text changes to Orbitron (digital/futuristic)                           |
| 9    | Select "Georgia" (Web-Safe)            | Preview changes. No Google Fonts `<link>` added                                 |
| 10   | Save with "Poppins" selected           | Saves successfully                                                              |
| 11   | Visit storefront                       | Bar text renders in Poppins. `<link>` tag in page head                          |
| 12   | Throttle network to Slow 3G (DevTools) | Text shows in fallback font first, then swaps to Poppins (`font-display: swap`) |

### TEST 11.4: Digit Animation (7 Options)

| Step | Action                              | Expected Result                                             |
| ---- | ----------------------------------- | ----------------------------------------------------------- |
| 1    | Open the "Digit Animation" dropdown | 7 options: None, Fade, Slide up, Flip, Bounce, Pulse, Scale |
| 2    | Select "Fade"                       | Saves. On storefront, digits fade in on each tick           |
| 3    | Select "Slide up"                   | Saves. Digits slide up from below on each tick              |
| 4    | Select "Flip (airport board)"       | Saves. Digits rotate on X-axis with 3D perspective          |
| 5    | Select "Bounce pop"                 | Saves. Digits pop in with spring overshoot                  |
| 6    | Select "Pulse glow"                 | Saves. Digits scale up with text-shadow glow                |
| 7    | Select "Scale zoom"                 | Saves. Digits zoom in from center                           |
| 8    | Select "None (instant)"             | Saves. Digits change instantly, no animation                |

**How to verify animations on storefront:**

| Step | Action                                    | Expected Result                                            |
| ---- | ----------------------------------------- | ---------------------------------------------------------- |
| 1    | Save campaign with "Flip" animation       | —                                                          |
| 2    | Visit storefront, watch the seconds digit | Every second, the digit flips with a 3D rotation effect    |
| 3    | Inspect the seconds `.cdb__value` element | Class toggles: `cdb__value--flip` added, removed, re-added |
| 4    | Open DevTools → Performance tab           | Animation runs at 60fps (no layout thrashing)              |

**Reduced motion test:**

| Step | Action                                              | Expected Result                                                     |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | Enable "Reduce motion" in OS accessibility settings | —                                                                   |
| 2    | Visit storefront with any animation selected        | Digits change instantly, no animation                               |
| 3    | Inspect CSS                                         | `@media (prefers-reduced-motion: reduce)` applies `animation: none` |

### TEST 11.5: Background Type — Solid vs. Gradient

| Step | Action                                   | Expected Result                                          |
| ---- | ---------------------------------------- | -------------------------------------------------------- |
| 1    | Select "Solid color" (default)           | Single "Bar Background Color" picker visible             |
| 2    | Select "Gradient"                        | 3 new fields appear: Direction, Start Color, End Color   |
| 3    | Set Direction to "Diagonal ↘"           | —                                                        |
| 4    | Set Start Color to #667eea (purple-blue) | —                                                        |
| 5    | Set End Color to #764ba2 (purple)        | —                                                        |
| 6    | Save the campaign                        | Saves successfully                                       |
| 7    | Visit storefront                         | Bar shows a diagonal gradient from purple-blue to purple |
| 8    | Inspect the bar element                  | `background: linear-gradient(135deg, #667eea, #764ba2)`  |
| 9    | Switch back to "Solid color"             | Gradient fields disappear, solid color picker returns    |
| 10   | Save                                     | Storefront shows solid color bar                         |

**Gradient direction options:**

| Label         | CSS Value   |
| ------------- | ----------- |
| Left to Right | `to right`  |
| Right to Left | `to left`   |
| Top to Bottom | `to bottom` |
| Diagonal ↘   | `135deg`    |
| Diagonal ↗   | `45deg`     |

### TEST 11.6: Color Picker & Hex Input

| Test                  | Action                      | Expected Result                    |
| --------------------- | --------------------------- | ---------------------------------- |
| Pick via color picker | Drag the color picker       | Hex input updates to match         |
| Type hex manually     | Type `#ff0000` in hex input | Color picker moves to red          |
| Invalid hex           | Type `xyz`                  | Defaults to fallback color         |
| Preview updates       | Change any color            | Live Preview bar updates instantly |

---

## 12. Timer Type Tests — One-Time, Daily, Evergreen

### TEST 12.1: One-Time Countdown

| Step | Action                                 | Expected Result                        |
| ---- | -------------------------------------- | -------------------------------------- |
| 1    | Set Timer Type to "One-time countdown" | Start Date and End Date fields visible |
| 2    | Set End Date to 2 days from now        | —                                      |
| 3    | Leave Start Date empty                 | Timer starts immediately               |
| 4    | Save and visit storefront              | Timer shows DD:HH:MM:SS counting down  |
| 5    | Refresh the page                       | Timer value does NOT reset (UTC-based) |
| 6    | Open in incognito window               | Same timer value                       |

### TEST 12.2: Daily Recurring Timer

| Step | Action                                | Expected Result                                  |
| ---- | ------------------------------------- | ------------------------------------------------ |
| 1    | Set Timer Type to "Daily recurring"   | Daily Reset Time (time picker) appears           |
| 2    | Set reset time to 30 minutes from now | —                                                |
| 3    | Save and visit storefront             | Timer counts down to the reset time              |
| 4    | Wait for timer to reach zero          | Timer resets to 24 hours (next day's reset time) |

### TEST 12.3: Evergreen (Per-Visitor) Timer

| Step | Action                           | Expected Result                                     |
| ---- | -------------------------------- | --------------------------------------------------- |
| 1    | Set Timer Type to "Evergreen"    | Duration (minutes) field appears                    |
| 2    | Set duration to 5 minutes        | —                                                   |
| 3    | Save and visit storefront        | Timer shows 05:00 counting down                     |
| 4    | Refresh the page                 | Timer continues from where it was (localStorage)    |
| 5    | Open in incognito/private window | NEW timer starts fresh at 05:00                     |
| 6    | Check localStorage in DevTools   | Key `cdb_eg_<shop-domain>` stores the end timestamp |
| 7    | Wait for timer to reach zero     | Timer disappears (shows once per visitor)           |

---

## 13. Live Preview Component Tests

The Live Preview panel appears on the right side of the campaign form (sticky, scrolls with you).

| Step | Action                                | Expected Result                                      |
| ---- | ------------------------------------- | ---------------------------------------------------- |
| 1    | Open new campaign form                | "Live Preview" card visible on right                 |
| 2    | Check preview heading                 | "Live Preview" with subtitle about storefront        |
| 3    | Check static timer digits             | Shows "02:14:33:07" with Days/Hours/Mins/Secs labels |
| 4    | Change bar message to "Summer Sale!"  | Preview message updates immediately                  |
| 5    | Select icon "🎉 Party"                | 🎉 appears before "Summer Sale!" in preview          |
| 6    | Change bar color to red (#dc2626)     | Preview background turns red                         |
| 7    | Change text color to yellow (#fbbf24) | Preview text turns yellow                            |
| 8    | Select "Bottom of page"               | Preview bar moves to bottom, gray placeholder at top |
| 9    | Select "Top of page"                  | Preview bar moves to top, gray placeholder at bottom |
| 10   | Type discount code "SAVE20"           | Discount badge appears in preview: `SAVE20` + Copy   |
| 11   | Clear discount code                   | Badge disappears from preview                        |
| 12   | Type button text "Shop Now"           | White button appears in preview                      |
| 13   | Clear button text                     | Button disappears from preview                       |
| 14   | Change button bg to gold (#fbbf24)    | Preview button turns gold                            |
| 15   | Select font "Orbitron"                | Preview text changes to Orbitron (digital)           |
| 16   | Close button icon                     | Always visible in preview (circle with X)            |

---

## 14. Theme Extension — Countdown Bar (App Embed)

This is the main countdown bar that appears on all pages. It's an **App Embed**, not a block.

### How to Install

| Step | Action                                      | Expected Result        |
| ---- | ------------------------------------------- | ---------------------- |
| 1    | Go to Shopify Admin → Online Store → Themes | —                      |
| 2    | Click "Customize" on your active theme      | Theme Editor opens     |
| 3    | In the left sidebar, click "App embeds"     | App embeds panel opens |
| 4    | Find "Countdown & CTA Bar"                  | Listed under your app  |
| 5    | Toggle it ON                                | Embed activates        |
| 6    | Click "Save" in the theme editor            | Saved                  |

### Theme Editor Settings

These settings are available in the theme editor when the embed is selected:

| Setting          | Type     | Default | Test                                           |
| ---------------- | -------- | ------- | ---------------------------------------------- |
| Background color | Color    | #288d40 | Change to red → bar background turns red       |
| Text color       | Color    | #ffffff | Change to black → bar text turns black         |
| Accent color     | Color    | #ffffff | Change to gold → button accent turns gold      |
| Bar position     | Select   | Top     | Change to Bottom → bar moves to bottom of page |
| Font size        | Range    | 14px    | Slide to 20px → message text becomes larger    |
| Show close       | Checkbox | Checked | Uncheck → close button disappears from bar     |
| Bar padding      | Range    | 10px    | Slide to 20px → more vertical space inside bar |

**Note:** Theme editor settings act as _overrides_ — they take priority over campaign settings for colors and position. The campaign's message, timer, button, icon, font, animation, and discount code always come from the app's campaign settings.

### TEST 14.1: Bar Visibility

| Step | Action                             | Expected Result                         |
| ---- | ---------------------------------- | --------------------------------------- |
| 1    | Active campaign + embed enabled    | Bar appears on storefront               |
| 2    | No active campaign + embed enabled | Bar does NOT appear (hidden, no errors) |
| 3    | Active campaign + embed disabled   | Bar does NOT appear                     |
| 4    | Check console for errors           | Zero console errors in all 3 scenarios  |

---

## 15. Theme Extension — Product Timer (Block)

This is an inline countdown timer that appears on product pages.

### How to Install

| Step | Action                                                  | Expected Result            |
| ---- | ------------------------------------------------------- | -------------------------- |
| 1    | Go to Theme Editor → select a **Product page** template | Product template opens     |
| 2    | Click "Add block" on any section                        | Block picker opens         |
| 3    | Under "Apps", find "Countdown Timer"                    | Listed under your app      |
| 4    | Click it to add                                         | Block added to the section |
| 5    | Click "Save"                                            | Saved                      |

### Theme Editor Settings

| Setting              | Type     | Default                       | Test                                                            |
| -------------------- | -------- | ----------------------------- | --------------------------------------------------------------- |
| Timer style          | Select   | Minimal                       | Change to "Card" → timer gets a bordered box                    |
|                      |          |                               | Change to "Badge" → timer gets a colored pill look              |
| Text color           | Color    | #333333                       | Change → timer text color updates                               |
| Digit color          | Color    | #dc2626 (red)                 | Change → countdown digits change color                          |
| Background color     | Color    | (transparent)                 | Set a color → background fills behind timer                     |
| Font size            | Range    | 14px                          | Slide → timer text scales                                       |
| Show label text      | Checkbox | Checked                       | Uncheck → "Sale ends in" label disappears                       |
| Label text           | Text     | "Sale ends in"                | Change to "Hurry!" → label text updates                         |
| Show low stock alert | Checkbox | Unchecked                     | Check → stock alert appears (if product is low)                 |
| Low stock threshold  | Range    | 5                             | Set to 10 → alert shows when stock ≤ 10                         |
| Stock message        | Text     | "Only {count} left in stock!" | Change → message updates. `{count}` replaced with actual number |
| Alert text color     | Color    | #dc2626 (red)                 | Change → alert text color updates                               |
| Show stock level bar | Checkbox | Checked                       | Uncheck → progress bar under alert disappears                   |

### TEST 15.1: Product Timer Behavior

| Step | Action                                      | Expected Result                       |
| ---- | ------------------------------------------- | ------------------------------------- |
| 1    | Add the block to a product page section     | —                                     |
| 2    | Visit a product page on your storefront     | Timer visible, counting down          |
| 3    | Check timer uses campaign's end date        | Same deadline as the announcement bar |
| 4    | Check icon rendering (if campaign has icon) | Icon appears before label text        |
| 5    | Check Google Font loading (if configured)   | Font loads and applies to the timer   |

### TEST 15.2: Low Stock Alert

| Step | Action                                          | Expected Result                             |
| ---- | ----------------------------------------------- | ------------------------------------------- |
| 1    | Enable "Show low stock alert" in theme editor   | —                                           |
| 2    | Set threshold to 10                             | —                                           |
| 3    | Find a product with inventory ≤ 10              | Alert appears: "Only X left in stock!"      |
| 4    | Check progress bar                              | Bar fills proportionally (e.g., 3/10 = 30%) |
| 5    | Find a product with inventory > threshold       | Alert does NOT appear                       |
| 6    | Find a product with inventory tracking disabled | Alert does NOT appear                       |

---

## 16. Theme Extension — Cart Timer (Block)

This is a cart reservation timer that appears on the cart page when items are in the cart.

### How to Install

| Step | Action                                                 | Expected Result       |
| ---- | ------------------------------------------------------ | --------------------- |
| 1    | Go to Theme Editor → select the **Cart page** template | Cart template opens   |
| 2    | Click "Add block" on any section                       | Block picker opens    |
| 3    | Under "Apps", find "Cart Countdown Timer"              | Listed under your app |
| 4    | Click to add, then "Save"                              | Block added and saved |

### Theme Editor Settings

| Setting            | Type   | Default                     | Test                                      |
| ------------------ | ------ | --------------------------- | ----------------------------------------- |
| Reservation time   | Range  | 10 minutes                  | Change to 5 → timer starts at 05:00       |
| Timer message      | Text   | "Your cart is reserved for" | Change → message updates                  |
| When timer expires | Select | "Hide the timer"            | "Clear the cart" → cart empties on expiry |
|                    |        |                             | "Redirect to page" → redirects on expiry  |
| Redirect URL       | URL    | (empty)                     | Set a URL → redirect goes there on expiry |
| Text color         | Color  | #991b1b                     | Change → text color updates               |
| Background color   | Color  | #fef2f2 (light red)         | Change → background updates               |
| Timer digit color  | Color  | #dc2626 (red)               | Change → digit color updates              |

### TEST 16.1: Cart Timer Behavior

| Step | Action                                    | Expected Result                                        |
| ---- | ----------------------------------------- | ------------------------------------------------------ |
| 1    | Add items to cart, go to cart page        | Cart timer appears with 🔥 icon                        |
| 2    | Timer shows MM:SS format                  | Counting down from the configured minutes              |
| 3    | Message shows "Your cart is reserved for" | Message matches the configured text                    |
| 4    | Empty cart, go to cart page               | Timer does NOT appear (requires `cart.item_count > 0`) |

### TEST 16.2: Expiry Actions

| Test       | Configuration                | After Timer Reaches 0                         |
| ---------- | ---------------------------- | --------------------------------------------- |
| Hide       | expiry_action = "hide"       | Timer disappears, cart stays                  |
| Clear cart | expiry_action = "clear_cart" | Cart items removed, user sees empty cart      |
| Redirect   | expiry_action = "redirect"   | Page navigates to the configured redirect URL |

---

## 17. Storefront Bar — Full Behavior Tests

> **Requires:** Active campaign + Countdown Bar embed enabled in theme

### TEST 18.1: Bar Renders Correctly

| Step | Action                                 | Expected Result                                   |
| ---- | -------------------------------------- | ------------------------------------------------- |
| 1    | Visit your development store home page | Countdown bar visible at top (or bottom)          |
| 2    | Check bar message                      | Matches campaign's "Bar Message"                  |
| 3    | Check bar color                        | Matches campaign's background color (or gradient) |
| 4    | Check text color                       | Matches campaign's text color                     |
| 5    | Check timer digits                     | Shows DD:HH:MM:SS, counting down                  |
| 6    | Check digit labels                     | "Days", "Hours", "Mins", "Secs" below digits      |
| 7    | Check icon (if configured)             | Emoji appears before the message                  |
| 8    | Check font (if Google Font configured) | Font matches the selected font                    |

### TEST 18.2: CTA Button

| Step | Action                         | Expected Result                            |
| ---- | ------------------------------ | ------------------------------------------ |
| 1    | Check button visibility        | Visible if `buttonText` is set in campaign |
| 2    | Check button text              | Matches campaign's button text             |
| 3    | Check button colors            | BG and text colors match campaign settings |
| 4    | Click the button               | Navigates to the configured link           |
| 5    | Remove button text in campaign | Button disappears from bar on next visit   |

### TEST 18.3: Discount Code Badge

| Step | Action                          | Expected Result                                   |
| ---- | ------------------------------- | ------------------------------------------------- |
| 1    | Set discount code to "SAVE20"   | —                                                 |
| 2    | Visit storefront                | Badge shows: `SAVE20` with a "Copy" button        |
| 3    | Click "Copy"                    | Code copied to clipboard, button text → "Copied!" |
| 4    | After 2 seconds                 | Button text reverts to "Copy"                     |
| 5    | Clear discount code in campaign | Badge disappears from bar                         |

### TEST 18.4: Close Button

| Step | Action                              | Expected Result                                   |
| ---- | ----------------------------------- | ------------------------------------------------- |
| 1    | Click the ✕ close button            | Bar disappears (slide up/down)                    |
| 2    | Refresh the page                    | Bar stays hidden (sessionStorage persists)        |
| 3    | Navigate to a different page        | Bar stays hidden (same session)                   |
| 4    | Open DevTools → Application tab     | `sessionStorage` has `cdb_closed_<shop>` = "1"    |
| 5    | Open a new incognito/private window | Bar appears again (fresh session)                 |
| 6    | Close the browser and reopen        | Bar appears again (sessionStorage is per-session) |

### TEST 18.5: End Actions (When Timer Reaches Zero)

**Setup:** Set end date to 2 minutes from now and wait.

| End Action          | Campaign Setting            | What Happens When Timer Hits 0                   |
| ------------------- | --------------------------- | ------------------------------------------------ |
| Hide the bar        | `endAction = "hide"`        | Bar disappears completely                        |
| Show "Sale Ended"   | `endAction = "show_ended"`  | Timer hides, message changes to "Sale Ended"     |
| Show custom message | `endAction = "show_custom"` | Timer hides, message changes to your custom text |

### TEST 18.6: Page Targeting

| Step | Action                                               | Expected Result                             |
| ---- | ---------------------------------------------------- | ------------------------------------------- |
| 1    | Set page targeting to "Show on all pages" (default)  | Bar appears on every page                   |
| 2    | Set to "Only show on these pages" + `/collections/*` | Bar appears only on collection pages        |
| 3    | Visit homepage                                       | Bar does NOT appear                         |
| 4    | Visit `/collections/all`                             | Bar appears                                 |
| 5    | Set to "Hide on these pages" + `/products/*`         | Bar appears everywhere except product pages |

### TEST 18.7: Analytics Tracking

| Step | Action                                        | Expected Result                            |
| ---- | --------------------------------------------- | ------------------------------------------ |
| 1    | Visit storefront with bar visible             | Impression event fires (check Network tab) |
| 2    | Check Network tab for `/apps/countdown/track` | POST request with `{"event":"impression"}` |
| 3    | Click the CTA button                          | Click event fires                          |
| 4    | Close the bar                                 | Close event fires                          |
| 5    | Check Analytics page in admin                 | Impressions and clicks increment           |

### TEST 18.8: No Console Errors

| Step | Action                              | Expected Result                        |
| ---- | ----------------------------------- | -------------------------------------- |
| 1    | Open DevTools → Console tab         | —                                      |
| 2    | Visit storefront with active bar    | Zero console errors from the extension |
| 3    | Visit storefront without active bar | Zero console errors                    |
| 4    | Visit with bad API response         | Extension fails silently (no errors)   |

---

## 18. Analytics Page Tests

**URL:** Click **Analytics** in the sidebar → `/app/analytics`

### TEST 19.1: Empty State

| Step | Action                           | Expected Result                                              |
| ---- | -------------------------------- | ------------------------------------------------------------ |
| 1    | Open Analytics with no campaigns | "No data yet" heading                                        |
| 2    | Check empty message              | "Your analytics will appear here once your timer is live..." |

### TEST 19.2: Metrics Cards

| Step | Action                                         | Expected Result                        |
| ---- | ---------------------------------------------- | -------------------------------------- |
| 1    | Have an active campaign with storefront visits | —                                      |
| 2    | Open Analytics page                            | 3 metric cards visible                 |
| 3    | "Total Impressions" card                       | Shows formatted number (e.g., "1,234") |
| 4    | "Total Clicks" card                            | Shows formatted number                 |
| 5    | "Click-Through Rate" card                      | Shows percentage (e.g., "3.2%")        |
| 6    | CTR with 0 impressions                         | Shows "—" (dash), not "NaN%"           |

### TEST 19.3: Date Range Filter

| Step | Action            | Expected Result                                  |
| ---- | ----------------- | ------------------------------------------------ |
| 1    | Default range     | 30 days selected                                 |
| 2    | Select "7 days"   | Metrics recalculate for last 7 days              |
| 3    | Select "90 days"  | Metrics recalculate for last 90 days             |
| 4    | Comparison arrows | Shows up/down arrow comparing to previous period |

### TEST 19.4: Campaign Table

| Step | Action                | Expected Result                            |
| ---- | --------------------- | ------------------------------------------ |
| 1    | Check table headers   | Campaign, Status, Impressions, Clicks, CTR |
| 2    | Active campaign row   | Green "Active" badge                       |
| 3    | Inactive campaign row | Default-tone "Inactive" badge              |
| 4    | Number formatting     | Thousands separated (e.g., "12,345")       |

---

## 19. Billing & Plan Page Tests

**URL:** Click **Plan** in the sidebar → `/app/billing`

### TEST 20.1: Free Plan Display

| Step | Action             | Expected Result                          |
| ---- | ------------------ | ---------------------------------------- |
| 1    | Open Plan page     | Two plan cards: Free and Pro             |
| 2    | Free plan card     | Shows "Current Plan" green badge         |
| 3    | Free plan features | 1 active campaign, basic features listed |
| 4    | Pro plan card      | Shows "Start 14-day free trial" button   |

### TEST 20.2: Upgrade Button (Dev App)

| Step | Action                          | Expected Result                                               |
| ---- | ------------------------------- | ------------------------------------------------------------- |
| 1    | Click "Start 14-day free trial" | Button shows loading spinner                                  |
| 2    | Response on dev app             | Warning banner: "Billing not available during development..." |
| 3    | On production app               | Redirects to Shopify's billing approval page                  |

---

## 20. Help Page Tests

**URL:** Click **Help** in the sidebar → `/app/help`

### TEST 21.1: FAQ Sections

| Step | Action                          | Expected Result                             |
| ---- | ------------------------------- | ------------------------------------------- |
| 1    | Open Help page                  | FAQ sections visible with collapsible items |
| 2    | Check section "Getting Started" | 3 questions with expandable answers         |
| 3    | Click a question                | Answer expands/collapses                    |
| 4    | Check "Timer Types" section     | Questions about one-time, daily, evergreen  |
| 5    | Check "Design & Customization"  | Questions about colors, fonts, theme editor |

---

## 21. Public API Tests

### TEST 22.1: Settings API — Valid Request

```bash
curl "http://localhost:3000/apps/countdown/settings?shop=your-store.myshopify.com"
```

| Expected | Value                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------- |
| Status   | 200                                                                                             |
| Body     | `{"success":true,"settings":{...}}` or `{"success":false,"message":"No active campaign found"}` |
| Header   | `Access-Control-Allow-Origin: *`                                                                |
| Header   | `Cache-Control: public, max-age=60, stale-while-revalidate=30`                                  |

**Settings response fields (verify all present when campaign is active):**

```
barMessage, buttonText, buttonUrl, discountCode, timerType, endDate,
dailyResetTime, evergreenMinutes, timezone, barIcon, fontFamily,
animationStyle, backgroundStyle, barColor, pageTargeting, textColor,
buttonTextColor, buttonBgColor, barPosition, endAction, customEndMessage
```

### TEST 22.2: Settings API — Missing Shop

```bash
curl "http://localhost:3000/apps/countdown/settings"
```

| Expected | Value                                                    |
| -------- | -------------------------------------------------------- |
| Status   | 400                                                      |
| Body     | `{"success":false,"error":"Shop parameter is required"}` |

### TEST 22.3: Settings API — Invalid Shop

```bash
curl "http://localhost:3000/apps/countdown/settings?shop=../../../../etc/passwd"
```

| Expected | Value                                                |
| -------- | ---------------------------------------------------- |
| Status   | 400                                                  |
| Body     | `{"success":false,"error":"Invalid shop parameter"}` |

### TEST 22.4: Settings API — XSS in Shop

```bash
curl "http://localhost:3000/apps/countdown/settings?shop=<script>alert(1)</script>"
```

| Expected | Value                                                |
| -------- | ---------------------------------------------------- |
| Status   | 400                                                  |
| Body     | `{"success":false,"error":"Invalid shop parameter"}` |

### TEST 22.5: Track API — Valid Events

```bash
curl -X POST http://localhost:3000/apps/countdown/track \
  -H "Content-Type: application/json" \
  -d '{"shop":"your-store.myshopify.com","event":"impression"}'
```

| Event          | Expected Status | Expected Body               |
| -------------- | --------------- | --------------------------- |
| `"impression"` | 200             | `{"success":true}`          |
| `"click"`      | 200             | `{"success":true}`          |
| `"close"`      | 200             | `{"success":true}`          |
| `"purchase"`   | 400             | `{"error":"Invalid event"}` |
| `""`           | 400             | `{"error":"Invalid event"}` |

### TEST 22.6: Track API — CORS Preflight

```bash
curl -X OPTIONS http://localhost:3000/apps/countdown/track
```

| Expected | Value                                         |
| -------- | --------------------------------------------- |
| Status   | 204                                           |
| Header   | `Access-Control-Allow-Origin: *`              |
| Header   | `Access-Control-Allow-Methods: POST, OPTIONS` |

---

## 22. Rate Limiting Tests

### TEST 23.1: Under the Limit (60 requests/minute per IP)

```bash
for i in $(seq 1 60); do
  curl -s -o /dev/null -w "%{http_code} " \
    "http://localhost:3000/apps/countdown/settings?shop=test.myshopify.com"
done
```

| Expected | All 60 return `200` |

### TEST 23.2: Over the Limit

```bash
for i in $(seq 1 70); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:3000/apps/countdown/settings?shop=rate-test.myshopify.com")
  echo "$i: $STATUS"
done
```

| Expected | Requests 1–60 return `200`, requests 61+ return `429` |

### TEST 23.3: Rate Limit Response

When rate-limited (429):

| Header        | Value                                           |
| ------------- | ----------------------------------------------- |
| Retry-After   | `60`                                            |
| Cache-Control | `no-store`                                      |
| Body          | `{"success":false,"error":"Too many requests"}` |

### TEST 23.4: Per-Shop Rate Limit (120 requests/minute)

```bash
for i in $(seq 1 130); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-Forwarded-For: 10.0.0.$((i % 255))" \
    "http://localhost:3000/apps/countdown/settings?shop=single-shop.myshopify.com")
  echo "$i: $STATUS"
done
```

| Expected | Requests 1–120 return `200` (different IPs), requests 121+ return `429` (same shop) |

---

## 23. Accessibility Tests

### TEST 24.1: Storefront Bar — ARIA

| Check              | How to Inspect           | Expected                                                      |
| ------------------ | ------------------------ | ------------------------------------------------------------- |
| Region role        | Inspect `#cdb-bar`       | `role="region"` + `aria-label="Countdown timer announcement"` |
| Timer role         | Inspect `#cdb-timer`     | `role="timer"` + `aria-live="off"`                            |
| Screen reader text | Inspect `.cdb__sr-timer` | `aria-live="polite"` + updates every 60 seconds               |
| Close button label | Inspect `#cdb-close`     | `aria-label="Close countdown bar"`                            |
| SVG hidden         | Inspect close button SVG | `aria-hidden="true"` + `focusable="false"`                    |
| Digit spans hidden | Inspect `.cdb__value`    | `aria-hidden="true"`                                          |
| Icon hidden        | Inspect `.cdb__icon`     | `aria-hidden="true"` (decorative emoji)                       |

### TEST 24.2: Product Timer — ARIA

| Check              | How to Inspect            | Expected                                                 |
| ------------------ | ------------------------- | -------------------------------------------------------- |
| Timer role         | Inspect `.cdp`            | `role="timer"` + `aria-label="Countdown timer"`          |
| Screen reader text | Inspect `.cdp__sr`        | `aria-live="polite"` + updates every 60s                 |
| Stock bar          | Inspect `.cdp__stock-bar` | `role="progressbar"` + `aria-valuenow` / `aria-valuemax` |

### TEST 24.3: Touch Targets (WCAG 2.5.5)

| Element           | How to Check            | Expected Min Size |
| ----------------- | ----------------------- | ----------------- |
| Close button      | Inspect computed styles | 44px × 44px       |
| CTA button        | Inspect computed styles | min-height: 44px  |
| Discount copy btn | Inspect computed styles | min-height: 28px  |

### TEST 24.4: Reduced Motion

| Step | Action                                              | Expected Result                      |
| ---- | --------------------------------------------------- | ------------------------------------ |
| 1    | Enable "Reduce motion" in OS accessibility settings | —                                    |
| 2    | Visit storefront with countdown bar                 | Bar appears WITHOUT slide animation  |
| 3    | Check digit transitions                             | No flip/bounce/pulse/scale animation |
| 4    | Check CTA button hover                              | No transform animation               |
| 5    | Check close button hover                            | No rotate animation                  |

### TEST 24.5: Keyboard Navigation

| Step | Action                        | Expected Result                           |
| ---- | ----------------------------- | ----------------------------------------- |
| 1    | Tab to the countdown bar area | Focus moves to CTA button or close button |
| 2    | Press Enter on CTA button     | Navigates to button link                  |
| 3    | Press Enter on close button   | Bar closes                                |
| 4    | Check focus-visible styles    | Visible focus ring with `outline` on both |

---

## 24. Mobile Responsiveness Tests

### Viewports to Test

| Device    | Width  |
| --------- | ------ |
| iPhone SE | 320px  |
| iPhone 14 | 390px  |
| iPad      | 768px  |
| Desktop   | 1440px |

### Storefront Bar — Mobile

| Step | Action            | Expected Result                                |
| ---- | ----------------- | ---------------------------------------------- |
| 1    | View bar at 320px | No horizontal overflow                         |
| 2    | Message text      | Wraps to full width, font-size reduces to 13px |
| 3    | Timer digits      | Font-size reduces to 18px, min-width 36px each |
| 4    | CTA button        | min-height 44px, padding reduces               |
| 5    | Close button      | Still 44×44px (touch target maintained)        |
| 6    | Content gap       | Reduces from 20px to 12px                      |

### Admin Pages — Mobile

| Page         | URL                  | What to Check                                    |
| ------------ | -------------------- | ------------------------------------------------ |
| Landing      | `/`                  | Login form centered, features stack vertically   |
| Dashboard    | `/app`               | Campaign cards stack, metrics readable           |
| New Campaign | `/app/campaigns/new` | Form fields stack, preview below (not beside)    |
| Campaigns    | `/app/campaigns`     | Campaign list scrolls, toggle buttons accessible |
| Analytics    | `/app/analytics`     | Metric cards stack, table scrolls horizontally   |
| Billing      | `/app/billing`       | Plan cards stack vertically                      |
| Setup Guide  | `/app/onboarding`    | Steps stack, progress bar spans full width       |

---

## 25. Automated Test Suite

### 26.1: Run Unit Tests

```bash
npx vitest run
# or: make test
```

**Expected output:**

```
Test Files  8 passed (8)
     Tests  147 passed (147)
```

**Covered test files:**

| File                                  | Tests | Coverage Areas                                             |
| ------------------------------------- | ----- | ---------------------------------------------------------- |
| `tests/unit/utils/campaign.test.js`   | 41    | Form mapping, status, formatting, fonts, icons, animations |
| `tests/unit/utils/validation.test.js` | 40    | Shop regex, URL validation, event types, form validation   |
| `tests/unit/utils/countdown.test.js`  | 16    | pad(), time decomposition, UTC dates, screen reader        |
| `tests/unit/utils/color.test.js`      | 9     | hexToHsb conversion and edge cases                         |
| `tests/unit/redis.test.js`            | 5     | Rate limiter in-memory fallback                            |
| `tests/unit/utils/billing.test.js`    | 6     | Plan detection, campaign limits                            |
| `tests/unit/utils/logger.test.js`     | 4     | Logger instance, request logger                            |
| `tests/unit/routes/settings.test.js`  | 26    | Settings API response and validation                       |

### 26.2: Run Full CI Pipeline

```bash
make ci
# Runs: ESLint → Prettier → TypeScript → Unit Tests → E2E Tests
```

### 26.3: Run Tests with Coverage

```bash
npx vitest run --coverage
# or: make test-coverage
```

Opens coverage report at `coverage/index.html`. Target: 80%+.

---

## 26. Test Data Reference

### Valid Shop Domains

```
my-store.myshopify.com
test-shop.myshopify.com
store123.myshopify.com
```

### Invalid Shop Domains (Rejected by API)

```
not-a-shop.com
-starts-with-hyphen.myshopify.com
<script>alert(1)</script>
../../../../etc/passwd
```

### Valid Button Links

```
/collections/all
/products/my-product
/
https://example.com
```

### Invalid Button Links (Rejected by Validation)

```
http://example.com          (not HTTPS)
//evil.com                  (protocol-relative)
javascript:alert(1)         (XSS)
data:text/html,<script>    (data URI)
```

### Sample Campaign Data for Full Testing

```
Campaign Name:     "Summer Sale 2026"
Bar Message:       "Summer Blowout — Up to 60% OFF!"
Timer Type:        One-time countdown
Start Date:        [leave empty — starts immediately]
End Date:          [2 days from now]
Timezone:          America/New_York
Button Text:       "Shop the Sale"
Button Link:       /collections/sale
Discount Code:     SUMMER60
Bar Icon:          🔥 Fire
Font Family:       Poppins
Digit Animation:   Flip (airport board)
Background Type:   Gradient
Gradient Direction: Diagonal ↘
Gradient Start:    #667eea
Gradient End:      #764ba2
Text Color:        #ffffff
Button BG Color:   #fbbf24
Button Text Color: #1a1a2e
Bar Position:      Top
End Action:        Show custom message
Custom End Msg:    "Sale has ended — follow us for the next one!"
```

---

## 27. Pre-Release Checklist

### Infrastructure

- [ ] All services healthy (health endpoint, DB, Redis)
- [ ] `npx vitest run` passes all 147 tests
- [ ] `make ci` passes full pipeline (lint + types + tests)

### Landing & Legal Pages

- [ ] Landing page renders correctly (desktop + mobile)
- [ ] Privacy policy page loads without error
- [ ] Terms of service page loads without error

### App Install & Auth

- [ ] OAuth install flow works on development store
- [ ] Session persists after closing and reopening app

### Onboarding

- [ ] 3-step flow completes end-to-end
- [ ] Progress bar and badges update correctly
- [ ] "Your countdown timer is live!" banner at 100%

### Campaign CRUD

- [ ] Create campaign with all fields saves correctly
- [ ] All validation errors trigger (message, dates, URLs, end action)
- [ ] Edit campaign pre-populates all fields
- [ ] Edit campaign saves changes
- [ ] Toggle activate/deactivate works
- [ ] Delete campaign removes data + analytics (CASCADE)
- [ ] Free plan limit enforced (1 active campaign)

### Design Features

- [ ] All 8 quick start templates apply colors correctly
- [ ] Bar icon (emoji) renders in preview AND storefront
- [ ] Google Font loads in preview AND storefront
- [ ] All 7 animation styles work on storefront (including reduced motion)
- [ ] Gradient background renders on storefront
- [ ] Color picker and hex input stay synchronized

### Timer Types

- [ ] One-time countdown works (UTC-based, no reset on refresh)
- [ ] Daily recurring resets at configured time
- [ ] Evergreen per-visitor timer starts fresh per visitor

### Storefront Bar

- [ ] Bar appears with correct settings (message, colors, icon, font)
- [ ] Timer counts down accurately (same in incognito/different browsers)
- [ ] CTA button navigates to correct link
- [ ] Discount code badge shows with "Copy" button
- [ ] Close button dismisses bar (persists via sessionStorage)
- [ ] All 3 end actions work when timer reaches 0
- [ ] Page targeting includes/excludes correctly
- [ ] No console errors in any scenario

### Theme Extension Blocks

- [ ] Countdown Bar embed installs via App Embeds in Theme Editor
- [ ] Product Timer block installs via Add Block on product pages
- [ ] Product Timer shows low stock alert when configured
- [ ] Cart Timer block installs via Add Block on cart page
- [ ] Cart Timer only shows when cart has items

### Analytics

- [ ] Impression, click, close events tracked on storefront
- [ ] Analytics page shows correct totals and CTR
- [ ] Date range filter (7d/30d/90d) works
- [ ] CTR shows "—" with 0 impressions (no NaN)

### API & Security

- [ ] Settings API rejects invalid/missing shop params
- [ ] Track API accepts valid events, rejects invalid
- [ ] Rate limiter blocks after 60 req/min per IP
- [ ] Rate limiter blocks after 120 req/min per shop
- [ ] All API responses include CORS headers

### Accessibility

- [ ] ARIA attributes present on bar, timer, buttons, icon
- [ ] Touch targets meet 44px minimum (close button, CTA)
- [ ] Reduced motion disables all animations
- [ ] Keyboard navigation works for CTA and close buttons

### Mobile

- [ ] Storefront bar: no overflow at 320px
- [ ] Admin pages: forms and cards stack on small screens

### Billing

- [ ] Free and Pro plan cards render correctly
- [ ] Upgrade button shows appropriate response (dev vs. production)
