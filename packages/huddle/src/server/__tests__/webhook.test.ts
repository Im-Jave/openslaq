import { describe, test, expect } from "bun:test";
import { createWebhookReceiver } from "../webhook";
import type { LiveKitConfig } from "../types";

const config: LiveKitConfig = {
  apiKey: "testkey",
  apiSecret: "testsecretthatshouldbelongenough1234",
  apiUrl: "http://localhost:7880",
  wsUrl: "ws://localhost:7880",
};

describe("createWebhookReceiver", () => {
  test("creates a WebhookReceiver instance", () => {
    const receiver = createWebhookReceiver(config);
    expect(receiver).toBeDefined();
    expect(typeof receiver.receive).toBe("function");
  });
});
