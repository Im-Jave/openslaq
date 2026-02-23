import { useEffect, useRef, useCallback, useState } from "react";
import type { ChannelId } from "@openslack/shared";
import { useSocket } from "../useSocket";
import { useChatStore } from "../../state/chat-store";
import { PeerConnectionManager } from "../../huddle/PeerConnectionManager";

export function useHuddleAudio(currentUserId: string | undefined) {
  const { socket } = useSocket();
  const { state, dispatch } = useChatStore();
  const managerRef = useRef<PeerConnectionManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const channelId = state.currentHuddleChannelId;
  const huddle = channelId ? state.activeHuddles[channelId] : null;

  // Create/destroy manager when huddle channel changes
  useEffect(() => {
    if (!socket || !channelId || !currentUserId) {
      // Clean up if we left the huddle
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
      return;
    }

    const manager = new PeerConnectionManager(socket, channelId, currentUserId);
    managerRef.current = manager;

    const existingParticipants = huddle?.participants
      .map((p) => p.userId)
      .filter((id) => id !== currentUserId) ?? [];

    manager.initialize(existingParticipants).catch((err) => {
      console.error("Failed to initialize huddle audio:", err);
      const message = err instanceof DOMException && err.name === "NotAllowedError"
        ? "Microphone permission denied"
        : "Failed to start audio";
      setError(message);
      // Leave the huddle since we can't get audio
      socket.emit("huddle:leave");
      dispatch({ type: "huddle/setCurrentChannel", channelId: null });
    });

    // On socket reconnect, re-join the huddle and recreate peer connections
    const socketAny = socket as unknown as {
      on: (event: string, listener: () => void) => void;
      off: (event: string, listener: () => void) => void;
    };
    const handleReconnect = () => {
      socket.emit("huddle:join", { channelId: channelId as ChannelId });
    };
    socketAny.on("connect", handleReconnect);

    return () => {
      socketAny.off("connect", handleReconnect);
      manager.destroy();
      if (managerRef.current === manager) {
        managerRef.current = null;
      }
    };
    // Only re-run when channelId or currentUserId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUserId, socket]);

  // Clean up stale peers when participants change
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !huddle) return;

    const currentPeers = manager.getPeerUserIds();
    const huddleUserIds = new Set<string>(huddle.participants.map((p) => p.userId));

    for (const peerId of currentPeers) {
      if (!huddleUserIds.has(peerId)) {
        manager.removePeer(peerId);
      }
    }
  }, [huddle]);

  const toggleMute = useCallback(
    (muted: boolean) => {
      setIsMuted(muted);
      managerRef.current?.setMuted(muted);
    },
    [],
  );

  const switchDevice = useCallback(
    (deviceId: string) => {
      managerRef.current?.replaceAudioTrack(deviceId).catch((err) => {
        console.error("Failed to switch audio device:", err);
      });
    },
    [],
  );

  return { isMuted, toggleMute, switchDevice, error };
}
