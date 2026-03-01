FROM oven/bun:1.3.7

WORKDIR /app

# Copy backend package files
COPY backend/package.json backend/bun.lock ./backend/

# Copy shared code
COPY shared ./shared

# Move into backend folder
WORKDIR /app/backend

# Install backend dependencies
RUN bun install --frozen-lockfile

# Copy backend source
COPY backend ./

ENV NODE_ENV=production

# Prisma
RUN bunx prisma generate

EXPOSE 3000
USER bun

ENTRYPOINT ["sh", "-c", "bunx prisma migrate reset --force && bunx prisma migrate deploy && bun run start"]