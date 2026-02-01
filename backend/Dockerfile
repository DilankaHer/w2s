FROM oven/bun:1.3.7
WORKDIR /app

# Install deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy backend source
COPY . .

ENV NODE_ENV=production

# Prisma
RUN bunx prisma generate

EXPOSE 3000
USER bun

ENTRYPOINT ["sh", "-c", "bunx prisma migrate reset --force && bunx prisma migrate deploy && bun run start"]
