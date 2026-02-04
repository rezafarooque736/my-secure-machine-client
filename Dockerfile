# =============================================================================
# PRODUCTION DOCKERFILE FOR NEXT.JS 15.5 WITH STANDALONE OUTPUT (ALPINE)
# =============================================================================

############################
# Stage 1: Dependencies
############################
FROM node:20-alpine AS deps

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install native build dependencies
RUN apk add --no-cache \
    python3 make g++ build-base libc6-compat openssl ca-certificates \
    cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev librsvg-dev musl-dev

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install node_modules
RUN pnpm install --frozen-lockfile --ignore-scripts

############################
# Stage 2: Builder
############################
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

RUN apk add --no-cache \
    python3 make g++ build-base libc6-compat openssl ca-certificates \
    cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev librsvg-dev musl-dev

# Dummy DB URL for build
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
ENV SKIP_ENV_VALIDATION=1

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy full application
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Re-generate client inside builder stage (safe)
RUN npx prisma generate

# Build Next.js app
RUN pnpm run build

############################
# Stage 3: Runtime
############################
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install runtime dependencies
RUN apk add --no-cache \
    libc6-compat openssl ca-certificates wget curl dumb-init \
    netcat-openbsd cairo pango jpeg giflib pixman librsvg && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Upload dirs
RUN mkdir -p /app/public/uploads/avatars \
    /app/public/uploads/posters \
    /app/public/uploads/resources \
    /app/logs

# Copy built standalone app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Fix permissions
RUN chown -R nextjs:nodejs /app/public/uploads /app/logs && \
    chmod -R 755 /app/public/uploads /app/logs

# Copy Prisma files (needed for migrations at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/generated/prisma ./generated/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use entrypoint to run migrations before starting app
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]