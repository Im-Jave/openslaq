# Product Backlog (Active)

How to use this doc:
- Track user-facing feature work that changes product capabilities.
- Keep only open or in-progress work here.
- Move completed initiatives to an archive snapshot.

## P-001: Slaq-like Huddles
- Status: Open
- Impact: High
- Owner: Product + Realtime team
- Estimate: High
- Dependencies: WebRTC architecture, signaling strategy, mobile parity plan
- Summary: Add lightweight in-channel voice huddles with join/leave UX and participant presence.
- Acceptance criteria:
  - Users can start, join, and leave a huddle from a channel.
  - Mute/unmute and active-speaker state are visible and reliable.
  - Reconnect and huddle teardown behavior are consistent across browser reconnects.

## P-002: Bot Platform and Assistant Bot
- Status: Open
- Impact: High
- Owner: Product + Platform team
- Estimate: High
- Dependencies: event subscription model, permission model, admin controls
- Summary: Build automation primitives plus a first-party assistant bot for reminders/help.
- Acceptance criteria:
  - Bots can subscribe to core chat events and post responses.
  - Workspace admins can enable/disable bots.
  - A built-in assistant bot supports at least help and reminder workflows.
