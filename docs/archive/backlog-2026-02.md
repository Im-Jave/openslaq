# OpenSlaq Improvement Options

This backlog captures the initial set of high-impact improvements identified during repo review. We can work through these one by one.

## 1. ~~Realtime Consistency Fixes~~ ✅ COMPLETED
- Why: Socket event types include `message:new`, `message:updated`, and `message:deleted`, but top-level message create/edit/delete flows do not consistently broadcast all relevant events.
- Evidence:
  - `packages/shared/src/types/events.ts`
  - `apps/api/src/messages/channel-routes.ts`
  - `apps/api/src/messages/routes.ts`
- Impact: Prevents stale timelines across clients and improves chat correctness.
- Effort: Low to medium.

## 2. ~~Frontend State and Data Refactor~~ ✅ COMPLETED
- Why: Data orchestration, auth token retrieval, and API fetch logic are spread across multiple UI components.
- Evidence:
  - `apps/web/src/components/layout/AppLayout.tsx`
  - `apps/web/src/components/message/MessageList.tsx`
  - `apps/web/src/components/message/ThreadPanel.tsx`
- Refactor direction:
  - Move API calls into dedicated hooks.
  - Centralize auth header/token handling.
  - Normalize message cache/state handling.
- Impact: Easier feature development and fewer regressions.
- Effort: Medium.

## 3. ~~Socket Lifecycle Hardening~~ ✅ COMPLETED
- Why: `useSocket` has async connection setup that can race with cleanup and listener registration.
- Evidence:
  - `apps/web/src/hooks/useSocket.ts`
- Improve:
  - Explicit connect/disconnect lifecycle management.
  - Reconnect strategy.
  - Safer listener registration patterns.
- Impact: Reduces flaky realtime behavior.
- Effort: Low to medium.

## 4. ~~UI System Cleanup~~ ✅ COMPLETED
- Why: Core layout and message UI rely heavily on inline styles.
- Evidence:
  - `apps/web/src/components/layout/Sidebar.tsx`
  - `apps/web/src/components/layout/AppLayout.tsx`
  - `apps/web/src/components/message/MessageItem.tsx`
- Refactor direction:
  - Move style primitives into tokens and reusable styles.
  - Improve consistency and responsiveness.
- Impact: Faster UI iteration and cleaner component code.
- Effort: Medium.

## 5. ~~Message & Channel Search~~ ✅ COMPLETED
- Why: Users have no way to find past messages or navigate large channel histories.
- Add:
  - Full-text search API endpoint over messages.
  - Search UI with results linking back to the source channel/thread.
  - Filter by channel, user, date range.
- Impact: Core productivity feature — essential for any chat app beyond trivial use.
- Effort: Medium.

## 6. ~~Unread Counts & Read Tracking~~ ✅ COMPLETED
- Why: Without read tracking, users can't tell which channels or threads have new activity.
- Add:
  - Server-side read-position tracking per user per channel/thread.
  - Unread count badges on channels in the sidebar.
  - Unread indicator on threads.
  - Mark-as-read on channel/thread view.
- Impact: High — drives engagement and reduces missed messages.
- Effort: Medium.

## 7. ~~Presence & Last-Seen Indicators~~ ✅ COMPLETED
- Why: Users can't tell who is online or recently active.
- Add:
  - Track online/offline status via Socket.IO connect/disconnect.
  - Last-seen timestamp per user.
  - Presence dots in sidebar, member lists, and message avatars.
- Impact: Makes the app feel alive and supports real-time collaboration.
- Effort: Low to medium.

## 8. Ops and Quality Improvements
- Why: Lint and typecheck are clean, but CI workflow coverage appears absent.
- Evidence:
  - No `.github/workflows` detected during repo scan.
- Add:
  - CI for lint/typecheck/API e2e/web e2e smoke checks.
  - Structured API logging.
- Impact: Higher release confidence and easier debugging.
- Effort: Low to medium.

