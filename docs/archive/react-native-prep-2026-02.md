# Preparatory Tasks for React Native iOS App

## Context

We want to add an Expo React Native iOS app (`apps/mobile`) with full feature parity. The current web app has significant client-side logic (chat state, API client, socket manager, business logic hooks) tightly coupled to `apps/web`. To avoid duplicating this logic, we'll extract it into a new `packages/client-core` package that both web and mobile import from.

These tasks are ordered by dependency — each is independently shippable (web stays working after each).

---

## ~~Task 1: Create `packages/client-core` + extract chat reducer~~ ✅ Completed

Create the new workspace package and move the pure-TS chat state machine out of `apps/web`.

**Move from `apps/web/src/state/chat-store.tsx` to `packages/client-core/src/store/`:**
- All state interfaces (`ChatStoreState`, `WorkspaceInfo`, `DmConversation`, `PresenceEntry`, `ScrollTarget`, `ChannelPaginationState`, `ThreadPaginationState`, `ChatUiState`)
- `ChatAction` union type (50+ action types)
- `chatReducer` function
- `initialState` constant
- Helper functions (`dedupeIds`, `insertSortedByCreatedAt`)

**What stays in `apps/web`:** React context/provider (`ChatStoreProvider`, `useChatStore`, `useChatSelectors`) — these become thin wrappers that import reducer + types from `@openslaq/client-core`.

**Package setup:**
- `packages/client-core/package.json` — exports `./src/index.ts`, depends on `@openslaq/shared`
- `packages/client-core/tsconfig.json` — extends `../../tsconfig.base.json`
- Workspace auto-discovered via existing `packages/*` glob in root `package.json`

**Verify:** `bun run check` + `bun run test:web`

---

## ~~Task 2: Extract API client + define platform abstractions~~ Completed

Move API utilities and define the interfaces that let web and mobile provide different platform implementations.

**Define platform interfaces in `packages/client-core/src/platform/`:**
```ts
interface AuthProvider {
  getAccessToken(): Promise<string | null>;
  requireAccessToken(): Promise<string>;
  onAuthRequired(): void; // replaces redirectToAuth() / window.location.assign
}

interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

**Move to `packages/client-core/src/api/`:**
- `errors.ts` — `AuthError`, `ApiError`, `getErrorMessage` (already pure TS)
- `api-client.ts` — `authorizedHeaders`, `authorizedRequest` refactored to accept `AuthProvider` instead of raw user object

**Create Hono RPC client factory:**
```ts
// packages/client-core/src/api/client.ts
import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

export function createApiClient(apiUrl: string) { return hc<AppType>(apiUrl); }
export type ApiClient = ReturnType<typeof createApiClient>;
```

Web's `api.ts` becomes: `export const api = createApiClient(env.VITE_API_URL)`

> **Note:** The `import type { AppType }` is type-only — erased at compile time. Metro bundler won't try to resolve `@openslaq/api` server code at runtime. If it does, we'll create a `packages/api-types` re-export to break the dependency.

**Key files:**
- `apps/web/src/lib/api-client.ts` → client-core
- `apps/web/src/lib/errors.ts` → client-core
- `apps/web/src/lib/auth.ts` → web keeps its `AuthProvider` implementation (calls Stack Auth + `window.location.assign`)
- `apps/web/src/api.ts` → thin wrapper calling `createApiClient()`

**Verify:** `bun run check` + `bun run test:web`

---

## ~~Task 3: Extract SocketManager to client-core~~ ✅ Completed

**Move `apps/web/src/socket/socketManager.ts` to `packages/client-core/src/socket/`.**

Already nearly framework-agnostic. Changes needed:
- Remove `import { env } from "../env"` — the default `createSocket` should require explicit URL
- Constructor takes `{ apiUrl: string; createSocket?: () => TypedSocket }`
- Export `TypedSocket`, `SocketStatus`, `SocketSnapshot` types

**What stays in `apps/web`:** `SocketProvider.tsx` (React context), `useSocketEvent` hook — these wrap the client-core SocketManager.

**Verify:** `bun run check` + `bun run test:web`

---

## ~~Task 4: Extract business logic to operations layer~~ Completed

This is the largest task. Convert hooks in `apps/web/src/hooks/chat/` from React hooks into plain async functions in `packages/client-core/src/operations/`.

**Pattern:** Each operation takes explicit dependencies instead of using React hooks:
```ts
interface OperationDeps {
  api: ApiClient;
  auth: AuthProvider;
  dispatch: (action: ChatAction) => void;
}

