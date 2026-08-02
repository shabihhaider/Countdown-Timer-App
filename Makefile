.PHONY: help setup setup-env dev dev-d dev-tools dev-tunnel stop stop-clean \
        prod prod-d stop-prod logs logs-app logs-db shell db-shell redis-cli \
        migrate migrate-dev prisma-studio db-reset db-seed tunnel-url build clean \
        dev-fresh \
        test test-unit test-e2e test-coverage test-all test-a11y \
        lint lint-fix format format-check typecheck audit audit-fix \
        security ci ci-local health-check

# ─── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this help
	@printf "\nCountdown Timer App — Docker Development\n\n"
	@printf "\033[33mDevelopment:\033[0m\n"
	@grep -E '^(dev|setup|stop|prod|logs|shell|db|redis|migrate|prisma|tunnel|build|clean)[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@printf "\n\033[33mTesting:\033[0m\n"
	@grep -E '^test[a-zA-Z_:-]*:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@printf "\n\033[33mCode Quality:\033[0m\n"
	@grep -E '^(lint|format|typecheck|audit|security|ci)[a-zA-Z_:-]*:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@printf "\n"

# ─── First-time setup ─────────────────────────────────────────────────────────

setup: ## Full first-time setup: env → build → start → migrate → seed
	@printf "\n\033[1m=== Countdown Timer App — Setup ===\033[0m\n\n"
	@$(MAKE) setup-env
	@printf "\033[33m[1/5] Building Docker images...\033[0m\n"
	docker compose build
	@printf "\033[33m[2/5] Starting services...\033[0m\n"
	docker compose up -d
	@printf "\033[33m[3/5] Waiting for services...\033[0m\n"
	@until docker compose ps db --format json 2>/dev/null | grep -q '"Health":"healthy"'; do sleep 2; printf "."; done; printf "\n"
	@printf "\033[33m[4/5] Running migrations...\033[0m\n"
	docker compose exec app npx prisma migrate deploy
	@printf "\033[33m[5/5] Seeding database...\033[0m\n"
	docker compose exec app npx prisma db seed
	@printf "\n\033[32m✓ Setup complete!\033[0m\n"
	@printf "\n  App:     http://localhost:3000"
	@printf "\n  Health:  http://localhost:3000/health"
	@printf "\n  Adminer: http://localhost:8888 (run: docker compose --profile tools up -d adminer)\n\n"

setup-env: ## Copy .env.example → .env (run once before starting)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		printf "Created .env — fill in your SHOPIFY_API_KEY and SHOPIFY_API_SECRET\n"; \
	else \
		printf ".env already exists, skipping\n"; \
	fi

# ─── Development ──────────────────────────────────────────────────────────────

dev: ## Start dev environment in the foreground (Ctrl+C to stop)
	docker compose up --build

dev-d: ## Start dev environment in the background
	docker compose up -d --build

dev-tools: ## Start dev + Adminer (DB admin UI at http://localhost:8888)
	docker compose --profile tools up -d --build

dev-tunnel: ## Start dev + Cloudflare tunnel (HTTPS for Shopify OAuth)
	docker compose --profile tunnel up -d --build
	@printf "Waiting for tunnel URL...\n"
	@sleep 8
	@$(MAKE) tunnel-url

# ─── Production ───────────────────────────────────────────────────────────────

prod: ## Build and start the production stack (background)
	docker compose -f docker-compose.prod.yml up -d --build

prod-rebuild: ## Force-recreate production containers with a fresh build
	docker compose -f docker-compose.prod.yml up -d --build --force-recreate

stop-prod: ## Stop production stack
	docker compose -f docker-compose.prod.yml down

# ─── Lifecycle ────────────────────────────────────────────────────────────────

stop: ## Stop dev environment
	docker compose down

stop-clean: ## Stop dev environment AND delete all data volumes (DESTRUCTIVE)
	docker compose down -v

# ─── Logs ─────────────────────────────────────────────────────────────────────

logs: ## Tail logs for all services
	docker compose logs -f

logs-app: ## Tail app logs only
	docker compose logs -f app

logs-db: ## Tail database logs only
	docker compose logs -f db

tunnel-url: ## Print the Cloudflare tunnel URL from logs
	@docker compose logs cloudflared 2>&1 | \
		grep -o 'https://[^ ]*\.trycloudflare\.com' | tail -1 || \
		printf "Tunnel URL not found yet — try again in a few seconds\n"

# ─── Shell access ─────────────────────────────────────────────────────────────

shell: ## Open sh in the app container
	docker compose exec app sh

db-shell: ## Open psql in the database container
	docker compose exec db psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-countdown_timer}

redis-cli: ## Open redis-cli in the Redis container
	docker compose exec redis redis-cli

# ─── Database / Prisma ────────────────────────────────────────────────────────

migrate: ## Apply pending Prisma migrations (deploy)
	docker compose exec app npx prisma migrate deploy

