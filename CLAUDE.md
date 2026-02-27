# OpenSlaq

Bun monorepo: `apps/web` (React + Vite), `apps/api` (Hono), `packages/shared`.
Runs on port 3000 (web), 3001 (api), 3002 (postgres). New services should always run on next avaiale 3xxx port

## Commands

```bash
bun run dev              # start all apps (foreground)
bun run dev:bg           # start all apps (background, logs to .dev.log)
bun run dev:stop         # stop background dev servers
bun run lint             # oxlint
bun run typecheck        # tsc --noEmit across all packages
bun run check            # lint + typecheck

bun run --filter @openslaq/api db:generate   # generate Drizzle migrations
bun run --filter @openslaq/api db:migrate    # run migrations
bun run --filter @openslaq/api db:seed       # seed database
```

## Rules

- Always run `bun run check` (lint + typecheck) after writing code.
- When editing `apps/api`, always add or update corresponding e2e tests in `apps/api-e2e/tests/` and ensure they pass (`bun run test:api`). Dev servers must be running.
- When editing `apps/web`, always add or update corresponding e2e tests in `apps/web-e2e/` and ensure they pass (`bun run test:web`). Dev servers must be running. Web e2e tests take ~2 min, so avoid running them unnecessarily (e.g. don't re-run if only API code changed).
- When editing `apps/mobile`, always add or update corresponding unit tests and ensure they pass (`bun run test:mobile`). To verify UI changes, use `idb` CLI to screenshot, inspect the accessibility tree, and interact with the simulator — don't run Detox e2e tests in a loop. Only run Detox (`bun run test:mobile:e2e`) for final validation before committing.
- Never worry about backwards compatibility. This project is not shipped yet — just change things directly.

## Docs

- `docs/README.md`: Docs index and canonical entrypoint.
- `docs/active/backlog-product.md`: Active product-facing backlog items.
- `docs/active/backlog-mobile.md`: Active mobile parity backlog items.
- `docs/active/backlog-engineering.md`: Active refactor/quality backlog items.
- `docs/archive/`: Date-stamped snapshots of completed/superseded backlog docs.
- `docs/backlog.md`: Compatibility pointer to active backlogs and latest archive snapshot.
