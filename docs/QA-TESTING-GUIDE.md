# QA Testing Guide — Countdown Timer App

> **Version:** 1.0
> **Last Updated:** August 2, 2026
> **Environment:** Docker (Node 20 + PostgreSQL 16 + Redis 7)
> **Prerequisite:** A Shopify Partner account with a development store

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Service Health Verification](#2-service-health-verification)
3. [Landing Page Tests](#3-landing-page-tests)
4. [Privacy Policy Page Tests](#4-privacy-policy-page-tests)
5. [Terms of Service Page Tests](#5-terms-of-service-page-tests)
6. [Shopify OAuth & App Install](#6-shopify-oauth--app-install)
7. [Onboarding Flow Tests](#7-onboarding-flow-tests)
8. [Settings Page Tests (Campaign Configuration)](#8-settings-page-tests-campaign-configuration)
9. [Campaigns Page Tests](#9-campaigns-page-tests)
10. [Analytics Page Tests](#10-analytics-page-tests)
11. [Storefront Countdown Bar Tests](#11-storefront-countdown-bar-tests)
12. [Public API Tests](#12-public-api-tests)
13. [Rate Limiting Tests](#13-rate-limiting-tests)
14. [Accessibility Tests](#14-accessibility-tests)
15. [Mobile Responsiveness Tests](#15-mobile-responsiveness-tests)
16. [Automated Test Suite](#16-automated-test-suite)
17. [Test Data Reference](#17-test-data-reference)

---

## 1. Environment Setup

### 1.1 Start the Docker Stack

```bash
# First time only — create .env from template
make setup-env

# Edit .env and add your Shopify credentials
# SHOPIFY_API_KEY=your_key_here
# SHOPIFY_API_SECRET=your_secret_here

# Start all services
make dev-d

# Verify everything is healthy
make health-check
```

### 1.2 Connect to a Development Store

1. Go to your [Shopify Partner Dashboard](https://partners.shopify.com)
2. Create or select a development store
3. In the terminal, run:
   ```bash
   make shell
   npx shopify app dev
   ```
4. Follow the prompts to select your store
5. Copy the generated tunnel URL (or use `make dev-tunnel`)
6. The app will open in your development store's admin

### 1.3 Verify Services Are Running

| Service            | How to Check                                 | Expected                               |
| ------------------ | -------------------------------------------- | -------------------------------------- |
| App                | Open http://localhost:3000                   | Landing page loads                     |
| Health             | Open http://localhost:3000/health            | `{"status":"ok","timestamp":"..."}`    |
| PostgreSQL         | `make db-shell` then `\dt`                   | Lists Session, Setting, Campaign, etc. |
| Redis              | `make redis-cli` then `PING`                 | `PONG`                                 |
| Adminer (optional) | `make dev-tools`, open http://localhost:8888 | DB browser UI                          |

---

## 2. Service Health Verification

### TEST 2.1: Health Endpoint Returns 200

| Step | Action                                       | Expected Result                            |
| ---- | -------------------------------------------- | ------------------------------------------ |
| 1    | Open browser: `http://localhost:3000/health` | Page loads with JSON                       |
| 2    | Check JSON content                           | `{"status":"ok","timestamp":"<ISO date>"}` |
| 3    | Check browser Network tab → Response Headers | `Cache-Control: no-store`                  |
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

| Step | Action                                               | Expected Result                           |
| ---- | ---------------------------------------------------- | ----------------------------------------- |
| 1    | Leave field empty, click "Log in"                    | Form submits (Shopify handles validation) |
| 2    | Type `my-store.myshopify.com`, click "Log in"        | Redirects to Shopify OAuth                |
| 3    | Type invalid text like `not-a-store`, click "Log in" | Shopify shows error page                  |

### TEST 3.3: Footer Links

| Step | Action                   | Expected Result         |
| ---- | ------------------------ | ----------------------- |
| 1    | Click "Privacy Policy"   | Opens `/privacy` page   |
| 2    | Click "Terms of Service" | Opens `/terms` page     |
| 3    | Use browser back button  | Returns to landing page |

---

## 4. Privacy Policy Page Tests

**URL:** `http://localhost:3000/privacy`

### TEST 4.1: Page Renders Without Error

| Step | Action                               | Expected Result                                |
| ---- | ------------------------------------ | ---------------------------------------------- |
| 1    | Open `http://localhost:3000/privacy` | Page loads — NO red "Application Error" screen |
| 2    | Check heading                        | "Privacy Policy" in large bold text            |
| 3    | Check date line                      | "Last updated: August 1, 2026" in gray         |
| 4    | Check section count                  | 10 numbered sections visible                   |

### TEST 4.2: Required Content Sections

Scroll through the page and verify each section exists:

| Section | Title                     | Key Content                                                      |
| ------- | ------------------------- | ---------------------------------------------------------------- |
| 1       | Introduction              | Mentions "Countdown Timer Bar" and "Shopify application"         |
| 2       | Information We Collect    | 3 bullet points: Shop domain, App settings, Shopify session data |
| 3       | How We Use Information    | 3 bullet points: authenticate, store settings, support           |
| 4       | Data Storage and Security | Mentions PostgreSQL, HTTPS, retention policy                     |
| 5       | Data Deletion             | Mentions app/uninstalled webhook, manual deletion option         |
| 6       | GDPR (European Users)     | 4 rights: access, rectification, erasure, portability            |
| 7       | CCPA (California Users)   | Right to know, right to delete                                   |
| 8       | Third-Party Services      | Mentions Shopify, states "no third-party analytics"              |
| 9       | Changes to This Policy    | Update notification method                                       |
| 10      | Contact                   | Email link: `support@countdown-timer-app.com`                    |

### TEST 4.3: Contact Links

| Step | Action                                          | Expected Result                                                  |
| ---- | ----------------------------------------------- | ---------------------------------------------------------------- |
| 1    | Click any email link                            | Opens email client with `mailto:support@countdown-timer-app.com` |
| 2    | Check all 3 email links work (sections 5, 6, 7) | All open mailto link                                             |

---

## 5. Terms of Service Page Tests

**URL:** `http://localhost:3000/terms`

### TEST 5.1: Page Renders Without Error

| Step | Action                             | Expected Result                       |
| ---- | ---------------------------------- | ------------------------------------- |
| 1    | Open `http://localhost:3000/terms` | Page loads — NO red error screen      |
| 2    | Check heading                      | "Terms of Service" in large bold text |
| 3    | Check section count                | 12 numbered sections visible          |

### TEST 5.2: Key Sections

| Section | Title                     | Key Content                                                           |
| ------- | ------------------------- | --------------------------------------------------------------------- |
| 1       | Acceptance of Terms       | "By installing or using..."                                           |
| 4       | Merchant Responsibilities | 4 bullet points including "Not create countdown timers with false..." |
| 7       | Disclaimers               | ALL CAPS legal text ("AS IS" WITHOUT WARRANTY)                        |
| 12      | Contact                   | Email link present                                                    |

---

## 6. Shopify OAuth & App Install

> **Requires:** Development store connected via `shopify app dev`

### TEST 6.1: First Install Flow

| Step | Action                                   | Expected Result                           |
| ---- | ---------------------------------------- | ----------------------------------------- |
| 1    | Open the app URL in your dev store admin | Shopify OAuth screen appears              |
| 2    | Click "Install app"                      | App installs successfully                 |
| 3    | Check scopes requested                   | Only `write_themes` — no `write_products` |
| 4    | App redirects to...                      | The main settings page (`/app`)           |

### TEST 6.2: Session Persistence

| Step | Action                                | Expected Result                     |
| ---- | ------------------------------------- | ----------------------------------- |
| 1    | Close the browser tab                 | —                                   |
| 2    | Open the app again from Shopify admin | App loads without re-authenticating |
| 3    | Check the Shopify admin header        | App name and navigation visible     |

---

## 7. Onboarding Flow Tests

**URL:** `https://<your-store>.myshopify.com/admin/apps/<app-name>/app/onboarding`

### TEST 7.1: Initial State

| Step | Action                   | Expected Result            |
| ---- | ------------------------ | -------------------------- |
| 1    | Open the Onboarding page | 3 steps displayed          |
| 2    | Check progress bar       | 0% (empty)                 |
| 3    | Check progress text      | "0 of 3 steps complete"    |
| 4    | Step 1 badge             | "Pending" (attention tone) |
| 5    | Step 2 badge             | "Pending" (attention tone) |
| 6    | Step 3 badge             | "Pending" (attention tone) |

### TEST 7.2: Step 1 & 2 Completion

| Step | Action                                    | Expected Result                         |
| ---- | ----------------------------------------- | --------------------------------------- |
| 1    | Click "Configure Campaign" button         | Navigates to /app (settings page)       |
| 2    | Fill in the settings form (see Section 8) | Settings saved                          |
| 3    | Go back to /app/onboarding                | Step 1 shows "Complete" (success badge) |
| 4    | Step 2 also shows "Complete"              | Both marked done simultaneously         |
| 5    | Progress bar                              | 66% filled                              |
| 6    | Progress text                             | "2 of 3 steps complete"                 |

### TEST 7.3: Step 3 — Theme Installation

| Step | Action                              | Expected Result                                       |
| ---- | ----------------------------------- | ----------------------------------------------------- |
| 1    | Click "Open Theme Editor" button    | New browser tab opens with theme editor URL           |
| 2    | In theme editor: go to App Embeds   | Countdown Timer embed should be listed                |
| 3    | Toggle the embed ON                 | Embed activates                                       |
| 4    | Go back to Onboarding page          | —                                                     |
| 5    | Click "Mark Extension as Installed" | Step 3 badge changes to "Complete"                    |
| 6    | Progress bar                        | 100% filled                                           |
| 7    | Progress text                       | "3 of 3 steps complete"                               |
| 8    | Success banner                      | "Your countdown timer is live!" banner appears at top |

### TEST 7.4: Completed State Persistence

| Step | Action                        | Expected Result                   |
| ---- | ----------------------------- | --------------------------------- |
| 1    | Navigate away from onboarding | —                                 |
| 2    | Come back to /app/onboarding  | All 3 steps still show "Complete" |
| 3    | Progress bar still 100%       | State persisted in database       |

---

## 8. Settings Page Tests (Campaign Configuration)

**URL:** `/app` (inside Shopify admin)

### TEST 8.1: Default Values on First Load

| Field               | Expected Default                                   |
| ------------------- | -------------------------------------------------- |
| Bar Message         | "Flash Sale Ends In..."                            |
| Button Text         | "Shop Now"                                         |
| Button Link         | "/collections/all"                                 |
| End Date            | Empty                                              |
| Bar Color           | Green (#288d40)                                    |
| Bar Position        | Top selected                                       |
| When Countdown Ends | "Hide the bar" selected                            |
| Custom End Message  | Not visible (only shows for "Show custom message") |

### TEST 8.2: Bar Message Validation

| Test               | Input                          | Action     | Expected Result                                            |
| ------------------ | ------------------------------ | ---------- | ---------------------------------------------------------- |
| Empty message      | Clear the field                | Click Save | Red banner: "Bar message is required."                     |
| 200 char limit     | Type 201 characters            | Click Save | Red banner: "Bar message must be 200 characters or fewer." |
| Exactly 200 chars  | Type 200 characters            | Click Save | Saves successfully (toast: "Settings saved")               |
| Normal message     | "Black Friday Sale — 50% OFF!" | Click Save | Saves successfully                                         |
| Special characters | `<script>alert(1)</script>`    | Click Save | Saves as plain text (no XSS)                               |

### TEST 8.3: End Date Validation

| Test         | Input                   | Action     | Expected Result                               |
| ------------ | ----------------------- | ---------- | --------------------------------------------- |
| No date      | Leave empty             | Click Save | Red banner: "End date is required."           |
| Past date    | Set to yesterday        | Click Save | Red banner: "End date must be in the future." |
| Current time | Set to right now        | Click Save | Red banner: "End date must be in the future." |
| Future date  | Set to tomorrow         | Click Save | Saves successfully                            |
| Far future   | Set to 2027-12-31 23:59 | Click Save | Saves successfully                            |

### TEST 8.4: Button Link Validation

| Test                 | Input                      | Action     | Expected Result                                      |
| -------------------- | -------------------------- | ---------- | ---------------------------------------------------- |
| Relative path        | `/collections/all`         | Click Save | Saves successfully                                   |
| Root path            | `/`                        | Click Save | Saves successfully                                   |
| HTTPS URL            | `https://mystore.com/sale` | Click Save | Saves successfully                                   |
| HTTP URL (not HTTPS) | `http://mystore.com`       | Click Save | Red banner: "Button link must be a relative path..." |
| Protocol-relative    | `//evil.com`               | Click Save | Red banner: "Button link must be a relative path..." |
| JavaScript injection | `javascript:alert(1)`      | Click Save | Red banner: "Button link must be a relative path..." |
| Empty (optional)     | Leave blank                | Click Save | Saves successfully (button hidden on storefront)     |

### TEST 8.5: Color Picker

| Test                  | Action                        | Expected Result                    |
| --------------------- | ----------------------------- | ---------------------------------- |
| Pick color via picker | Drag the color picker         | Hex input updates to match         |
| Type hex manually     | Type `#ff0000` in hex input   | Color picker updates to red        |
| Type 3-char hex       | Type `#f00` in hex input      | Color picker updates to red        |
| Invalid hex           | Type `xyz`                    | Defaults to `#288d40` (green)      |
| Preview box           | Look at the color preview box | Shows the selected color (80x36px) |

### TEST 8.6: Bar Position

| Test                 | Action                | Expected Result                  |
| -------------------- | --------------------- | -------------------------------- |
| Select "Top"         | Click Top radio       | Saves with position = top        |
| Select "Bottom"      | Click Bottom radio    | Saves with position = bottom     |
| Verify on storefront | Check live storefront | Bar appears in selected position |

### TEST 8.7: End Action (When Countdown Ends)

| Test                         | Action                                        | Expected Result                                 |
| ---------------------------- | --------------------------------------------- | ----------------------------------------------- |
| Select "Hide the bar"        | Choose from dropdown                          | Saves. No custom message field shown.           |
| Select "Show 'Sale Ended'"   | Choose from dropdown                          | Saves. No custom message field shown.           |
| Select "Show custom message" | Choose from dropdown                          | Custom End Message text field APPEARS           |
| Custom msg required          | Select "Show custom message", leave msg empty | Red banner: "Custom end message is required..." |
| Custom msg filled            | Type "Thanks for shopping!"                   | Saves successfully                              |

### TEST 8.8: Save & Toast Notifications

| Test            | Action                            | Expected Result                                     |
| --------------- | --------------------------------- | --------------------------------------------------- |
| Successful save | Fill valid data, click Save       | Green toast: "Settings saved" (4 seconds)           |
| Failed save     | Submit with errors                | No toast. Red banner at top with all errors listed. |
| Loading state   | Click Save and watch button       | Button shows spinner/loading while submitting       |
| Multiple errors | Leave message empty + no end date | Banner shows BOTH errors in a bulleted list         |

---

## 9. Campaigns Page Tests

**URL:** `/app/campaigns` (inside Shopify admin)

### TEST 9.1: Empty State

| Step | Action                                | Expected Result                                                   |
| ---- | ------------------------------------- | ----------------------------------------------------------------- |
| 1    | Open Campaigns page with no campaigns | "No campaigns yet" heading                                        |
| 2    | Check empty message                   | "Create your first countdown timer to start driving conversions." |
| 3    | Click the action button               | Navigates to /app (settings page)                                 |

### TEST 9.2: Campaign List Display

| Step | Action                              | Expected Result                    |
| ---- | ----------------------------------- | ---------------------------------- |
| 1    | Create a campaign via Settings page | —                                  |
| 2    | Open Campaigns page                 | Campaign appears in list           |
| 3    | Check campaign name                 | "My Sale" (default) or custom name |
| 4    | Check status badge                  | "Active" (green badge)             |
| 5    | Check bar message excerpt           | Shows the bar message text         |
| 6    | Check end date                      | "Ends: MM/DD/YYYY HH:MM" format    |

### TEST 9.3: Toggle Campaign Active/Inactive

| Step | Action                                    | Expected Result                     |
| ---- | ----------------------------------------- | ----------------------------------- |
| 1    | Click "Deactivate" on an active campaign  | Button shows loading state          |
| 2    | After submission                          | Badge changes to "Inactive"         |
| 3    | Click "Activate" on the inactive campaign | Badge changes back to "Active"      |
| 4    | Visit the storefront                      | Bar only shows for active campaigns |

### TEST 9.4: Delete Campaign

| Step | Action                                    | Expected Result                                    |
| ---- | ----------------------------------------- | -------------------------------------------------- |
| 1    | Click "Delete" (red button) on a campaign | Button shows loading state                         |
| 2    | After submission                          | Campaign disappears from list                      |
| 3    | Check database (Adminer or Prisma Studio) | Campaign row is deleted                            |
| 4    | Check CampaignAnalytics                   | Analytics for that campaign also deleted (CASCADE) |

### TEST 9.5: New Campaign Button

| Step | Action                              | Expected Result                 |
| ---- | ----------------------------------- | ------------------------------- |
| 1    | Click "New Campaign" in page header | Navigates to /app settings page |

---

## 10. Analytics Page Tests

**URL:** `/app/analytics` (inside Shopify admin)

### TEST 10.1: Empty State (No Campaigns)

| Step | Action                           | Expected Result                                              |
| ---- | -------------------------------- | ------------------------------------------------------------ |
| 1    | Open Analytics with no campaigns | "No data yet" heading                                        |
| 2    | Check message                    | "Your analytics will appear here once your timer is live..." |

### TEST 10.2: Metrics Display

| Step | Action                                  | Expected Result                        |
| ---- | --------------------------------------- | -------------------------------------- |
| 1    | Have an active campaign with some views | —                                      |
| 2    | Open Analytics page                     | 3 metric cards visible                 |
| 3    | Total Impressions card                  | Shows formatted number (e.g., "1,234") |
| 4    | Total Clicks card                       | Shows formatted number                 |
| 5    | Click-Through Rate card                 | Shows percentage (e.g., "3.2%")        |
| 6    | CTR with 0 impressions                  | Shows "—" (dash) instead of "NaN%"     |

### TEST 10.3: Campaign Table

| Step | Action                | Expected Result                            |
| ---- | --------------------- | ------------------------------------------ |
| 1    | Check table headers   | Campaign, Status, Impressions, Clicks, CTR |
| 2    | Active campaign row   | Green "Active" badge                       |
| 3    | Inactive campaign row | "Inactive" badge (no green)                |
| 4    | Number formatting     | Thousands separated (e.g., "12,345")       |
| 5    | Table footer          | "Showing X campaign(s)"                    |

### TEST 10.4: 30-Day Window

| Step | Action               | Expected Result                 |
| ---- | -------------------- | ------------------------------- |
| 1    | Check analytics data | Only last 30 days of data shown |
| 2    | Older data           | Not included in totals          |

---

## 11. Storefront Countdown Bar Tests

> **Requires:** Campaign active + theme extension installed

### TEST 11.1: Bar Appears on Storefront

| Step | Action                                      | Expected Result             |
| ---- | ------------------------------------------- | --------------------------- |
| 1    | Create active campaign with future end date | —                           |
| 2    | Enable theme extension in Theme Editor      | —                           |
| 3    | Visit your development store front page     | Countdown bar visible       |
| 4    | Check bar color                             | Matches configured color    |
| 5    | Check bar message                           | Matches configured message  |
| 6    | Check bar position                          | Top or bottom as configured |

### TEST 11.2: Timer Countdown

| Step | Action                           | Expected Result                          |
| ---- | -------------------------------- | ---------------------------------------- |
| 1    | Check timer display              | Shows DD:HH:MM:SS format                 |
| 2    | Wait 1 second                    | Seconds value decrements by 1            |
| 3    | Check timer accuracy             | Matches server-side end date (UTC-based) |
| 4    | Open in incognito/private window | Same timer values (UTC, not faked)       |
| 5    | Open in different browser        | Same timer values                        |

### TEST 11.3: CTA Button

| Step | Action                        | Expected Result                            |
| ---- | ----------------------------- | ------------------------------------------ |
| 1    | Check button visibility       | Shows if buttonText is configured          |
| 2    | Check button text             | Matches configured text (e.g., "Shop Now") |
| 3    | Click button                  | Navigates to configured link               |
| 4    | Remove buttonText in settings | Button disappears from bar                 |

### TEST 11.4: Close Button

| Step | Action                    | Expected Result                   |
| ---- | ------------------------- | --------------------------------- |
| 1    | Click the X close button  | Bar slides up/down and disappears |
| 2    | Refresh the page          | Bar stays hidden (sessionStorage) |
| 3    | Open new incognito window | Bar appears again (fresh session) |
| 4    | Check sessionStorage key  | `cdb_closed_<shop-domain>` = "1"  |

### TEST 11.5: End Actions

| Test           | Configuration             | After Timer Reaches 0                        |
| -------------- | ------------------------- | -------------------------------------------- |
| Hide           | endAction = "hide"        | Bar disappears completely                    |
| Show Ended     | endAction = "show_ended"  | Timer hides, message changes to "Sale Ended" |
| Custom Message | endAction = "show_custom" | Timer hides, message changes to custom text  |

**Quick test:** Set end date to 2 minutes from now and wait.

### TEST 11.6: No Active Campaign

| Step | Action                   | Expected Result                                        |
| ---- | ------------------------ | ------------------------------------------------------ |
| 1    | Deactivate all campaigns | —                                                      |
| 2    | Visit storefront         | Bar does NOT appear                                    |
| 3    | Check Network tab        | `/apps/countdown/settings` returns `{"success":false}` |

### TEST 11.7: CSS Class Isolation

| Step | Action                    | Expected Result                          |
| ---- | ------------------------- | ---------------------------------------- |
| 1    | Inspect bar HTML          | All classes start with `cdb-` or `cdb__` |
| 2    | Check for style conflicts | No collision with theme CSS              |

---

## 12. Public API Tests

Use a tool like **Postman**, **curl**, or the **browser console**.

### TEST 12.1: Settings API — Valid Request

```bash
curl "http://localhost:3000/apps/countdown/settings?shop=your-store.myshopify.com"
```

| Expected | Value                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------- |
| Status   | 200                                                                                             |
| Body     | `{"success":true,"settings":{...}}` or `{"success":false,"message":"No active campaign found"}` |
| Header   | `Access-Control-Allow-Origin: *`                                                                |
| Header   | `Cache-Control: public, max-age=60, stale-while-revalidate=30`                                  |

### TEST 12.2: Settings API — Missing Shop

```bash
curl "http://localhost:3000/apps/countdown/settings"
```

| Expected | Value                                                    |
| -------- | -------------------------------------------------------- |
| Status   | 400                                                      |
| Body     | `{"success":false,"error":"Shop parameter is required"}` |

### TEST 12.3: Settings API — Invalid Shop

```bash
curl "http://localhost:3000/apps/countdown/settings?shop=../../../../etc/passwd"
```

| Expected | Value                                                |
| -------- | ---------------------------------------------------- |
| Status   | 400                                                  |
| Body     | `{"success":false,"error":"Invalid shop parameter"}` |

### TEST 12.4: Settings API — XSS in Shop

```bash
curl "http://localhost:3000/apps/countdown/settings?shop=<script>alert(1)</script>"
```

| Expected | Value                                                |
| -------- | ---------------------------------------------------- |
| Status   | 400                                                  |
| Body     | `{"success":false,"error":"Invalid shop parameter"}` |

### TEST 12.5: Track API — Valid Event

```bash
curl -X POST http://localhost:3000/apps/countdown/track \
  -H "Content-Type: application/json" \
  -d '{"shop":"your-store.myshopify.com","event":"impression"}'
```

| Expected | Value              |
| -------- | ------------------ |
| Status   | 200                |
| Body     | `{"success":true}` |

### TEST 12.6: Track API — Invalid Event Type

```bash
curl -X POST http://localhost:3000/apps/countdown/track \
  -H "Content-Type: application/json" \
  -d '{"shop":"your-store.myshopify.com","event":"purchase"}'
```

| Expected | Value                       |
| -------- | --------------------------- |
| Status   | 400                         |
| Body     | `{"error":"Invalid event"}` |

### TEST 12.7: Track API — GET Request (CORS Preflight)

```bash
curl -X GET http://localhost:3000/apps/countdown/track
```

| Expected | Value                                         |
| -------- | --------------------------------------------- |
| Status   | 204                                           |
| Header   | `Access-Control-Allow-Origin: *`              |
| Header   | `Access-Control-Allow-Methods: POST, OPTIONS` |

### TEST 12.8: Track API — Valid Event Types

Test all 3 event types with the same curl format:

| Event          | Expected Status |
| -------------- | --------------- |
| `"impression"` | 200             |
| `"click"`      | 200             |
| `"close"`      | 200             |
| `"purchase"`   | 400 (invalid)   |
| `""`           | 400 (invalid)   |

---

## 13. Rate Limiting Tests

### TEST 13.1: Under the Limit

```bash
# Send 60 requests rapidly
for i in $(seq 1 60); do
  curl -s -o /dev/null -w "%{http_code} " \
    "http://localhost:3000/apps/countdown/settings?shop=test.myshopify.com"
done
```

| Expected | All 60 return `200` |
| -------- | ------------------- |

### TEST 13.2: Over the Limit

```bash
# Send 70 requests rapidly
for i in $(seq 1 70); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:3000/apps/countdown/settings?shop=rate-test.myshopify.com")
  echo "$i: $STATUS"
done
```

| Expected | Requests 1–60 return `200`, requests 61+ return `429` |
| -------- | ----------------------------------------------------- |

### TEST 13.3: Rate Limit Headers

```bash
curl -v "http://localhost:3000/apps/countdown/settings?shop=rate-test.myshopify.com" 2>&1 | grep -i "retry-after"
```

| Expected (after 429) | `Retry-After: 60` header present |
| -------------------- | -------------------------------- |

---

## 14. Accessibility Tests

### TEST 14.1: Storefront Bar — ARIA

| Check              | How                         | Expected                                                      |
| ------------------ | --------------------------- | ------------------------------------------------------------- |
| Region role        | Inspect `#cdb-bar`          | `role="region"` + `aria-label="Countdown timer announcement"` |
| Timer role         | Inspect `#cdb-timer`        | `role="timer"` + `aria-live="off"`                            |
| Screen reader text | Inspect `.cdb__sr-timer`    | `aria-live="polite"` + updates every minute                   |
| Close button label | Inspect `#cdb-close`        | `aria-label="Close countdown bar"`                            |
| SVG hidden         | Inspect close button SVG    | `aria-hidden="true"` + `focusable="false"`                    |
| Digit spans hidden | Inspect `.cdb__value` spans | `aria-hidden="true"`                                          |

### TEST 14.2: Touch Targets

| Element      | How to Check            | Expected Min Size   |
| ------------ | ----------------------- | ------------------- |
| Close button | Inspect computed styles | 44px x 44px minimum |
| CTA button   | Inspect computed styles | min-height: 44px    |

### TEST 14.3: Reduced Motion

| Step | Action                                              | Expected Result                                               |
| ---- | --------------------------------------------------- | ------------------------------------------------------------- |
| 1    | Enable "Reduce motion" in OS accessibility settings | —                                                             |
| 2    | Load storefront with countdown bar                  | Bar appears WITHOUT slide animation                           |
| 3    | Timer runs once synchronously                       | No requestAnimationFrame loop                                 |
| 4    | Check CSS                                           | `@media (prefers-reduced-motion: reduce)` disables animations |

### TEST 14.4: Keyboard Navigation

| Step | Action                        | Expected Result                           |
| ---- | ----------------------------- | ----------------------------------------- |
| 1    | Tab to the countdown bar area | Focus moves to CTA button or close button |
| 2    | Press Enter on CTA button     | Navigates to button link                  |
| 3    | Press Enter on close button   | Bar closes                                |
| 4    | Check focus-visible styles    | Visible focus ring on both buttons        |

---

## 15. Mobile Responsiveness Tests

Test at these viewports:

| Device    | Width  | Check                           |
| --------- | ------ | ------------------------------- |
| iPhone SE | 320px  | No horizontal overflow          |
| iPhone 14 | 390px  | Text readable, buttons tappable |
| iPad      | 768px  | Layout adjusts properly         |
| Desktop   | 1440px | Full-width layout               |

### Pages to Test

| Page              | URL              | What to Check                                            |
| ----------------- | ---------------- | -------------------------------------------------------- |
| Landing           | `/`              | Login form centered, features stack vertically on mobile |
| Privacy           | `/privacy`       | Text wraps within viewport, no horizontal scroll         |
| Terms             | `/terms`         | Same as privacy                                          |
| Settings (admin)  | `/app`           | Form fields stack, color picker usable                   |
| Analytics (admin) | `/app/analytics` | Metric cards stack, table scrolls horizontally           |

---

## 16. Automated Test Suite

### 16.1: Run Unit Tests (70 tests)

```bash
make test
```

**Expected output:**

```
Test Files  4 passed (4)
     Tests  70 passed (70)
```

**Covered areas:**

- `countdown.test.js` — pad(), time decomposition, UTC dates, screen reader text (16 tests)
- `color.test.js` — hexToHsb conversion including edge cases (9 tests)
- `validation.test.js` — shop regex, button URL validation, event validation (40 tests)
- `redis.test.js` — rate limiter in-memory fallback (5 tests)

### 16.2: Run E2E Tests (13 tests)

```bash
make test-e2e
```

**Expected output:**

```
13 passed
```

**Covered areas:**

- `health.spec.js` — health endpoint status + headers (2 tests)
- `public-api.spec.js` — settings validation, XSS protection, CORS, track events (11 tests)

### 16.3: Run Full CI Pipeline

```bash
make ci
```

Runs in order: ESLint → Prettier → TypeScript → Unit Tests → E2E Tests

### 16.4: Run Tests with Coverage

```bash
make test-coverage
```

Opens coverage report at `coverage/index.html`.

---

## 17. Test Data Reference

### Valid Shop Domains

```
my-store.myshopify.com
test-shop.myshopify.com
store123.myshopify.com
a.myshopify.com
```

### Invalid Shop Domains (Should Be Rejected)

```
not-a-shop.com
-starts-with-hyphen.myshopify.com
store.shopify.com
<script>alert(1)</script>
../../../../etc/passwd
javascript:alert(1)
```

### Valid Button Links

```
/collections/all
/products/my-product
/
https://example.com
https://mystore.com/sale
```

### Invalid Button Links (Should Be Rejected)

```
http://example.com          (not HTTPS)
//evil.com                  (protocol-relative)
javascript:alert(1)         (XSS)
data:text/html,<script>    (data URI)
ftp://example.com           (wrong protocol)
```

### Valid Analytics Events

```
impression
click
close
```

### Sample Campaign Data for Testing

```
Bar Message:   "Black Friday Sale — 50% OFF Everything!"
Button Text:   "Shop the Sale"
Button Link:   /collections/sale
End Date:      [2 days from now]
Bar Color:     #e63946
Bar Position:  top
End Action:    show_custom
Custom Msg:    "Sale has ended. Stay tuned for next time!"
```

---

## Checklist — Pre-Release QA

- [ ] All services healthy (health endpoint, DB, Redis)
- [ ] Landing page renders correctly (desktop + mobile)
- [ ] Privacy page renders without Polaris error
- [ ] Terms page renders without Polaris error
- [ ] OAuth install flow works on development store
- [ ] Onboarding 3-step flow completes successfully
- [ ] Settings form: all 8 fields save correctly
- [ ] Settings form: all validation errors trigger
- [ ] Color picker and hex input stay synchronized
- [ ] Campaign toggle (activate/deactivate) works
- [ ] Campaign delete removes data and analytics (CASCADE)
- [ ] Analytics shows correct totals and CTR
- [ ] Storefront bar appears with correct settings
- [ ] Timer counts down accurately (UTC-based)
- [ ] Close button dismisses bar (persists via sessionStorage)
- [ ] CTA button navigates to correct link
- [ ] All 3 end actions work when timer reaches 0
- [ ] Settings API rejects invalid shop params + XSS
- [ ] Track API accepts valid events, rejects invalid
- [ ] Rate limiter blocks after 60 requests/minute
- [ ] ARIA attributes present on storefront bar
- [ ] Touch targets meet 44px minimum
- [ ] Reduced motion disables animations
- [ ] No console errors on any page
- [ ] `make test` passes 70/70
- [ ] `make test-e2e` passes 13/13
