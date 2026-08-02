#!/usr/bin/env sh
# Verify all Docker services are reachable and healthy.
# Usage: ./scripts/health-check.sh

set -e

PASS=0
FAIL=0
WARN=0

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS + 1)); }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL + 1)); }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; WARN=$((WARN + 1)); }

printf "\n\033[1mCountdown Timer App — Service Health Check\033[0m\n"
printf "==========================================\n\n"

# ── App ──────────────────────────────────────────────────────────────────────
printf "\033[1mApp server\033[0m\n"
if wget -qO- http://localhost:3000/health 2>/dev/null | grep -q '"status":"ok"'; then
  ok "GET /health → 200 OK (database reachable)"
elif wget -qO- http://localhost:3000/health 2>/dev/null | grep -q '"status":"error"'; then
  fail "GET /health → app up but database unreachable"
else
  fail "GET /health → app is not running or not reachable on port 3000"
fi

if wget -qO- "http://localhost:3000/apps/countdown/settings?shop=test.myshopify.com" 2>/dev/null | grep -q '"success"'; then
  ok "GET /apps/countdown/settings → responding"
else
  warn "GET /apps/countdown/settings → not responding (check app logs)"
fi

# ── Database ─────────────────────────────────────────────────────────────────
printf "\n\033[1mPostgreSQL\033[0m\n"
if docker compose ps db --format json 2>/dev/null | grep -q '"Health":"healthy"'; then
  ok "PostgreSQL container is healthy"
else
  fail "PostgreSQL container is not healthy (run: make logs-db)"
fi

# ── Redis ─────────────────────────────────────────────────────────────────────
printf "\n\033[1mRedis\033[0m\n"
if docker compose ps redis --format json 2>/dev/null | grep -q '"Health":"healthy"'; then
  ok "Redis container is healthy"
else
  fail "Redis container is not healthy"
fi

if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
  ok "redis-cli PING → PONG"
else
  fail "redis-cli PING failed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
printf "\n==========================================\n"
printf "Passed: \033[32m%d\033[0m  Failed: \033[31m%d\033[0m  Warnings: \033[33m%d\033[0m\n\n" "$PASS" "$FAIL" "$WARN"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
