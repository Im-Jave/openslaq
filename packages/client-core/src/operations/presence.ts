import type { ChatAction } from "../chat-reducer";

interface PresenceSyncPayload {
  users: Array<{
    userId: string;
    status: "online" | "offline";
    lastSeenAt: string | null;
    statusEmoji?: string | null;
    statusText?: string | null;
    statusExpiresAt?: string | null;
  }>;
}

export function handlePresenceSync(payload: PresenceSyncPayload): ChatAction {
  return {
    type: "presence/sync",
    users: payload.users.map((u) => ({
      userId: u.userId,
      online: u.status === "online",
      lastSeenAt: u.lastSeenAt,
      statusEmoji: u.statusEmoji ?? null,
      statusText: u.statusText ?? null,
      statusExpiresAt: u.statusExpiresAt ?? null,
    })),
  };
}

interface PresenceUpdatePayload {
  userId: string;
  status: "online" | "offline";
  lastSeenAt: string | null;
}

export function handlePresenceUpdate(payload: PresenceUpdatePayload): ChatAction {
  return {
    type: "presence/updated",
    userId: payload.userId,
    online: payload.status === "online",
    lastSeenAt: payload.lastSeenAt,
  };
}

interface UserStatusUpdatedPayload {
  userId: string;
  statusEmoji: string | null;
  statusText: string | null;
  statusExpiresAt: string | null;
}

export function handleUserStatusUpdated(payload: UserStatusUpdatedPayload): ChatAction {
  return {
    type: "user/statusUpdated",
    userId: payload.userId,
    statusEmoji: payload.statusEmoji,
    statusText: payload.statusText,
    statusExpiresAt: payload.statusExpiresAt,
  };
}
