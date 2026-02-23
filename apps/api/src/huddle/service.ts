import type { HuddleState, HuddleParticipant, ChannelId } from "@openslack/shared";
import { asChannelId, asUserId } from "@openslack/shared";

// channelId → HuddleState
const activeHuddles = new Map<string, HuddleState>();

// userId → channelId (each user can only be in one huddle)
const userHuddle = new Map<string, string>();

export function startHuddle(channelId: string, userId: string): HuddleState {
  const existing = activeHuddles.get(channelId);
  if (existing) {
    return joinHuddle(channelId, userId);
  }

  // User must leave any existing huddle first
  leaveHuddle(userId);

  const participant: HuddleParticipant = {
    userId: asUserId(userId),
    isMuted: false,
    joinedAt: new Date().toISOString(),
  };

  const huddle: HuddleState = {
    channelId: asChannelId(channelId),
    participants: [participant],
    startedAt: new Date().toISOString(),
  };

  activeHuddles.set(channelId, huddle);
  userHuddle.set(userId, channelId);
  return huddle;
}

export function joinHuddle(channelId: string, userId: string): HuddleState {
  const huddle = activeHuddles.get(channelId);
  if (!huddle) {
    return startHuddle(channelId, userId);
  }

  // Already in this huddle
  if (huddle.participants.some((p) => p.userId === userId)) {
    return huddle;
  }

  // Leave any existing huddle
  leaveHuddle(userId);

  const participant: HuddleParticipant = {
    userId: asUserId(userId),
    isMuted: false,
    joinedAt: new Date().toISOString(),
  };

  huddle.participants.push(participant);
  userHuddle.set(userId, channelId);
  return huddle;
}

export interface LeaveResult {
  huddle: HuddleState | null;
  ended: boolean;
  channelId: ChannelId | null;
}

export function leaveHuddle(userId: string): LeaveResult {
  const channelId = userHuddle.get(userId);
  if (!channelId) {
    return { huddle: null, ended: false, channelId: null };
  }

  userHuddle.delete(userId);
  const huddle = activeHuddles.get(channelId);
  if (!huddle) {
    return { huddle: null, ended: false, channelId: asChannelId(channelId) };
  }

  huddle.participants = huddle.participants.filter((p) => p.userId !== userId);

  if (huddle.participants.length === 0) {
    activeHuddles.delete(channelId);
    return { huddle: null, ended: true, channelId: asChannelId(channelId) };
  }

  return { huddle, ended: false, channelId: asChannelId(channelId) };
}

export function setMuted(userId: string, isMuted: boolean): HuddleState | null {
  const channelId = userHuddle.get(userId);
  if (!channelId) return null;

  const huddle = activeHuddles.get(channelId);
  if (!huddle) return null;

  const participant = huddle.participants.find((p) => p.userId === userId);
  if (participant) {
    participant.isMuted = isMuted;
  }

  return huddle;
}

export function getHuddleForChannel(channelId: string): HuddleState | null {
  return activeHuddles.get(channelId) ?? null;
}

export function getUserHuddleChannel(userId: string): string | null {
  return userHuddle.get(userId) ?? null;
}

export function getActiveHuddlesForChannels(channelIds: string[]): HuddleState[] {
  const huddles: HuddleState[] = [];
  for (const channelId of channelIds) {
    const huddle = activeHuddles.get(channelId);
    if (huddle) {
      huddles.push(huddle);
    }
  }
  return huddles;
}

export function removeUserFromAllHuddles(userId: string): LeaveResult {
  return leaveHuddle(userId);
}

/** Reset all state — for testing only */
export function _resetForTests(): void {
  activeHuddles.clear();
  userHuddle.clear();
}
