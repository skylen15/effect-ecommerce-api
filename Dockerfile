# ============================================
# Effect E-commerce API - Dockerfile
# ============================================

# Stage 1: Install dependencies
FROM oven/bun:1.3.2 AS deps

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# ============================================
# Stage 2: Build (for type checking)
# ============================================
FROM oven/bun:1.3.2 AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source files
COPY tsconfig*.json ./
COPY src ./src

# Type check
RUN bun run check

# ============================================
# Stage 3: Production runtime
# ============================================
FROM oven/bun:1.3.2-slim AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 effect

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files (Bun runs TypeScript directly)
COPY package.json ./
COPY tsconfig*.json ./
COPY src ./src

# Set ownership
RUN chown -R effect:nodejs /app

# Switch to non-root user
USER effect

# Environment variables (defaults, can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000

# OpenTelemetry defaults
ENV OTEL_ENABLED=true
ENV OTEL_SERVICE_NAME=ecommerce-api
ENV OTEL_SERVICE_VERSION=1.0.0
ENV OTEL_EXPORTER=console

# Expose port (documentation only, actual port set via -p flag)
EXPOSE ${PORT}

# Health check using PORT env var
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun --eval "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the application
CMD ["bun", "run", "dev"]
