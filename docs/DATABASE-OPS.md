# Database Operations

## Connection Details

| Environment    | Provider             | Connection                                                      |
| -------------- | -------------------- | --------------------------------------------------------------- |
| Local (Docker) | PostgreSQL 16 Alpine | `postgresql://postgres:password@localhost:5432/countdown_timer` |
| Production     | Neon PostgreSQL      | Pooler URL in Vercel env vars                                   |
| Staging        | Neon branch          | Separate branch URL                                             |

## Migrations

### Apply pending migrations (production-safe)

```bash
# Docker
docker compose exec app npx prisma migrate deploy

# Host
npx prisma migrate deploy
```

### Create a new migration (development only)

```bash
docker compose exec app npx prisma migrate dev --name describe_the_change
```

### Check migration status

```bash
npx prisma migrate status
```

## Backups

### Docker (local)

```bash
./scripts/db-backup.sh              # saves to ./backups/
./scripts/db-backup.sh /tmp/backups  # custom output dir
```

### Production (Neon)

Use Neon's built-in branching for point-in-time recovery:

1. Go to Neon Console → Branches
2. Create a branch from the desired point in time
3. Connect to the branch to verify data

## Seed Data

### Seed the development database

```bash
# Docker
docker compose exec app npx prisma db seed

# Host
npx prisma db seed
```

### Reset and re-seed (DESTRUCTIVE)

```bash
docker compose exec app npx prisma migrate reset --force
```

This drops all tables, re-applies migrations, and runs the seed script.

## Useful Queries

### Check campaign count per shop

```sql
SELECT shop, COUNT(*) as campaigns,
       SUM(CASE WHEN "isActive" THEN 1 ELSE 0 END) as active
FROM "Campaign"
GROUP BY shop;
```

### Check analytics totals

```sql
SELECT c.shop, c.name,
       SUM(a.impressions) as total_impressions,
       SUM(a.clicks) as total_clicks
FROM "Campaign" c
LEFT JOIN "CampaignAnalytics" a ON a."campaignId" = c.id
GROUP BY c.shop, c.name;
```
