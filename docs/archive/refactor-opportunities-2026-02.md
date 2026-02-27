# Refactor Opportunities

## 1. ~~Replace API `as any` escapes with typed route helpers~~ ✅
Done. Typed `jsonOk`/`jsonError` helpers added in `openapi/responses.ts`; all ~44 `as any` uses removed.

## 2. Break up oversized message domain service
Evidence: [messages/service.ts](/Users/bgodil/source/openslaq/apps/api/src/messages/service.ts) is 500+ lines and mixes querying, serialization, enrichment, pagination, and mutation concerns.  
Refactor: split into `message-read-repo`, `message-write-repo`, `message-serializer`, `message-enrichers` (attachments/reactions/mentions/bot-actions).

## 3. Extract shared API route patterns into reusable builders
Evidence: repeated `createRoute` + `c.json(...)` patterns across [channels/routes.ts](/Users/bgodil/source/openslaq/apps/api/src/channels/routes.ts), [workspaces/member-routes.ts](/Users/bgodil/source/openslaq/apps/api/src/workspaces/member-routes.ts), [messages/routes.ts](/Users/bgodil/source/openslaq/apps/api/src/messages/routes.ts), [reactions/routes.ts](/Users/bgodil/source/openslaq/apps/api/src/reactions/routes.ts), [bots/bot-api-routes.ts](/Users/bgodil/source/openslaq/apps/api/src/bots/bot-api-routes.ts).  
Refactor: centralize common param schemas, standard responses, and event dispatch wrappers.

## 4. Modularize socket lifecycle logic
Evidence: [socket/index.ts](/Users/bgodil/source/openslaq/apps/api/src/socket/index.ts) handles auth, room joins, presence sync, typing throttle, and huddle cleanup in one module.  
Refactor: split into `socket-auth`, `socket-room-sync`, `socket-presence`, `socket-typing`, `socket-huddle-hooks`.

## 5. Deduplicate mobile channel/DM screens into one conversation screen
Evidence: near-identical logic in [channel screen](/Users/bgodil/source/openslaq/apps/mobile/app/(app)/[workspaceSlug]/(tabs)/(channels)/[channelId].tsx) and [dm screen](/Users/bgodil/source/openslaq/apps/mobile/app/(app)/[workspaceSlug]/(tabs)/(dms)/[dmChannelId].tsx).  
Refactor: shared `ConversationScreen` + small adapters for header/title and route params.

## 6. Deduplicate admin tab table/pagination/search behavior
Evidence: strong duplication between [UsersTab.tsx](/Users/bgodil/source/openslaq/apps/web/src/pages/admin/UsersTab.tsx) and [WorkspacesTab.tsx](/Users/bgodil/source/openslaq/apps/web/src/pages/admin/WorkspacesTab.tsx).  
Refactor: shared `useAdminPagedQuery` hook + generic admin table/paginator components.

## 7. Remove duplicated optimistic reaction logic between web and client-core
Evidence: overlap between [useMessageMutations.ts](/Users/bgodil/source/openslaq/apps/web/src/hooks/chat/useMessageMutations.ts) and [operations/mutations.ts](/Users/bgodil/source/openslaq/packages/client-core/src/operations/mutations.ts).  
Refactor: keep optimistic logic in `client-core` only; web hook should delegate without re-implementing.

## 8. Clean up `react-hooks/exhaustive-deps` suppressions with stable dependency patterns
Evidence: ~11 suppressions across web/mobile hooks (e.g. [useChannelMessages.ts](/Users/bgodil/source/openslaq/apps/web/src/hooks/chat/useChannelMessages.ts), [WorkspaceBootstrapProvider.tsx](/Users/bgodil/source/openslaq/apps/mobile/src/contexts/WorkspaceBootstrapProvider.tsx)).  
Refactor: introduce stable `deps` factory/hooks and avoid capturing full state objects in effects.

## 9. Consolidate OpenAPI schemas with shared domain types
Evidence: large hand-maintained schema file [openapi/schemas.ts](/Users/bgodil/source/openslaq/apps/api/src/openapi/schemas.ts) while canonical types exist in `packages/shared`.  
Refactor: move toward shared zod/type source-of-truth and generate OpenAPI schemas from it.

## 10. Simplify duplicated rate-limit middleware logic
Evidence: repeated branches in [rate-limit/middleware.ts](/Users/bgodil/source/openslaq/apps/api/src/rate-limit/middleware.ts).  
Refactor: one generic limiter factory with pluggable key resolver (`userId` vs IP).
