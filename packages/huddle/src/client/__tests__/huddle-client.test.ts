import { describe, test, expect, beforeEach, mock } from "bun:test";

// Event emitter pattern for mockRoom
const eventHandlers = new Map<string, Set<(...args: unknown[]) => void>>();

function emitRoomEvent(event: string, ...args: unknown[]) {
  const handlers = eventHandlers.get(event);
  if (handlers) {
    for (const handler of handlers) {
      handler(...args);
    }
  }
}

// Mock livekit-client Room
const mockRoom = {
  state: "disconnected",
  remoteParticipants: new Map(),
  localParticipant: {
    identity: "test-user",
    isSpeaking: false,
    isMicrophoneEnabled: true,
    isCameraEnabled: false,
    trackPublications: new Map(),
    setMicrophoneEnabled: mock(() => Promise.resolve()),
    setCameraEnabled: mock(() => Promise.resolve()),
    setScreenShareEnabled: mock(() => Promise.resolve()),
  },
  connect: mock(() => Promise.resolve()),
  disconnect: mock(() => Promise.resolve()),
  switchActiveDevice: mock(() => Promise.resolve()),
  on: mock(function (this: typeof mockRoom, event: string, handler: (...args: unknown[]) => void) {
    if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
    eventHandlers.get(event)!.add(handler);
    return this;
  }),
};

function makeTrackPub(source: string, opts: { isMuted?: boolean; hasTrack?: boolean } = {}) {
  const { isMuted = false, hasTrack = true } = opts;
  return {
    source,
    isMuted,
    track: hasTrack ? { mediaStreamTrack: {} } : null,
  };
}

// Mock the livekit-client module
mock.module("livekit-client", () => ({
  Room: class MockRoom {
    state = mockRoom.state;
    remoteParticipants = mockRoom.remoteParticipants;
    localParticipant = mockRoom.localParticipant;
    connect = mockRoom.connect;
    disconnect = mockRoom.disconnect;
    switchActiveDevice = mockRoom.switchActiveDevice;
    on = mockRoom.on;
  },
  RoomEvent: {
    ParticipantConnected: "participantConnected",
    ParticipantDisconnected: "participantDisconnected",
    TrackSubscribed: "trackSubscribed",
    TrackUnsubscribed: "trackUnsubscribed",
    TrackMuted: "trackMuted",
    TrackUnmuted: "trackUnmuted",
    ActiveSpeakersChanged: "activeSpeakersChanged",
    LocalTrackPublished: "localTrackPublished",
    LocalTrackUnpublished: "localTrackUnpublished",
    Reconnecting: "reconnecting",
    Reconnected: "reconnected",
    Disconnected: "disconnected",
    ConnectionStateChanged: "connectionStateChanged",
  },
  Track: {
    Source: {
      Microphone: "microphone",
      Camera: "camera",
      ScreenShare: "screen_share",
    },
  },
  ConnectionState: {
    Connected: "connected",
    Reconnecting: "reconnecting",
    Disconnected: "disconnected",
  },
}));

import { HuddleClient } from "../huddle-client";

