# Rollback Procedures

## Vercel App Rollback (Instant)

### Via Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com) → countdown-timer-app → Deployments
2. Find the last known-good deployment
3. Click the three dots → **Promote to Production**
4. The rollback is instant (< 5 seconds)

### Via CLI

```bash
# List recent deployments
npx vercel ls

# Rollback to a specific deployment
npx vercel rollback [deployment-url]
```

## Database Rollback

### Neon Point-in-Time Recovery

Neon PostgreSQL provides automatic PITR on all plans:

1. Go to [Neon Console](https://console.neon.tech) → Your project → Branches
2. Click **Create Branch** → select a point in time before the issue
3. Update `DATABASE_URL` in Vercel to point to the new branch
4. Redeploy

### Pre-Migration Backup

Always create a backup before running migrations on production:

```bash
# Local Docker database
./scripts/db-backup.sh

# Production (Neon) — use Neon's branching instead
# Create a branch in the Neon console before running migrations
```

## Emergency Checklist

1. **Identify the issue** — check Vercel logs, health endpoint, error reports
2. **Rollback the app** — Vercel instant rollback (dashboard or CLI)
3. **Verify rollback** — check `https://countdown-timer-app-sage.vercel.app/health`
4. **Assess data impact** — check if a database rollback is also needed
5. **If database rollback needed** — create Neon branch from before the issue
6. **Notify stakeholders** — update status page, inform affected merchants
7. **Root cause analysis** — investigate and document what went wrong
8. **Fix forward** — create a proper fix, test, and deploy normally
