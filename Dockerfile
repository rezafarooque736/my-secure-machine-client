# =============================================================================
# PRODUCTION DOCKERFILE FOR NEXT.JS WITH STANDALONE OUTPUT (NPM)
# =============================================================================

############################
# Stage 1: Dependencies
############################
FROM node:24-alpine AS deps

WORKDIR /app

# Install build dependencies (for Prisma and native modules)
RUN apk add --no-cache \
    python3 make g++ build-base libc6-compat openssl ca-certificates

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install dependencies (including dev dependencies for build)
RUN npm ci

############################
# Stage 2: Builder
############################
FROM node:24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 make g++ build-base libc6-compat openssl ca-certificates

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma


# Copy the rest of the application
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy DB URL for build (will be overridden at runtime)
# ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL="postgresql://postgres:1234@localhost:5432/guacamole_db"

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

############################
# Stage 3: Runtime
############################
FROM node:24-alpine AS runner

WORKDIR /app

# Install runtime dependencies (including dumb-init for graceful shutdown)
RUN apk add --no-cache \
    libc6-compat openssl ca-certificates dumb-init netcat-openbsd && \
    rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

RUN mkdir -p /app/logs

# Copy standalone output and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files (needed for migrations at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated/prisma ./lib/generated/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Fix permissions
RUN chown -R nextjs:nodejs /app/logs && \
    chmod -R 755 /app/logs

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use entrypoint to run migrations before starting app
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]