## 9. ~~Workspace & Channel Authorization Hardening~~ ✅ COMPLETED
- Why: Workspace-scoped channel/message operations currently trust route params and do not consistently enforce workspace/channel membership.
- Evidence:
  - `apps/api/src/workspaces/scoped-routes.ts`
  - `apps/api/src/channels/routes.ts`
  - `apps/api/src/messages/channel-routes.ts`
  - `apps/api/src/messages/routes.ts`
- Add:
  - Enforce workspace membership on all workspace-scoped endpoints.
  - Verify channel belongs to `:slug` workspace.
  - Enforce channel membership for message/reaction/read flows.
- Impact: Prevents cross-workspace data exposure and unauthorized reads/writes.
- Effort: Medium.

## 10. ~~Attachment Download Access Control~~ ✅ COMPLETED
- Why: Attachment download route is public and does not require auth or membership checks.
- Evidence:
  - `apps/api/src/uploads/download-routes.ts`
- Add:
  - Require auth for download requests.
  - Authorize access via attachment -> message -> channel -> membership chain.
  - Keep redirect-based download after authorization succeeds.
- Impact: Closes a direct file-leak vector.
- Effort: Low to medium.

## 11. ~~Message Delete + Attachment Lifecycle Transaction Safety~~ ✅ COMPLETED
- Why: Attachment deletion runs before ownership-checked message deletion, and create/link flows are not fully atomic.
- Evidence:
  - `apps/api/src/messages/service.ts`
  - `apps/api/src/uploads/service.ts`
- Add:
  - Check ownership before deleting attachments from storage.
  - Wrap message create/reply + attachment link in DB transactions.
  - Fail message creation when requested attachments cannot be linked.
- Impact: Prevents destructive side effects and partial-write inconsistencies.
- Effort: Medium.

## 12. ~~Invite Acceptance Idempotency & Race Safety~~ ✅ COMPLETED
- Why: Invite use count increments even on idempotent re-accept flows and can race under concurrent accepts.
- Evidence:
  - `apps/api/src/workspaces/invite-service.ts`
- Add:
  - Make invite accept flow transactional.
  - Increment `useCount` only when membership is newly inserted.
  - Enforce `maxUses` safely under concurrency.
- Impact: Preserves invite correctness and prevents accidental over-consumption.
- Effort: Medium.

## 13. ~~DB Indexes for Message/Unread Hot Paths~~ ✅ COMPLETED
- Why: High-frequency queries rely on filter/sort patterns not fully covered by current indexes.
- Evidence:
  - `apps/api/src/messages/schema.ts`
  - `apps/api/src/messages/service.ts`
  - `apps/api/src/channels/schema.ts`
  - `apps/api/src/channels/read-positions-service.ts`
- Add:
  - Composite message indexes for channel + parent + created-at pagination paths.
  - Secondary index for `channel_members(user_id, channel_id)` lookups.
- Impact: Better latency and scalability for core chat reads.
- Effort: Low to medium.

## 14. ~~Complete Pagination UX for Channels and Threads~~ ✅ COMPLETED
- Why: API supports cursor pagination, but web fetches only first page for channels/threads.
- Evidence:
  - `apps/web/src/hooks/chat/useChannelMessages.ts`
  - `apps/web/src/hooks/chat/useThreadMessages.ts`
  - `apps/web-e2e/tests/message-pagination.spec.ts`
- Add:
  - Track and store `nextCursor` by channel/thread.
  - Add load-older / infinite-scroll behavior.
  - Preserve scroll anchor when prepending older messages.
- Impact: Makes long histories and threads usable.
- Effort: Medium.

## 15. Orphan Attachment Cleanup
- Why: Uploads are persisted before message send and can remain unattached indefinitely.
- Evidence:
  - `apps/api/src/uploads/service.ts`
  - `apps/web/src/hooks/useFileUpload.ts`
