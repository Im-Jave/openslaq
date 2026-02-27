import type { HuddleState, ChannelId } from "@openslaq/shared";
import type { ChatAction } from "../chat-reducer";

export function handleHuddleSync(payload: { huddles: HuddleState[] }): ChatAction {
  return { type: "huddle/sync", huddles: payload.huddles };
}

export function handleHuddleStarted(huddle: HuddleState): ChatAction {
  return { type: "huddle/started", huddle };
}

export function handleHuddleUpdated(huddle: HuddleState): ChatAction {
  return { type: "huddle/updated", huddle };
}

export function handleHuddleEnded(payload: { channelId: ChannelId }): ChatAction {
  return { type: "huddle/ended", channelId: payload.channelId };
}

export function setCurrentHuddleChannel(
  dispatch: (action: ChatAction) => void,
  channelId: string | null,
): void {
  dispatch({ type: "huddle/setCurrentChannel", channelId });
}
