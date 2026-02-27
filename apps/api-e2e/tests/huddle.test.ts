import { describe, test, expect, beforeEach } from "bun:test";
import {
  startHuddle,
  joinHuddle,
  leaveHuddle,
  setMuted,
  getHuddleForChannel,
  getUserHuddleChannel,
  getActiveHuddlesForChannels,
  removeUserFromAllHuddles,
  setHuddleMessageId,
  _resetForTests,
} from "../../api/src/huddle/service";
import { asChannelId, asUserId } from "@openslaq/shared";

const channel1 = asChannelId("huddle-ch-1");
const channel2 = asChannelId("huddle-ch-2");
const user1 = asUserId("huddle-user-1");
const user2 = asUserId("huddle-user-2");
const user3 = asUserId("huddle-user-3");

describe("huddle service", () => {
  beforeEach(() => {
    _resetForTests();
  });

  describe("startHuddle", () => {
    test("creates a new huddle with user as first participant", () => {
      const huddle = startHuddle(channel1, user1);
      expect(huddle.channelId).toBe(channel1);
      expect(huddle.participants).toHaveLength(1);
      expect(huddle.participants[0]!.userId).toBe(user1);
      expect(huddle.participants[0]!.isMuted).toBe(false);
      expect(huddle.participants[0]!.isCameraOn).toBe(false);
      expect(huddle.participants[0]!.isScreenSharing).toBe(false);
      expect(huddle.startedAt).toBeTruthy();
      expect(huddle.livekitRoom).toBeTruthy();
      expect(huddle.screenShareUserId).toBeNull();
    });

    test("returns existing huddle and adds user if huddle already exists", () => {
      startHuddle(channel1, user1);
      const huddle = startHuddle(channel1, user2);
      expect(huddle.participants).toHaveLength(2);
      expect(huddle.participants.map((p) => p.userId)).toContain(user1);
      expect(huddle.participants.map((p) => p.userId)).toContain(user2);
    });

    test("leaves existing huddle when starting a new one", () => {
      startHuddle(channel1, user1);
      startHuddle(channel2, user1);

      expect(getUserHuddleChannel(user1)).toBe(channel2);
      // channel1 huddle should have ended (no participants)
      expect(getHuddleForChannel(channel1)).toBeNull();
    });
  });

  describe("joinHuddle", () => {
    test("joins existing huddle", () => {
      startHuddle(channel1, user1);
      const huddle = joinHuddle(channel1, user2);
      expect(huddle.participants).toHaveLength(2);
    });

    test("starts huddle if none exists", () => {
      const huddle = joinHuddle(channel1, user1);
      expect(huddle.channelId).toBe(channel1);
      expect(huddle.participants).toHaveLength(1);
    });

    test("no-op if user already in the same huddle", () => {
      startHuddle(channel1, user1);
      const huddle = joinHuddle(channel1, user1);
      expect(huddle.participants).toHaveLength(1);
    });

    test("leaves current huddle when joining another", () => {
      startHuddle(channel1, user1);
      joinHuddle(channel1, user2);
      joinHuddle(channel2, user1);

      expect(getUserHuddleChannel(user1)).toBe(channel2);
      const ch1Huddle = getHuddleForChannel(channel1);
      expect(ch1Huddle?.participants).toHaveLength(1);
      expect(ch1Huddle?.participants[0]!.userId).toBe(user2);
    });
  });

  describe("leaveHuddle", () => {
    test("removes user from huddle", () => {
      startHuddle(channel1, user1);
      joinHuddle(channel1, user2);
      const result = leaveHuddle(user1);
      expect(result.ended).toBe(false);
      expect(result.huddle?.participants).toHaveLength(1);
      expect(result.channelId).toBe(channel1);
    });

    test("ends huddle when last participant leaves", () => {
      startHuddle(channel1, user1);
      const result = leaveHuddle(user1);
      expect(result.ended).toBe(true);
      expect(result.channelId).toBe(channel1);
      expect(getHuddleForChannel(channel1)).toBeNull();
    });

    test("returns no-op for user not in a huddle", () => {
      const result = leaveHuddle(user1);
      expect(result.ended).toBe(false);
      expect(result.channelId).toBeNull();
    });

    test("clears user huddle mapping", () => {
      startHuddle(channel1, user1);
      leaveHuddle(user1);
      expect(getUserHuddleChannel(user1)).toBeNull();
    });

    test("clears screenShareUserId when screen-sharing user leaves", () => {
      startHuddle(channel1, user1);
      const huddle = getHuddleForChannel(channel1)!;
      huddle.screenShareUserId = user1;

      const result = leaveHuddle(user1);

      expect(result.ended).toBe(true);
      expect(getHuddleForChannel(channel1)).toBeNull();
    });
  });

  describe("setMuted", () => {
    test("toggles mute state", () => {
      startHuddle(channel1, user1);
      const huddle = setMuted(user1, true);
      expect(huddle?.participants[0]!.isMuted).toBe(true);

      const huddle2 = setMuted(user1, false);
      expect(huddle2?.participants[0]!.isMuted).toBe(false);
    });

    test("returns null if user not in a huddle", () => {
      expect(setMuted(user1, true)).toBeNull();
    });
  });

  describe("getHuddleForChannel", () => {
    test("returns huddle for active channel", () => {
      startHuddle(channel1, user1);
      const huddle = getHuddleForChannel(channel1);
      expect(huddle).not.toBeNull();
      expect(huddle!.channelId).toBe(channel1);
    });

    test("returns null for channel with no huddle", () => {
      expect(getHuddleForChannel(channel1)).toBeNull();
    });
  });

  describe("getUserHuddleChannel", () => {
    test("returns channel for user in a huddle", () => {
      startHuddle(channel1, user1);
      expect(getUserHuddleChannel(user1)).toBe(channel1);
    });

    test("returns null for user not in a huddle", () => {
      expect(getUserHuddleChannel(user1)).toBeNull();
    });
  });

  describe("getActiveHuddlesForChannels", () => {
    test("returns all active huddles for given channels", () => {
      startHuddle(channel1, user1);
      startHuddle(channel2, user2);
      const huddles = getActiveHuddlesForChannels([channel1, channel2]);
      expect(huddles).toHaveLength(2);
    });

    test("returns empty array when no huddles active", () => {
      expect(getActiveHuddlesForChannels([channel1])).toHaveLength(0);
    });

    test("only returns huddles for requested channels", () => {
      startHuddle(channel1, user1);
      startHuddle(channel2, user2);
      const huddles = getActiveHuddlesForChannels([channel1]);
      expect(huddles).toHaveLength(1);
      expect(huddles[0]!.channelId).toBe(channel1);
    });
  });

  describe("removeUserFromAllHuddles", () => {
    test("removes user and returns result", () => {
      startHuddle(channel1, user1);
      joinHuddle(channel1, user2);
      const result = removeUserFromAllHuddles(user1);
      expect(result.channelId).toBe(channel1);
      expect(result.ended).toBe(false);
    });

    test("ends huddle if user was last participant", () => {
      startHuddle(channel1, user1);
      const result = removeUserFromAllHuddles(user1);
      expect(result.ended).toBe(true);
    });
  });

  describe("messageId and participantHistory", () => {
    test("startHuddle initializes messageId as null", () => {
      const huddle = startHuddle(channel1, user1);
      expect(huddle.messageId).toBeNull();
    });

    test("setHuddleMessageId stores messageId on huddle", () => {
      startHuddle(channel1, user1);
      setHuddleMessageId(channel1, "msg-123");
      const huddle = getHuddleForChannel(channel1);
      expect(huddle!.messageId).toBe("msg-123");
    });

    test("leaveHuddle returns messageId and participantHistory when huddle ends", () => {
      startHuddle(channel1, user1);
      joinHuddle(channel1, user2);
      setHuddleMessageId(channel1, "msg-456");
      leaveHuddle(user2);
      const result = leaveHuddle(user1);
      expect(result.ended).toBe(true);
      expect(result.messageId).toBe("msg-456");
      expect(result.startedAt).toBeTruthy();
      expect(result.participantHistory).toContain(user1);
      expect(result.participantHistory).toContain(user2);
    });

    test("leaveHuddle returns null messageId when no message was set", () => {
      startHuddle(channel1, user1);
      const result = leaveHuddle(user1);
      expect(result.ended).toBe(true);
      expect(result.messageId).toBeNull();
      expect(result.participantHistory).toContain(user1);
    });
  });

  describe("one-huddle-per-user constraint", () => {
    test("user can only be in one huddle at a time", () => {
      startHuddle(channel1, user1);
      joinHuddle(channel2, user1);

      expect(getUserHuddleChannel(user1)).toBe(channel2);
      // Channel1 huddle should be gone since user1 was the only participant
      expect(getHuddleForChannel(channel1)).toBeNull();
    });

    test("multiple users in same huddle works", () => {
      startHuddle(channel1, user1);
      joinHuddle(channel1, user2);
      joinHuddle(channel1, user3);

      const huddle = getHuddleForChannel(channel1);
      expect(huddle?.participants).toHaveLength(3);
    });
  });
});