- Add:
  - TTL cleanup job for unattached uploads.
  - API to delete unattached attachments owned by uploader.
- Impact: Reduces storage bloat and stale object risk.
- Effort: Medium.

## 17. ~~Abuse Controls (Rate Limiting)~~ ✅ COMPLETED
- Why: High-impact endpoints currently have no visible request throttling.
- Evidence:
  - `apps/api/src/app.ts`
  - `apps/api/src/messages/channel-routes.ts`
  - `apps/api/src/uploads/routes.ts`
  - `apps/api/src/workspaces/invite-routes.ts`
- Add:
  - Per-user/IP rate limits for uploads, message sends, and invite management.
  - Clear `429` behavior and retry semantics.
- Impact: Improves resilience against abuse and accidental overload.
- Effort: Low to medium.

## 18. ~~User Profile Sidebar~~ ✅ COMPLETED
- Why: Clicking a user avatar anywhere (messages, member lists) should open a right sidebar — similar to Slaq's profile panel — showing the user's avatar, display name, email, role, presence status, and local time.
- Evidence:
  - `apps/web/src/components/message/MessageItem.tsx` — avatars are rendered but not clickable
  - `apps/web/src/components/message/ThreadPanel.tsx` — existing right-sidebar pattern (400px, border-l, flex column with header/content)
  - `apps/web/src/components/layout/AppLayout.tsx` — layout conditionally renders ThreadPanel on the right; same slot can host a profile sidebar
  - `apps/web/src/state/chat-store.tsx` — presence data already tracked per user; would need `activeProfileUserId` state
  - `apps/web/src/components/ui/avatar.tsx` — reusable Avatar component (sm/md/lg, rounded/circle)
  - `apps/api/src/workspaces/member-routes.ts` — `GET /members` returns id, displayName, email, avatarUrl, role
- Add:
  - `UserProfileSidebar` component following ThreadPanel's structure (header with close button, scrollable content).
  - Display: large avatar, display name, email, workspace role, presence status (online/offline + last seen), account creation date.
  - Make avatars/names in MessageItem clickable to set `activeProfileUserId` in chat store.
  - Show profile sidebar in AppLayout's right slot (mutually exclusive with or stacked alongside ThreadPanel).
- Impact: Core social feature — lets users see who they're talking to without leaving the conversation.
- Effort: Medium.

## 19. ~~Channel Member Count & Member List Dialog~~ ✅ COMPLETED
- Why: Channel headers currently show only the channel name. Users have no visibility into who is in a channel or how many members it has.
- Evidence:
  - `apps/web/src/components/channel/ChannelHeader.tsx` — renders only `# channelName`, no metadata
  - `apps/api/src/channels/schema.ts` — `channelMembers` table exists with (channelId, userId) composite PK
  - `apps/api/src/channels/routes.ts` — no endpoint to list channel members or get member count
  - `apps/api/src/channels/service.ts` — has `isChannelMember`, `joinChannel`, `leaveChannel` but no `listMembers` or `countMembers`
  - `apps/web/src/pages/WorkspaceSettings.tsx` — existing workspace member list UI pattern (avatar + name + email + role) to follow
  - `apps/web/src/components/ui/dialog.tsx` — reusable Dialog component (Radix-based)
- Add:
  - API: `GET /channels/:id/members` endpoint with cursor pagination and search query param; include member count in channel list response.
  - Frontend: Show member count badge/icon in ChannelHeader (top right).
  - Click member count to open a dialog with paginated member list, search input, and infinite scroll.
  - Each member row: avatar, display name, email, presence indicator.
- Impact: Essential channel awareness feature — users need to know who can see their messages.
- Effort: Medium.

