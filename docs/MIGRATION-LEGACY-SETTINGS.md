# Legacy Settings Migration Plan

## Background

The app originally stored all campaign data in a single `Setting` model as a JSON blob:

```
Setting { shop: string (unique), value: string (JSON) }
```

The v1.0 rebuild added a typed `Campaign` model. The settings API (`/apps/countdown/settings`)
reads from `Campaign` first and falls back to `Setting` for backward compatibility.

## Current State

- New installs: use `Campaign` model exclusively
- Pre-v1.0 installs: still use `Setting` model (read-only fallback)
- Both models coexist safely

## Migration Steps (Future)

### Step 1: Write migration script

```javascript
// scripts/migrate-legacy-settings.js
// For each Setting row:
//   1. Parse the JSON value
//   2. Create a Campaign record with the same data
//   3. Delete the Setting row
```

### Step 2: Run migration on production

```bash
npx prisma db execute --file scripts/migrate-legacy-settings.js
```

### Step 3: Remove fallback code

Remove the `Setting` fallback in `apps.countdown.settings.jsx` (lines 57-62).

### Step 4: Drop the Setting table

```bash
npx prisma migrate dev --name drop_legacy_setting_table
```

## Timeline

- Wait until all pre-v1.0 merchants have migrated (track via analytics)
- Or force-migrate after 90 days with a scheduled script
