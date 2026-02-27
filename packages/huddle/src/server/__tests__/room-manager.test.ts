import { describe, test, expect, beforeEach, mock } from "bun:test";
import { LIVEKIT_ROOM_PREFIX } from "../../shared/constants";

// Mock RoomServiceClient
const mockCreateRoom = mock(() => Promise.resolve());
const mockDeleteRoom = mock(() => Promise.resolve());
const mockListParticipants = mock(() => Promise.resolve([]));
const mockRemoveParticipant = mock(() => Promise.resolve());

mock.module("livekit-server-sdk", () => ({
  RoomServiceClient: class MockRoomServiceClient {
    createRoom = mockCreateRoom;
    deleteRoom = mockDeleteRoom;
    listParticipants = mockListParticipants;
    removeParticipant = mockRemoveParticipant;
  },
}));

// Import after mock so the mock takes effect
const { RoomManager } = await import("../room-manager");

function makeManager() {
  return new RoomManager({ apiUrl: "http://localhost:7880", apiKey: "key", apiSecret: "secret", wsUrl: "ws://localhost:7880" });
}

describe("RoomManager", () => {
  beforeEach(() => {
    mockCreateRoom.mockReset();
    mockDeleteRoom.mockReset();
    mockListParticipants.mockReset();
    mockRemoveParticipant.mockReset();
    mockCreateRoom.mockResolvedValue(undefined);
    mockDeleteRoom.mockResolvedValue(undefined);
    mockListParticipants.mockResolvedValue([]);
    mockRemoveParticipant.mockResolvedValue(undefined);
  });

  describe("roomNameForChannel", () => {
    test("prefixes channel ID with huddle prefix", () => {
      const roomName = RoomManager.roomNameForChannel("channel-123");
      expect(roomName).toBe(`${LIVEKIT_ROOM_PREFIX}channel-123`);
    });

    test("generates consistent room names", () => {
      const a = RoomManager.roomNameForChannel("abc");
      const b = RoomManager.roomNameForChannel("abc");
      expect(a).toBe(b);
    });

    test("generates different names for different channels", () => {
      const a = RoomManager.roomNameForChannel("channel-1");
      const b = RoomManager.roomNameForChannel("channel-2");
      expect(a).not.toBe(b);
    });
  });

  describe("ensureRoom", () => {
    test("creates room with correct name and emptyTimeout", async () => {
      const mgr = makeManager();
      await mgr.ensureRoom("ch-1");
      expect(mockCreateRoom).toHaveBeenCalledWith({
        name: `${LIVEKIT_ROOM_PREFIX}ch-1`,
        emptyTimeout: 300,
      });
    });

    test("handles 'already exists' error gracefully", async () => {
      mockCreateRoom.mockRejectedValue(new Error("room already exists"));
      const mgr = makeManager();
      const roomName = await mgr.ensureRoom("ch-1");
      expect(roomName).toBe(`${LIVEKIT_ROOM_PREFIX}ch-1`);
    });

    test("re-throws non-'already exists' errors", async () => {
      mockCreateRoom.mockRejectedValue(new Error("connection refused"));
      const mgr = makeManager();
      await expect(mgr.ensureRoom("ch-1")).rejects.toThrow("connection refused");
    });
  });

  describe("deleteRoom", () => {
    test("deletes room with correct name", async () => {
      const mgr = makeManager();
      await mgr.deleteRoom("ch-1");
      expect(mockDeleteRoom).toHaveBeenCalledWith(`${LIVEKIT_ROOM_PREFIX}ch-1`);
    });

    test("handles missing room gracefully", async () => {
      mockDeleteRoom.mockRejectedValue(new Error("room not found"));
      const mgr = makeManager();
      // Should not throw
      await mgr.deleteRoom("ch-1");
    });
  });

  describe("listParticipants", () => {
    test("returns participants from RoomServiceClient", async () => {
      const participants = [{ identity: "user-1" }, { identity: "user-2" }] as never[];
      mockListParticipants.mockResolvedValue(participants);
      const mgr = makeManager();
      const result = await mgr.listParticipants("ch-1");
      expect(result).toEqual(participants);
      expect(mockListParticipants).toHaveBeenCalledWith(`${LIVEKIT_ROOM_PREFIX}ch-1`);
    });

    test("returns empty array on error", async () => {
      mockListParticipants.mockRejectedValue(new Error("room not found"));
      const mgr = makeManager();
      const result = await mgr.listParticipants("ch-1");
      expect(result).toEqual([]);
    });
  });

  describe("removeParticipant", () => {
    test("calls with correct room name and userId", async () => {
      const mgr = makeManager();
      await mgr.removeParticipant("ch-1", "user-42");
      expect(mockRemoveParticipant).toHaveBeenCalledWith(
        `${LIVEKIT_ROOM_PREFIX}ch-1`,
        "user-42",
      );
    });

    test("handles already-left participant gracefully", async () => {
      mockRemoveParticipant.mockRejectedValue(new Error("participant not found"));
      const mgr = makeManager();
      // Should not throw
      await mgr.removeParticipant("ch-1", "user-42");
    });
  });
});
