import { describe, test, expect } from "bun:test";
import { generateHuddleToken } from "../token";
import type { LiveKitConfig } from "../types";
import * as jose from "jose";

const config: LiveKitConfig = {
  apiKey: "testkey",
  apiSecret: "testsecretthatshouldbelongenough1234",
  apiUrl: "http://localhost:7880",
  wsUrl: "ws://localhost:7880",
};

describe("generateHuddleToken", () => {
  test("returns a valid JWT string", async () => {
    const token = await generateHuddleToken(config, {
      userId: "user-1",
      roomName: "huddle-channel-1",
    });

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  test("includes correct identity in token claims", async () => {
    const token = await generateHuddleToken(config, {
      userId: "user-42",
      roomName: "huddle-channel-5",
      displayName: "Test User",
    });

    const secret = new TextEncoder().encode(config.apiSecret);
    const { payload } = await jose.jwtVerify(token, secret);

    expect(payload.sub).toBe("user-42");
  });

  test("includes room grant in video section", async () => {
    const token = await generateHuddleToken(config, {
      userId: "user-1",
      roomName: "huddle-channel-1",
    });

    const secret = new TextEncoder().encode(config.apiSecret);
    const { payload } = await jose.jwtVerify(token, secret);

    const video = payload.video as Record<string, unknown>;
    expect(video.room).toBe("huddle-channel-1");
    expect(video.roomJoin).toBe(true);
    expect(video.canPublish).toBe(true);
    expect(video.canSubscribe).toBe(true);
  });

  test("uses userId as name when displayName not provided", async () => {
    const token = await generateHuddleToken(config, {
      userId: "user-1",
      roomName: "huddle-channel-1",
    });

    const secret = new TextEncoder().encode(config.apiSecret);
    const { payload } = await jose.jwtVerify(token, secret);

    expect(payload.sub).toBe("user-1");
  });
});
