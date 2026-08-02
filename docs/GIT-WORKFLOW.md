# Git Workflow

## Branches

| Branch    | Purpose               | Deploys To        |
| --------- | --------------------- | ----------------- |
| `main`    | Production-ready code | Vercel Production |
| `develop` | Integration branch    | Vercel Preview    |
| `feat/*`  | New features          | —                 |
| `fix/*`   | Bug fixes             | —                 |
| `chore/*` | Tooling, deps, docs   | —                 |

## Commit Messages

Enforced by commitlint (Conventional Commits):

```
feat: add live preview panel to settings
fix: prevent past dates in end date picker
refactor: extract color conversion utilities
docs: add QA testing guide
test: add rate limiter unit tests
chore: update dependencies
perf: optimize countdown bar DOM updates
ci: add container security scanning
```

Subject must be lowercase, max 100 characters.

## Pull Request Process

1. Create a feature branch from `develop`
2. Make changes, commit with conventional format
3. Push and open a PR to `develop`
4. CI must pass (lint, typecheck, tests, e2e, build)
5. Review and merge
6. When ready to release: merge `develop` → `main`
7. Tag the release: `git tag v1.x.x`

## Release Process

1. Merge `develop` → `main` via PR
2. Vercel auto-deploys to production
3. Verify `https://countdown-timer-app-sage.vercel.app/health`
4. Tag the release:
   ```bash
   git tag -a v1.x.x -m "Release v1.x.x: description"
   git push origin v1.x.x
   ```
5. Deploy Shopify extension (if changed):
   ```bash
   npx shopify app deploy
   ```

## Hotfix Process

1. Branch from `main`: `git checkout -b fix/critical-bug main`
2. Fix, commit, push
3. PR to `main` (expedited review)
4. After merge: cherry-pick to `develop`