migrate-dev: ## Create and apply a new Prisma migration (dev only)
	docker compose exec app npx prisma migrate dev

prisma-studio: ## Open Prisma Studio (browser DB explorer on port 5555)
	docker compose exec app npx prisma studio --browser none

db-seed: ## Seed the database with demo data
	docker compose exec app npx prisma db seed

db-reset: ## Reset database and re-apply all migrations (DESTRUCTIVE)
	docker compose exec app npx prisma migrate reset --force

# ─── Build ────────────────────────────────────────────────────────────────────

build: ## Build the production Docker image
	docker compose -f docker-compose.prod.yml build app

# ─── Cleanup ──────────────────────────────────────────────────────────────────

clean: ## Remove all containers, volumes, and local build artefacts (DESTRUCTIVE)
	docker compose down -v --remove-orphans
	rm -rf build .cache test-results playwright-report coverage

dev-fresh: ## Full reset: stop → delete volumes → setup (DESTRUCTIVE)
	$(MAKE) stop-clean
	$(MAKE) setup

# ─── Testing ──────────────────────────────────────────────────────────────────

test: ## Run unit + integration tests (Vitest) in Docker
	docker compose --profile test run --rm test npm run test

test-unit: ## Run unit tests only
	docker compose --profile test run --rm test npm run test:unit

test-e2e: ## Run E2E tests (Playwright) against the running app
	@printf "Ensuring app is running before E2E tests...\n"
	docker compose up -d --build
	@printf "Waiting for app healthcheck...\n"
	@until docker compose ps app --format json 2>/dev/null | grep -q '"Health":"healthy"'; do \
		sleep 3; \
		printf "."; \
	done; printf "\nApp is healthy — starting E2E tests\n"
	docker compose --profile test run --rm test npm run test:e2e

test-coverage: ## Run tests with coverage report (output: ./coverage)
	docker compose --profile test run --rm test npm run test:coverage
	@printf "\nCoverage report: coverage/index.html\n"

test-all: ## Run full test suite: unit + E2E + coverage
	@printf "Ensuring app is running...\n"
	docker compose up -d --build
	@until docker compose ps app --format json 2>/dev/null | grep -q '"Health":"healthy"'; do \
		sleep 3; \
		printf "."; \
	done; printf "\nApp is healthy\n"
	docker compose --profile test run --rm test npm run test:ci
	@printf "\n✓ Full test suite complete\n"

test-a11y: ## Run accessibility-only E2E tests
	docker compose up -d --build
	@until docker compose ps app --format json 2>/dev/null | grep -q '"Health":"healthy"'; do \
		sleep 3; printf "."; \
	done; printf "\n"
	docker compose --profile test run --rm test npm run test:e2e -- --grep "@a11y"

# ─── Code Quality ─────────────────────────────────────────────────────────────

lint: ## Run ESLint in Docker
	docker compose --profile lint run --rm lint sh -c "npm run lint"

lint-fix: ## Run ESLint with auto-fix in Docker
	docker compose --profile lint run --rm lint sh -c "npm run lint:fix"

format: ## Run Prettier (write) in Docker
	docker compose --profile lint run --rm lint sh -c "npm run format"

format-check: ## Check Prettier formatting without writing
	docker compose --profile lint run --rm lint sh -c "npm run format:check"

typecheck: ## Run TypeScript type check in Docker
	docker compose --profile lint run --rm lint sh -c "npm run typecheck"

audit: ## Run npm audit (high severity only)
	docker compose --profile lint run --rm lint sh -c "npm audit --audit-level=high"

audit-fix: ## Run npm audit fix
	docker compose --profile lint run --rm lint sh -c "npm audit fix"

security: ## Run security scan (ESLint security plugin + npm audit)
	docker compose --profile lint run --rm lint sh -c "npm run lint && npm audit --audit-level=moderate"

# ─── Health Check ─────────────────────────────────────────────────────────────

health-check: ## Verify all running services are healthy
	@scripts/health-check.sh

# ─── CI ───────────────────────────────────────────────────────────────────────

ci: ## Run full CI pipeline locally (lint → typecheck → test → e2e)
	@printf "\n\033[1m=== CI Pipeline ===\033[0m\n\n"
	@printf "\033[33m[1/5] Lint...\033[0m\n"
	$(MAKE) lint
	@printf "\033[33m[2/5] Format check...\033[0m\n"
	$(MAKE) format-check
	@printf "\033[33m[3/5] Type check...\033[0m\n"
	$(MAKE) typecheck
	@printf "\033[33m[4/5] Unit tests...\033[0m\n"
	$(MAKE) test-coverage
	@printf "\033[33m[5/5] E2E tests...\033[0m\n"
	$(MAKE) test-e2e
	@printf "\n\033[32m✓ All CI checks passed\033[0m\n\n"

ci-local: ## Fast local CI: lint + unit tests only (no E2E, no Docker spin-up)
	npm run lint && npm run format:check && npm run typecheck && npm run test:coverage