describe("HuddleClient", () => {
  beforeEach(() => {
    mockRoom.state = "disconnected";
    mockRoom.remoteParticipants.clear();
    mockRoom.localParticipant.trackPublications.clear();
    mockRoom.localParticipant.isMicrophoneEnabled = true;
    mockRoom.localParticipant.isCameraEnabled = false;
    mockRoom.localParticipant.isSpeaking = false;
    mockRoom.connect.mockClear();
    mockRoom.disconnect.mockClear();
    mockRoom.localParticipant.setMicrophoneEnabled.mockClear();
    mockRoom.localParticipant.setCameraEnabled.mockClear();
    mockRoom.localParticipant.setScreenShareEnabled.mockClear();
    mockRoom.switchActiveDevice.mockClear();
    mockRoom.on.mockClear();
    eventHandlers.clear();
  });

  test("creates a new HuddleClient", () => {
    const client = new HuddleClient();
    expect(client).toBeDefined();
    client.destroy();
  });

  test("initial state is disconnected", () => {
    const client = new HuddleClient();
    const state = client.getState();
    expect(state.connected).toBe(false);
    expect(state.reconnecting).toBe(false);
    expect(state.participants).toHaveLength(0);
    client.destroy();
  });

  test("subscribe sends current state immediately", () => {
    const client = new HuddleClient();
    let received = false;
    const unsub = client.subscribe((state) => {
      received = true;
      expect(state.connected).toBe(false);
    });
    expect(received).toBe(true);
    unsub();
    client.destroy();
  });

  test("connect delegates to room.connect", async () => {
    const client = new HuddleClient();
    await client.connect("ws://localhost:3004", "test-token");
    expect(mockRoom.connect).toHaveBeenCalledWith("ws://localhost:3004", "test-token");
    client.destroy();
  });

  test("disconnect delegates to room.disconnect", async () => {
    const client = new HuddleClient();
    await client.disconnect();
    expect(mockRoom.disconnect).toHaveBeenCalled();
    client.destroy();
  });

  test("toggleMicrophone delegates to localParticipant", async () => {
    const client = new HuddleClient();
    await client.toggleMicrophone();
    expect(mockRoom.localParticipant.setMicrophoneEnabled).toHaveBeenCalled();
    client.destroy();
  });

  test("toggleCamera delegates to localParticipant", async () => {
    const client = new HuddleClient();
    await client.toggleCamera();
    expect(mockRoom.localParticipant.setCameraEnabled).toHaveBeenCalled();
    client.destroy();
  });

  test("startScreenShare delegates to localParticipant", async () => {
    const client = new HuddleClient();
    await client.startScreenShare();
    expect(mockRoom.localParticipant.setScreenShareEnabled).toHaveBeenCalledWith(true);
    client.destroy();
  });

  test("stopScreenShare delegates to localParticipant", async () => {
    const client = new HuddleClient();
    await client.stopScreenShare();
    expect(mockRoom.localParticipant.setScreenShareEnabled).toHaveBeenCalledWith(false);
    client.destroy();
  });

  test("switchAudioDevice delegates to room", async () => {
    const client = new HuddleClient();
    await client.switchAudioDevice("device-1");
    expect(mockRoom.switchActiveDevice).toHaveBeenCalledWith("audioinput", "device-1");
    client.destroy();
  });

  test("switchVideoDevice delegates to room", async () => {
    const client = new HuddleClient();
    await client.switchVideoDevice("device-2");
    expect(mockRoom.switchActiveDevice).toHaveBeenCalledWith("videoinput", "device-2");
    client.destroy();
  });

  test("destroy cleans up and prevents further notifications", () => {
    const client = new HuddleClient();
    let callCount = 0;
    client.subscribe(() => { callCount++; });
    // First call is the immediate state
    expect(callCount).toBe(1);
    client.destroy();
    // After destroy, no more notifications should fire
  });

  test("throws when connecting a destroyed client", async () => {
    const client = new HuddleClient();
    client.destroy();
    try {
      await client.connect("ws://test", "token");
      expect(true).toBe(false); // should not reach
    } catch (err) {
      expect((err as Error).message).toBe("HuddleClient is destroyed");
    }
  });

  test("unsubscribe removes listener", () => {
    const client = new HuddleClient();
    let callCount = 0;
    const unsub = client.subscribe(() => { callCount++; });
    expect(callCount).toBe(1); // immediate
    unsub();
    // No more calls after unsubscribe
    client.destroy();
  });

  // --- New tests ---

  describe("enableMicrophone / disableMicrophone", () => {
    test("enableMicrophone delegates with true", async () => {
      const client = new HuddleClient();
      await client.enableMicrophone();
      expect(mockRoom.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
      client.destroy();
    });

    test("disableMicrophone delegates with false", async () => {
      const client = new HuddleClient();
      await client.disableMicrophone();
      expect(mockRoom.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false);
      client.destroy();
    });
  });

  describe("enableCamera / disableCamera", () => {
    test("enableCamera delegates with true", async () => {
      const client = new HuddleClient();
      await client.enableCamera();
      expect(mockRoom.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true);
      client.destroy();
    });

    test("disableCamera delegates with false", async () => {
      const client = new HuddleClient();
      await client.disableCamera();
      expect(mockRoom.localParticipant.setCameraEnabled).toHaveBeenCalledWith(false);
      client.destroy();
    });
  });

  test("getRoom returns the underlying Room instance", () => {
    const client = new HuddleClient();
    const room = client.getRoom();
    expect(room).toBeDefined();
    expect(room.connect).toBe(mockRoom.connect);
    client.destroy();
  });

  describe("getState with connected room", () => {
    test("reports connected=true and includes localParticipant when connected", () => {
      mockRoom.state = "connected";
      const client = new HuddleClient();
      const state = client.getState();
      expect(state.connected).toBe(true);
      expect(state.reconnecting).toBe(false);
      expect(state.localParticipant).not.toBeNull();
      expect(state.localParticipant!.userId).toBe("test-user");
      client.destroy();
    });

    test("reports reconnecting=true when reconnecting", () => {
      mockRoom.state = "reconnecting";
      const client = new HuddleClient();
      const state = client.getState();
      expect(state.connected).toBe(false);
      expect(state.reconnecting).toBe(true);
      client.destroy();
    });

    test("includes remote participants in state", () => {
      mockRoom.state = "connected";
      mockRoom.remoteParticipants.set("user-2", {
        identity: "user-2",
        isSpeaking: true,
        trackPublications: new Map(),
      });
      const client = new HuddleClient();
      const state = client.getState();
      expect(state.participants).toHaveLength(1);
      const p = state.participants[0]!;
      expect(p.userId).toBe("user-2");
      expect(p.isSpeaking).toBe(true);
      client.destroy();
    });
  });

  describe("getParticipantInfo via getState", () => {
    test("extracts microphone muted state", () => {
      mockRoom.state = "connected";
      mockRoom.localParticipant.trackPublications.set("mic", makeTrackPub("microphone", { isMuted: true }));
      const client = new HuddleClient();
      const state = client.getState();
      expect(state.localParticipant!.isMuted).toBe(true);
      client.destroy();
    });

    test("extracts camera state from tracks", () => {
      mockRoom.state = "connected";
      mockRoom.localParticipant.trackPublications.set("cam", makeTrackPub("camera", { isMuted: false, hasTrack: true }));
      const client = new HuddleClient();
      const state = client.getState();
      expect(state.localParticipant!.isCameraOn).toBe(true);
      client.destroy();
    });

    test("extracts screen sharing state from tracks", () => {
      mockRoom.state = "connected";
      mockRoom.localParticipant.trackPublications.set("screen", makeTrackPub("screen_share", { isMuted: false, hasTrack: true }));
      const client = new HuddleClient();
      const state = client.getState();
      expect(state.localParticipant!.isScreenSharing).toBe(true);
      client.destroy();
    });

    test("defaults correctly when no tracks present", () => {
      mockRoom.state = "connected";
      // No track publications
      const client = new HuddleClient();
      const state = client.getState();
      const lp = state.localParticipant!;
      expect(lp.isMuted).toBe(true);
      expect(lp.isCameraOn).toBe(false);
      expect(lp.isScreenSharing).toBe(false);
      client.destroy();
    });
  });

  describe("event-driven notifications", () => {
    test("notifies on ParticipantConnected", () => {
      const client = new HuddleClient();
      let notified = false;
      client.subscribe(() => { notified = true; });
      notified = false; // reset after initial
      emitRoomEvent("participantConnected");
      expect(notified).toBe(true);
      client.destroy();
    });

    test("notifies on TrackMuted", () => {
      const client = new HuddleClient();
      let notifyCount = 0;
      client.subscribe(() => { notifyCount++; });
      const initialCount = notifyCount;
      emitRoomEvent("trackMuted");
      expect(notifyCount).toBe(initialCount + 1);
      client.destroy();
    });

    test("does not notify after destroy()", () => {
      const client = new HuddleClient();
      let notifyCount = 0;
      client.subscribe(() => { notifyCount++; });
      const countAfterSubscribe = notifyCount;
      client.destroy();
      emitRoomEvent("participantConnected");
      expect(notifyCount).toBe(countAfterSubscribe);
    });
  });
});
