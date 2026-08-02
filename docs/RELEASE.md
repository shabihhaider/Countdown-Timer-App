# Release Process

## Versioning

Semantic versioning: `MAJOR.MINOR.PATCH`

| Type  | When                                      |
| ----- | ----------------------------------------- |
| PATCH | Bug fixes, security patches, copy changes |
| MINOR | New features, non-breaking schema changes |
| MAJOR | Breaking changes, full redesigns          |

## Release Checklist

### Before Every Release

- [ ] All tests pass: `npm run test`
- [ ] No TypeScript errors: `npm run typecheck` (after TS migration)
- [ ] ESLint clean: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Prisma migrations in sync: `npx prisma migrate status`
- [ ] Changelog updated (see format below)
- [ ] `shopify.app.toml` api_version is current

### Before Minor/Major Release

- [ ] Tested on Dawn, Debut, Refresh themes
- [ ] Tested on iOS Safari + Android Chrome
- [ ] Lighthouse performance delta measured and < 10 points
- [ ] Accessibility: `axe-playwright` scan passes with 0 violations
- [ ] Security checklist in `SECURITY.md` reviewed

### Deployment (Vercel)

Deployments are automatic on `git push` to `main` branch via Vercel CI.

Before pushing to main:

```bash
npm run build
npx prisma generate
git push origin main
```

After deployment:

1. Verify Vercel deployment succeeded
2. Run `npx prisma migrate deploy` against production DB if new migration
3. Test critical flows on production:
   - Admin settings save → storefront update
   - Analytics tracking

## Changelog Format

```markdown
## [1.1.0] — 2024-11-01

### Added

- Analytics dashboard with impressions, clicks, CTR
- Multiple campaigns support

### Fixed

- Timer no longer resets on page refresh (UTC-based)
- Close button touch target now 44×44px

### Removed

- Dead code: star_rating.liquid, app.additional.jsx
```

## Rollback Plan

If a production bug is found:

1. Identify last good commit: `git log --oneline`
2. Revert: `git revert HEAD` or deploy previous Vercel deployment
3. If DB migration is involved: restore from backup before reverting

## Version History

| Version | Date       | Description                                           |
| ------- | ---------- | ----------------------------------------------------- |
| 0.1.0   | 2024-08-01 | Initial MVP with countdown bar                        |
| 1.0.0   | 2024-11-01 | Launch: onboarding, analytics, UTC timers, validation |
