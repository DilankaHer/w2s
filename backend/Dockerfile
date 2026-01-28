FROM oven/bun:1 AS base

WORKDIR /app

FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . ./

RUN bunx prisma generate
RUN bun run build

USER bun
EXPOSE 3000
ENTRYPOINT ["sh", "-c", "bunx prisma migrate deploy && bun dist/index.js"]