async function loadChannelMessages(
  deps: OperationDeps,
  params: { workspaceSlug: string; channelId: string }
): Promise<void> { ... }
```

**Extract these hooks → operations:**

| Hook | Operation file | Notes |
|------|---------------|-------|
| `useWorkspaceBootstrap` | `bootstrap.ts` | Initial load: channels, workspaces, DMs, unreads, presence |
| `useChannelMessages` | `messages.ts` | Load latest messages for channel |
| `useLoadOlderMessages` | `messages.ts` | Pagination: prepend older |
| `useLoadNewerMessages` | `messages.ts` | Pagination: append newer |
| `useThreadMessages` | `threads.ts` | Load parent + replies |
| `useLoadMoreReplies` | `threads.ts` | Thread pagination |
| `useMessageMutations` | `mutations.ts` | send, edit, delete, toggleReaction |
| `useDmActions` | `dm.ts` | Create/open DM conversations |
| `useSearch` | `search.ts` | Full-text message search |
| `usePresenceTracking` | `presence.ts` | Extract handler fns (socket subscription stays per-platform) |
| `useUnreadTracking` | `unread.ts` | Mark-as-read API call + unread increment logic |
| `useHuddleActions` | `huddle.ts` | Start/join/leave/mute |
| `useHuddleTracking` | `huddle.ts` | Huddle event handlers |
| `useChannelMemberTracking` | `channels.ts` | Channel member add/remove handlers |

**Also extract hooks from `apps/web/src/hooks/api/`:**

| Hook | Operation file |
|------|---------------|
| `useInvitesApi` | `invites.ts` |
| `useWorkspaceMembersApi` | `members.ts` |
| `useAdminApi` | `admin.ts` |
| `useChannelMembersApi` | `channel-members.ts` |
| `useWorkspacesApi` | `workspaces.ts` |

**Do NOT extract (web-only):**
- `useScrollToMessage` — uses `document.querySelector`, `requestAnimationFrame`, CSS
- `useHuddleAudio` — uses WebRTC/PeerConnectionManager (will need separate RN implementation)
- `useNotifications` — uses browser Notification API
- `useResizable`, `useFileDragOverlay` — DOM mouse events
- Gallery mode logic — stays in web

**What stays in `apps/web`:** React hooks become thin wrappers:
```ts
function useChannelMessages(channelId: string) {
  const { dispatch } = useChatStore();
  const auth = useAuthProvider();
  useEffect(() => {
    loadChannelMessages({ api, auth, dispatch }, { workspaceSlug, channelId });
  }, [channelId]);
}
```

**Can be broken into sub-tasks:** bootstrap → messages/threads → mutations → tracking → api hooks

**Verify after each sub-task:** `bun run check` + `bun run test:web`

---

## ~~Task 5: Update API CORS for native clients~~ Completed

React Native's `fetch` doesn't send an `Origin` header like browsers do. The current CORS middleware will reject these requests.

**Changes to `apps/api/src/app.ts`:**
Replace static origin list with a dynamic function that allows requests with no `Origin` header (native clients):
```ts
cors({
  origin: (origin, c) => {
    if (!origin) return c.req.header("Origin") ?? "*";
    if (env.CORS_ORIGIN.includes(origin)) return origin;
    return null;
  },
  credentials: true,
})
```

Apply same logic to Socket.IO CORS in `apps/api/src/index.ts`.

Also add `http://localhost:3007` (Expo Metro dev server) to default `CORS_ORIGIN` in `.env.example`.

**Verify:** `bun run check` + `bun run test:api` (add CORS test for missing Origin header)

---

## Task 6 (Optional): Add push notification backend

Essential for a mobile messaging app but can be deferred until the RN app exists.

**What's needed:**
- `device_tokens` table (userId, token, platform, createdAt)
- `POST /api/devices` — register device token
- `DELETE /api/devices/:token` — unregister
- APNs integration to send pushes on `message:new` events to users who are offline (not connected via Socket.IO)
- Could use Expo Push Notifications service to simplify APNs/FCM

---

## Risks to Watch

1. **Metro + Bun workspaces:** Metro's module resolution differs from Bun's. May need `watchFolders` in `metro.config.js` pointing to `packages/*`. Test early when creating the Expo app.

2. **Hono RPC `AppType` transitive imports:** If Metro tries to resolve `@openslaq/api/app` at runtime (not just type level), it'll pull in server deps (`drizzle-orm`, `postgres`, etc). Mitigation: ensure import is `type`-only. Fallback: create `packages/api-types` with just the type re-export.

3. **Stack Auth RN SDK maturity:** Verify `@stackframe/react-native` supports token refresh, same `getAuthJson()` interface, and OAuth flows via `expo-auth-session`.

4. **React 19 + Expo:** Verify Expo SDK version supports React 19 (Expo SDK 52+ should).

5. **File uploads in RN:** RN's `FormData` accepts `{ uri, type, name }` objects, not browser `File`. The `useFileUpload` hook needs a platform abstraction (`FileUploader` interface) when the mobile app adds upload support.