## 20. ~~User Settings Dialog~~ ✅ COMPLETED
- Why: User account settings (profile picture, display name) are currently handled entirely by Stack Auth's built-in UI (`/handler/account-settings`), which navigates away from the app and doesn't match the app's look and feel.
- Evidence:
  - `apps/web/src/components/layout/Sidebar.tsx` — renders `<UserButton showUserInfo />` from `@stackframe/react`
  - `apps/web/src/App.tsx` — mounts `<StackHandler>` at `/handler/*` routes for Stack Auth's built-in pages
  - `apps/api/src/users/routes.ts` — only `GET /users/me`, no update endpoint
  - `apps/api/src/users/schema.ts` — users table has `displayName`, `email`, `avatarUrl` columns
  - `apps/web/src/stack.ts` — Stack Auth client app config
- Add:
  - Disable or remove `/handler/account-settings` route.
  - Add a custom menu item to Stack Auth's `<UserButton>` that opens an in-app settings dialog.
  - Settings dialog: edit display name, upload/change profile picture, view email (read-only from Stack Auth).
  - API: `PATCH /users/me` endpoint to update displayName and avatarUrl in local DB + sync to Stack Auth.
- Impact: Keeps users in the app and provides a consistent, branded settings experience.
- Effort: Medium.

## 21. ~~Dark Mode with Toggle~~ ✅ COMPLETED
- Why: No dark mode support exists. All colors are hardcoded light values. Many users prefer dark mode, especially for a chat app used throughout the day.
- Evidence:
  - `apps/web/src/index.css` — Tailwind CSS 4.2 with `@theme` block defining custom colors; no dark variant colors defined
  - `apps/web/src/components/ui/` — all UI components use hardcoded light Tailwind classes (`bg-white`, `text-gray-700`, `border-gray-200`, etc.)
  - `apps/web/src/components/message/EmojiPicker.tsx` — emoji picker hardcoded to `theme="light"`
  - `apps/web/src/components/layout/Sidebar.tsx` — sidebar uses hardcoded dark background (`bg-[#3F0E40]`); ironically already "dark" but not part of a theme system
  - No theme context provider or CSS variable system for theme switching
- Add:
  - Define CSS custom properties for all theme colors (background, text, border, surface, accent) with light/dark values.
  - Add a ThemeProvider context that reads/persists preference to localStorage.
  - Add a theme toggle in the sidebar or user menu.
  - Update all components to use theme CSS variables instead of hardcoded colors.
  - Set emoji picker and Stack Auth theme dynamically based on current mode.
- Impact: High user comfort and accessibility — standard expectation for modern chat apps.
- Effort: High (touches most UI components).

## 22. ~~Web Notifications~~ ✅ COMPLETED
- Why: Users have no way to know about new messages when the browser tab is not focused. No notification infrastructure exists.
- Evidence:
  - No Notification API usage, service worker, or push subscription code anywhere in the codebase
  - `apps/web/src/socket/` — Socket.IO events (`message:new`, `reaction:updated`, etc.) are the natural trigger points
  - `apps/web/src/hooks/chat/useUnreadTracking.ts` — already tracks which channels are "active" vs inactive; can gate notifications on this
  - `apps/web/src/state/chat-store.tsx` — has `activeChannelId` and `activeThreadId` to determine if user is viewing the relevant conversation
  - `apps/web/index.html` — no manifest or service worker registration
- Add:
  - Request Notification API permission (with UI prompt/setting to enable/disable).
  - Show browser notifications on `message:new` events when: tab is not focused OR message is in a non-active channel.
  - Notification content: sender name, message preview, channel name.
  - Click notification to focus tab and navigate to the relevant channel/thread.
  - User preference to enable/disable notifications (stored in localStorage or user settings).
  - Optional: Add a notification sound.
- Impact: Critical for engagement — without notifications, users must actively poll the app for new messages.
- Effort: Medium.

## 23. Web E2E Test Speed & Flakiness
- Why: The suite has hardcoded `waitForTimeout` delays, elevated expect timeouts, and per-test workspace creation that slow runs and cause timing-dependent flakiness.
- Impact: Faster CI feedback loop and fewer false-red test runs.
- Effort: Medium.

