# Git Workflow

## Branches

We use a simple trunk-based flow: short-lived branches off `main`, merged
back via PR. There is no long-lived `develop` integration branch.

| Branch    | Purpose               | Deploys To        |
| --------- | --------------------- | ----------------- |
| `main`    | Production-ready code | Vercel Production |
| `feat/*`  | New features          | —                 |
| `fix/*`   | Bug fixes             | —                 |
| `chore/*` | Tooling, deps, docs   | —                 |

`main` auto-deploys to Vercel Production on every push/merge.

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

1. Create a short-lived branch from `main` (`feat/*`, `fix/*`, `chore/*`)
2. Make changes, commit with conventional format
3. Push and open a PR to `main`
4. CI must pass (lint, typecheck, tests, e2e, build)
5. Review and merge — Vercel auto-deploys `main` to production

## Release Process

See [docs/RELEASE.md](RELEASE.md) for the release checklist, tagging, and
Shopify extension deployment steps.

## Hotfix Process

1. Branch from `main`: `git checkout -b fix/critical-bug main`
2. Fix, commit, push
3. PR to `main` (expedited review)
4. Merge — `main` auto-deploys to production
