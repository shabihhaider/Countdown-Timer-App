ARG NODE_VERSION=20

# ─────────────────────────────────────────────────────────────────────────────
# base: shared Alpine foundation with OpenSSL (required by Prisma)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# ─────────────────────────────────────────────────────────────────────────────
# prod-deps: production node_modules only
# Prisma schema is copied BEFORE npm ci so the postinstall hook succeeds.
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS prod-deps
COPY package.json package-lock.json* .npmrc* ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force
# Remove Shopify CLI if it was pulled in transitively — not needed at runtime
RUN npm remove @shopify/cli 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# all-deps: full node_modules (dev + prod) used for dev server, builder, tests
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS all-deps
COPY package.json package-lock.json* .npmrc* ./
COPY prisma ./prisma
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# development: hot-reload Vite dev server
# The source tree is volume-mounted at runtime; files here are for image-only
# runs (CI, inspection).
# ─────────────────────────────────────────────────────────────────────────────
FROM all-deps AS development
ENV NODE_ENV=development

COPY . .

# 3000  — main app
# 8002  — HMR WebSocket in tunnel mode  (SHOPIFY_APP_URL = https://…)
# 64999 — HMR WebSocket in localhost mode (SHOPIFY_APP_URL = http://localhost)
EXPOSE 3000 8002 64999

CMD ["sh", "-c", "npx prisma migrate deploy && npx vite --host"]

# ─────────────────────────────────────────────────────────────────────────────
# test: unit + integration tests via Vitest, E2E via Playwright + Chromium
# ─────────────────────────────────────────────────────────────────────────────
FROM all-deps AS test
ENV NODE_ENV=test
ENV CI=true

# Playwright system dependencies for Chromium on Alpine/glibc
# Using apk packages that match what Playwright needs
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei \
    curl

# Tell Playwright to use the system Chromium rather than downloading its own
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY . .

# Artifacts directories (mounted as volumes in docker-compose)
RUN mkdir -p test-results playwright-report coverage

CMD ["npm", "run", "test:ci"]

# ─────────────────────────────────────────────────────────────────────────────
# builder: compile the production Remix bundle
# ─────────────────────────────────────────────────────────────────────────────
FROM all-deps AS builder
ENV NODE_ENV=production

COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# production: minimal, non-root runtime image
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S remix -u 1001

# Tini: proper init process for signal handling and zombie reaping
RUN apk add --no-cache tini

# Production node_modules (pre-built, no dev deps, no Shopify CLI)
COPY --from=prod-deps --chown=remix:nodejs /app/node_modules ./node_modules

# Prisma schema + migrations (needed by migrate deploy at startup)
COPY --from=prod-deps --chown=remix:nodejs /app/prisma ./prisma

# Compiled app and static assets
COPY --from=builder --chown=remix:nodejs /app/build ./build
COPY --from=builder --chown=remix:nodejs /app/public ./public

# npm scripts require package.json at runtime
COPY --chown=remix:nodejs package.json ./

USER remix
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
# npm run docker-start = prisma migrate deploy + remix-serve
CMD ["npm", "run", "docker-start"]
