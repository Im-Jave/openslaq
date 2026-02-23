import { useCallback } from "react";
import type { Message } from "@openslack/shared";
import { useSocketEvent } from "./useSocketEvent";
import { useChatStore } from "../state/chat-store";
import { useCurrentUser } from "./useCurrentUser";
import { getNotificationPreferences } from "../lib/notification-preferences";

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function useNotifications() {
  const user = useCurrentUser();
  const { state, dispatch } = useChatStore();

  const handleNewMessage = useCallback(
    (message: Message) => {
      if (message.parentMessageId) return;
      if (message.userId === user?.id) return;
      if (!document.hidden) return;

      const prefs = getNotificationPreferences();
      if (!prefs.enabled) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

      const channel = state.channels.find((c) => c.id === message.channelId);
      const dm = state.dms.find((d) => d.channel.id === message.channelId);
      const locationName = channel
        ? `#${channel.name}`
        : dm
          ? dm.otherUser.displayName
          : "Unknown";

      const preview = truncate(stripMarkdown(message.content), 100);
      const body = `${locationName}: ${preview}`;
      const title = message.senderDisplayName ?? "New message";

      const notification = new Notification(title, { body });
      notification.onclick = () => {
        window.focus();
        if (channel) {
          dispatch({
            type: "workspace/selectChannel",
            channelId: message.channelId,
          });
        } else if (dm) {
          dispatch({
            type: "workspace/selectDm",
            channelId: message.channelId,
          });
        }
        notification.close();
      };

      if (prefs.sound) {
        new Audio("/notification.mp3").play().catch(() => {});
      }
    },
    [user?.id, state.channels, state.dms, dispatch],
  );

  useSocketEvent("message:new", handleNewMessage);
}
