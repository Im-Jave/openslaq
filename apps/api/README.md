# API

Hono REST API with Socket.IO real-time events, organized by domain.

## Structure

```
src/
├── app.ts              # Hono app — mounts domain routes, exports AppType
├── index.ts            # Server entry point — HTTP + Socket.IO
├── db/                 # Drizzle client, migrations, seed, barrel schema
├── auth/               # JWT verification, middleware, auth types
├── channels/           # Channel CRUD + membership
├── messages/           # Message CRUD with cursor pagination
├── users/              # User profile + upsert
├── workspaces/         # Workspace lookup
└── socket/             # Socket.IO auth + event handlers
```

## File naming convention

Each domain folder uses these standard files (include only what's needed):

| File | Purpose |
|---|---|
| `schema.ts` | Drizzle table definitions (`pgTable`) |
| `routes.ts` | Hono route chain — parses input, calls service, returns HTTP response. No direct DB access. |
| `service.ts` | Plain async functions for DB queries and business logic. Reusable from routes, socket handlers, seeds. |
| `validation.ts` | Zod schemas for request body/query validation |
| `types.ts` | Domain-specific TypeScript types beyond Drizzle-inferred ones |
