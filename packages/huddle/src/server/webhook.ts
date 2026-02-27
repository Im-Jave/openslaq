import { WebhookReceiver } from "livekit-server-sdk";
import type { LiveKitConfig } from "./types";

export function createWebhookReceiver(config: LiveKitConfig): WebhookReceiver {
  return new WebhookReceiver(config.apiKey, config.apiSecret);
}
