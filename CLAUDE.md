# OpenSlack

Bun monorepo: `apps/web` (React + Vite), `apps/api` (Hono), `packages/shared`.
Runs on port 3000 (web), 3001 (api), 3002 (postgres)

## Commands

```bash
bun run dev              # start all apps (foreground)
bun run dev:bg           # start all apps (background, logs to .dev.log)
bun run dev:stop         # stop background dev servers
bun run lint             # oxlint
bun run typecheck        # tsc --noEmit across all packages
bun run check            # lint + typecheck

bun run --filter @openslack/api db:generate   # generate Drizzle migrations
bun run --filter @openslack/api db:migrate    # run migrations
bun run --filter @openslack/api db:seed       # seed database
bun run test:web                   # run Playwright e2e tests (dev servers must be running)
bun run test:api                   # run API e2e tests
bun run coverage:api               # run API e2e with coverage and show top uncovered api files/lines
bun run coverage:web               # run web e2e tests with coverage and show top uncovered web files/lines
bun run deploy:api                 # deploy API to Railway
bun run deploy:web                 # deploy Web to Railway
```

## Rules

- Always run `bun run check` (lint + typecheck) after writing code.
- When editing `apps/api`, always add or update corresponding e2e tests in `apps/api-e2e/tests/` and ensure they pass (`bun run test:api`). Dev servers must be running.
- When editing `apps/web`, always add or update corresponding e2e tests in `apps/web-e2e/` and ensure they pass (`bun run test:web`). Dev servers must be running. Web e2e tests take ~2 min, so avoid running them unnecessarily (e.g. don't re-run if only API code changed).
- Never worry about backwards compatibility. This project is not shipped yet — just change things directly.

## Docs

- `docs/backlog.md`: Improvement backlog with prioritized feature/quality work and completion status for major initiatives.
