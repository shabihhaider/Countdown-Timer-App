#!/usr/bin/env sh
# Check prerequisites for development setup.
# Usage: ./scripts/setup-check.sh

set -e

PASS=0
FAIL=0

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS + 1)); }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL + 1)); }

printf "\n\033[1mPrerequisite Check\033[0m\n"
printf "==================\n\n"

# Docker
if command -v docker >/dev/null 2>&1; then
  ok "Docker installed ($(docker --version | head -c 30))"
else
  fail "Docker not installed — install from https://docs.docker.com/get-docker/"
fi

# Docker Compose
if docker compose version >/dev/null 2>&1; then
  ok "Docker Compose available"
else
  fail "Docker Compose not available — update Docker Desktop"
fi

# Docker running
if docker info >/dev/null 2>&1; then
  ok "Docker daemon is running"
else
  fail "Docker daemon is not running — start Docker Desktop"
fi

# Port 3000
if ! (netstat -an 2>/dev/null || ss -tln 2>/dev/null) | grep -q ":3000 "; then
  ok "Port 3000 available"
else
  fail "Port 3000 in use — stop the process using it"
fi

# Port 5432
if ! (netstat -an 2>/dev/null || ss -tln 2>/dev/null) | grep -q ":5432 "; then
  ok "Port 5432 available"
else
  fail "Port 5432 in use — stop local PostgreSQL or change POSTGRES_PORT in .env"
fi

# .env file
if [ -f .env ]; then
  ok ".env file exists"
else
  fail ".env file missing — run: cp .env.example .env"
fi

printf "\n==================\n"
printf "Passed: \033[32m%d\033[0m  Failed: \033[31m%d\033[0m\n\n" "$PASS" "$FAIL"

if [ "$FAIL" -gt 0 ]; then
  printf "\033[31mFix the issues above before running setup.\033[0m\n\n"
  exit 1
fi