## 24. Web E2E Test Coverage
- Why: Many UI flows and components lack E2E test coverage. Increasing lines of code exercised by Playwright tests will catch regressions earlier.
- Add:
  - Identify uncovered pages and components via coverage reports (`bun run coverage:web`).
  - Add new tests and expand existing tests to cover untested flows.
  - Target high-value areas: channel creation, settings, search, threads, presence, dark mode, pagination.
- Impact: Higher confidence in UI correctness and fewer shipped regressions.
- Effort: Medium to high.

## 25. ~~Move Reply Button to Hover Action Bar~~ ✅ COMPLETED
- Why: Each message currently shows a persistent reply button underneath it, adding visual clutter. Slaq-style behavior shows reply (and other actions) only in a hover popup bar at the top-right of the message — the same bar where the emoji reaction picker already lives.
- Add:
  - Move the "Reply" / "Reply in thread" action into the existing hover action bar alongside the emoji picker button.
  - Remove the always-visible reply button from below messages.
  - Ensure the hover bar appears on mouse enter and hides on mouse leave.
- Impact: Cleaner message list UI that matches user expectations from Slaq.
- Effort: Low.

## 26. ~~Collapsible Channels & DMs Lists in Sidebar~~ ✅ COMPLETED
- Why: The sidebar always shows the full Channels and DMs lists expanded. As the number of channels and DMs grows, the sidebar becomes long and hard to navigate.
- Add:
  - Make the "Channels" and "Direct Messages" section headers clickable to toggle collapse/expand.
  - Add a chevron indicator showing collapsed/expanded state.
  - Persist collapse state in localStorage so it survives page reloads.
- Impact: Better sidebar usability, especially as workspace grows.
- Effort: Low.

## 27. ~~Create Channel from Sidebar~~ ✅ COMPLETED
- Why: Only workspace admins or settings pages offer channel creation. Any workspace member should be able to create a channel quickly from the sidebar.
- Add:
  - Show a "+" button on the right side of the "Channels" section header on hover.
  - Clicking "+" opens a small dialog with just a channel name input and Create/Cancel buttons.
  - On submit, call the create channel API and navigate to the new channel.
- Impact: Removes friction for channel creation — a core collaborative workflow.
- Effort: Low.

## 28. ~~Day Separator Lines in Message List~~ ✅ COMPLETED
- Why: Long message histories have no visual separation between days, making it hard to orient in time. Slaq shows horizontal lines with a date label between messages from different days.
- Add:
  - When rendering messages, detect when the date changes between consecutive messages.
  - Insert a horizontal rule with a centered date label (e.g., "Wednesday, February 18") between messages from different days.
  - Apply to both channel message lists and thread panels.
- Impact: Improves readability and time orientation in long conversations.
- Effort: Low.

## 29. ~~Fix Emoji Picker Positioning on Hover Action Bar~~ ✅ COMPLETED
- Why: When hovering over a message and clicking the emoji picker button in the top-right action bar, the picker opens mostly off-screen (clipped by viewport edge).
- Add:
  - Fix emoji picker positioning to account for viewport boundaries.
  - Picker should open downward and leftward (or adjust dynamically) so it stays fully visible.
  - Test with messages near the top, bottom, and right edges of the viewport.
- Impact: Emoji reactions are currently unusable for many messages due to the picker being off-screen.
- Effort: Low.

## 30. ~~Demo Mode (No Auth, Frontend Only)~~ ✅ COMPLETED
- Why: Product demos and UX exploration are currently gated by full auth + backend setup, which increases friction for quick previews.
- Add:
  - A frontend-only demo mode toggle/env flag that bypasses auth requirements.
  - Seeded in-memory/mock data for workspaces, channels, DMs, and messages.
  - Clear visual indicator that demo mode is active and non-persistent.
  - Guardrails to ensure demo mode is disabled in production builds.
