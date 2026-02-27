import { describe, expect, it } from "bun:test";
import { asChannelId, asUserId, type HuddleState } from "@openslaq/shared";
import {
  handleHuddleEnded,
  handleHuddleStarted,
  handleHuddleSync,
  handleHuddleUpdated,
  setCurrentHuddleChannel,
} from "../huddle";

const huddle: HuddleState = {
  channelId: asChannelId("ch-1"),
  participants: [
    {
      userId: asUserId("u-1"),
      joinedAt: "2026-01-01T00:00:00.000Z",
      isMuted: false,
      isCameraOn: true,
      isScreenSharing: false,
    },
  ],
  startedAt: "2026-01-01T00:00:00.000Z",
  livekitRoom: "huddle-ch-1",
  screenShareUserId: null,
  messageId: null,
};

describe("operations/huddle", () => {
  it("maps huddle lifecycle helpers to chat actions", () => {
    expect(handleHuddleSync({ huddles: [huddle] })).toEqual({ type: "huddle/sync", huddles: [huddle] });
    expect(handleHuddleStarted(huddle)).toEqual({ type: "huddle/started", huddle });
    expect(handleHuddleUpdated(huddle)).toEqual({ type: "huddle/updated", huddle });
    expect(handleHuddleEnded({ channelId: asChannelId("ch-1") })).toEqual({
      type: "huddle/ended",
      channelId: "ch-1",
    });
  });

  it("setCurrentHuddleChannel dispatches current-channel action", () => {
    const actions: Array<{ type: string; channelId: string | null }> = [];

    setCurrentHuddleChannel((action) => actions.push(action as never), "ch-1");
    setCurrentHuddleChannel((action) => actions.push(action as never), null);

    expect(actions).toEqual([
      { type: "huddle/setCurrentChannel", channelId: "ch-1" },
      { type: "huddle/setCurrentChannel", channelId: null },
    ]);
  });
});
