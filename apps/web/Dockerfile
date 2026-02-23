FROM oven/bun:1 AS build

WORKDIR /app

# Copy all workspace package.json files (lockfile requires full workspace structure)
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api-e2e/package.json apps/api-e2e/
COPY apps/web-e2e/package.json apps/web-e2e/

RUN bun install --frozen-lockfile

# Copy source (web needs shared + api/src for Hono RPC types)
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/api/src/ apps/api/src/
COPY apps/web/ apps/web/

# Vite inlines VITE_* env vars at build time
ARG VITE_API_URL
ARG VITE_STACK_PROJECT_ID
ARG VITE_STACK_PUBLISHABLE_CLIENT_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STACK_PROJECT_ID=$VITE_STACK_PROJECT_ID
ENV VITE_STACK_PUBLISHABLE_CLIENT_KEY=$VITE_STACK_PUBLISHABLE_CLIENT_KEY

WORKDIR /app/apps/web
RUN bun run build

# --- Serve with Caddy ---
FROM caddy:2-alpine

COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
