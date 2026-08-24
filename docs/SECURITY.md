# Security

## Threat Model

| Threat                       | Risk   | Mitigation                                                        |
| ---------------------------- | ------ | ----------------------------------------------------------------- |
| Malicious `?shop=` injection | Medium | Regex validation: `/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/`  |
| XSS via button URL           | Medium | Server-side validation: only allow `/` or `https://` prefixes     |
| DoS via settings API         | Medium | Redis-backed rate limiter (per-IP + per-shop), in-memory fallback |
| Database enumeration         | Low    | Parameterized queries via Prisma (no raw SQL)                     |
| Session hijacking            | Low    | Shopify OAuth + Prisma session storage (standard pattern)         |
| Secret exposure              | Low    | Secrets in env vars, never in client bundle                       |
| CORS abuse                   | Low    | `*` allowed (needed for storefront) + rate limiting               |

## Input Validation

### Public API Endpoints (storefront-facing)

`GET /apps/countdown/settings`:

- `?shop=` validated against: `/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/`
- Rate limited: 60 requests/min per IP
- Missing shop → 400 Bad Request
- Invalid shop format → 400 Bad Request

`POST /apps/countdown/track`:

- `shop` field validated against same regex
- `event` field validated against allowlist: `["impression", "click", "close"]`
- Invalid body → 400 Bad Request

### Admin Form (settings save)

All fields validated server-side in Remix `action`:

- `barMessage`: required, max 200 chars
- `endDate`: required, must be a valid datetime, must be in the future
- `buttonLink`: if provided, must start with `/` or `https://`
- `barColor`: must match `#[0-9a-fA-F]{6}`, falls back to default if invalid
- `customEndMessage`: required if `endAction === 'show_custom'`

### Shopify Authentication

- Admin routes: authenticated via `authenticate.admin(request)` (OAuth session)
- Webhooks: authenticated via `authenticate.webhook(request)` (HMAC signature)
- No admin action can be performed without a valid Shopify session

## Secrets

Never commit secrets to git. Required environment variables:

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `DATABASE_URL`
- `DIRECT_URL`

Verify Vite doesn't expose secrets to client bundle:

- Only vars prefixed with `VITE_` are exposed to the browser
- `SHOPIFY_API_SECRET` and `DATABASE_URL` must never be `VITE_` prefixed

## Database Security

- All queries go through Prisma (parameterized, no raw SQL injection risk)
- Database credentials only in environment variables
- Never log full connection strings
- `pgBouncer=true` in production: masks direct DB access

## Rate Limiting

Current implementation: Redis-backed rate limiter via `ioredis` (`app/redis.server.js`),
shared across serverless invocations. Requests are throttled both per-IP and per-shop.

- Distributed counters live in Redis, so limits hold across serverless invocations
- Throttles by IP and by shop for more accurate control
- Falls back to an in-memory limiter automatically when Redis is unavailable

## Content Security Policy

Add to Vercel headers config:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'nonce-{RANDOM}'; frame-ancestors https://*.shopify.com https://*.myshopify.com;"
}
```

Note: Shopify embedded apps must allow `frame-ancestors` for Shopify domains.

## Security Checklist (Pre-Release)

- [x] No hardcoded secrets in source
- [x] Shop param validated on public endpoints
- [x] Rate limiting on public endpoints
- [x] Server-side form validation
- [x] Parameterized database queries (Prisma)
- [x] Webhook HMAC verification
- [x] No admin API scopes requested (`scopes = ""`)
- [ ] Lighthouse + burp suite scan before launch
- [ ] Verify `SHOPIFY_API_SECRET` not in Vite client bundle