- Impact: Faster demos, onboarding, and design iteration without backend dependencies.
- Effort: Medium.

## 31. ~~Internal Admin Dashboard~~ ✅ COMPLETED
- Why: There is no centralized internal surface to inspect system health and perform operational user/workspace actions.
- Add:
  - Admin-only dashboard route with metrics (user count, workspace count, active channels/messages).
  - User and workspace tables with search/filter and key metadata.
  - Safe impersonation flow for support/debugging with full audit logging.
  - Access controls and server-side authorization checks for all admin actions.
- Impact: Improves internal operations, support response time, and incident triage.
- Effort: Medium to high.

## 32. Clone Slaq Huddles
- Why: The app lacks lightweight in-channel voice collaboration, forcing users to leave the product for quick syncs.
- Add:
  - Channel-level huddle start/join/leave UX with participant presence.
  - WebRTC-based audio rooms with signaling via existing realtime infrastructure.
  - Mute/unmute, active speaker indication, and device selection controls.
  - Permission model, reconnect behavior, and huddle lifecycle state in API/socket events.
- Impact: Major collaboration upgrade that keeps synchronous communication in-product.
- Effort: High.

## 33. Bots (Like Slaqbot)
- Why: There is no automation or assistant layer for reminders, canned workflows, and system/user guidance inside conversations.
- Add:
  - Bot framework with event subscriptions (message posted, user joined, channel created, etc.).
  - Built-in assistant bot for help, onboarding tips, reminders, and lightweight commands.
  - Command parsing and slash-command style UX for bot interactions.
  - Bot identity, permission scoping, and admin controls for enabling/disabling bots.
- Impact: Improves productivity, onboarding, and extensibility via conversational automation.
- Effort: High.

## 34. ~~Private Channels~~ ✅ COMPLETED
- Why: All channels are effectively open to workspace members, so teams cannot isolate sensitive conversations.
- Add:
  - Channel visibility model (`public` vs `private`) in schema and API contracts.
  - Private-channel membership controls (invite-only, add/remove members, owner/admin rules).
  - Authorization enforcement across channel listing, message reads/writes, search, and notifications.
  - UI indicators and creation/edit flows for private channels in sidebar and settings.
- Impact: Critical for real-world workspace security and team boundary management.
- Effort: Medium to high.

## 35. ~~@Mentions~~ ✅ COMPLETED
- Why: Users cannot direct messages at specific people or get notified when someone references them. There is no `@user` autocomplete in the editor or special rendering/notification handling for mentions.
- Add:
  - Tiptap `@mention` extension with autocomplete dropdown that searches workspace members.
  - Store mentions as structured nodes in message content (not plain text).
  - Render mentions as styled, clickable badges in message display.
  - Trigger notifications (browser + unread) when a user is mentioned in a channel they belong to.
  - Support `@here` and `@channel` for notifying all members of the current channel.
- Impact: Core communication feature — lets users direct attention and get notified when addressed.
- Effort: Medium.

## 36. ~~Redesign Landing (`/`) and Workspace Creation Flow~~ ✅ COMPLETED
- Why: The current `/` page feels sparse and does not expose key account controls in-context. Workspace creation is embedded on the same page, which makes the flow feel cramped and less focused.
- Add:
  - Redesign the `/` page with a richer layout, stronger visual hierarchy, and more informative/engaging content so it no longer feels empty.
  - Add the app's custom `UserButton` to the top-right of `/`.
  - Ensure this custom `UserButton` includes:
    - Theme toggle control.
    - Account settings dialog entrypoint.
  - Move "Create a workspace" into a dedicated route/page (instead of inline on `/`).
  - Update `/` CTAs/navigation to send users to the new workspace-creation page.
- Impact: Improves first impression, clarifies account actions, and creates a cleaner, more focused onboarding flow.
- Effort: Medium.
