FROM oven/bun:1

WORKDIR /app

# Copy all workspace package.json files (lockfile requires full workspace structure)
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api-e2e/package.json apps/api-e2e/
COPY apps/web-e2e/package.json apps/web-e2e/

RUN bun install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

WORKDIR /app/apps/api

CMD ["bun", "run", "src/index.ts"]
