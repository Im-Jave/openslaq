import { AccessToken } from "livekit-server-sdk";
import type { LiveKitConfig, TokenRequest } from "./types";

export async function generateHuddleToken(
  config: LiveKitConfig,
  request: TokenRequest,
): Promise<string> {
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: request.userId,
    name: request.displayName ?? request.userId,
  });

  token.addGrant({
    room: request.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await token.toJwt();
}
