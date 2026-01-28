FROM oven/bun:1.3.7 AS base
WORKDIR /app

# -------------------------
# Install dependencies
# -------------------------
FROM base AS install

# Copy root manifest + lockfile
COPY package.json bun.lock ./

# Copy workspace manifests needed by backend
COPY backend/package.json backend/package.json

# Install deps
RUN bun install --frozen-lockfile

# -------------------------
# Runtime image
# -------------------------
FROM base AS release
WORKDIR /app

# Copy node_modules
COPY --from=install /app/node_modules ./node_modules

# Copy backend + shared source
COPY backend backend

ENV NODE_ENV=production

# Prisma client
WORKDIR /app/backend
RUN bunx prisma generate

EXPOSE 3000
USER bun

ENTRYPOINT ["sh", "-c", "bunx prisma migrate deploy && bun run start"]