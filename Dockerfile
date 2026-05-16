# syntax=docker/dockerfile:1.7

# ---------- 1. Dependencies ----------
FROM node:24-alpine AS deps
WORKDIR /app
# Install only what's needed to resolve native deps on Alpine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Build ----------
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- 3. Runtime ----------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    SMRT_DATA_DIR=/data

# Non-root user with predictable UID/GID so bind mounts behave consistently
RUN addgroup -g 1001 -S smrt && adduser -S -u 1001 -G smrt smrt \
 && mkdir -p /data \
 && chown -R smrt:smrt /data

# Standalone Next.js bundle includes only what's needed to run
COPY --from=builder --chown=smrt:smrt /app/public ./public
COPY --from=builder --chown=smrt:smrt /app/.next/standalone ./
COPY --from=builder --chown=smrt:smrt /app/.next/static ./.next/static

USER smrt

EXPOSE 3000

# Persisted: config + snapshots + alert log + audit log + report history + tags
VOLUME ["/data"]

# Health check hits the cheap poller-status endpoint (no Meraki call, no auth)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/poller/status || exit 1

CMD ["node", "server.js"]
