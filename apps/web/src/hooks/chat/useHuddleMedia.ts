import { useEffect, useRef, useCallback, useState } from "react";
import { HuddleClient, type HuddleMediaState } from "@openslaq/huddle/client";
import type { ChannelId, UserId } from "@openslaq/shared";
import { useChatStore } from "../../state/chat-store";
import { useCurrentUser } from "../useCurrentUser";
import { authorizedHeaders } from "../../lib/api-client";
import { env } from "../../env";

const API_URL = env.VITE_API_URL;

interface UseHuddleMediaReturn {
  mediaState: HuddleMediaState | null;
  error: string | null;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  switchAudioDevice: (deviceId: string) => void;
  switchVideoDevice: (deviceId: string) => void;
}

export function useHuddleMedia(): UseHuddleMediaReturn {
  const user = useCurrentUser();
  const { state, dispatch } = useChatStore();
  const clientRef = useRef<HuddleClient | null>(null);
  const prevChannelIdRef = useRef<string | null>(null);
  const [mediaState, setMediaState] = useState<HuddleMediaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Local optimistic state for mute/camera/screenshare — works even without LiveKit connection
  const [localMuted, setLocalMuted] = useState(false);
  const [localCameraOn, setLocalCameraOn] = useState(false);
  const [localScreenSharing, setLocalScreenSharing] = useState(false);

  const channelId = state.currentHuddleChannelId;

  // Create/destroy HuddleClient when huddle channel changes
  useEffect(() => {
    if (!channelId || !user) {
      // Clean up optimistic activeHuddles entry when leaving
      if (prevChannelIdRef.current) {
        dispatch({ type: "huddle/ended", channelId: prevChannelIdRef.current as ChannelId });
        prevChannelIdRef.current = null;
      }
      // Clean up if we left the huddle
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
        setMediaState(null);
      }
      setLocalMuted(false);
      setLocalCameraOn(false);
      setLocalScreenSharing(false);
      return;
    }

    prevChannelIdRef.current = channelId;

    const client = new HuddleClient();
    clientRef.current = client;

    const unsubscribe = client.subscribe((s) => {
      setMediaState(s);
    });

    // Fetch token and connect
    (async () => {
      try {
        const headers = await authorizedHeaders(user);
        const res = await fetch(`${API_URL}/api/huddle/join`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channelId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }

        // Optimistically populate activeHuddles so the HuddleBar renders
        dispatch({
          type: "huddle/started",
          huddle: {
            channelId: channelId as ChannelId,
            participants: [{
              userId: user.id as UserId,
              isMuted: false,
              isCameraOn: false,
              isScreenSharing: false,
              joinedAt: new Date().toISOString(),
            }],
            startedAt: new Date().toISOString(),
            livekitRoom: null,
            screenShareUserId: null,
            messageId: null,
          },
        });

        const { token, wsUrl } = await res.json() as { token: string; wsUrl: string };

        // Connect to LiveKit — if it fails, keep the huddle UI visible (degraded mode)
        try {
          await client.connect(wsUrl, token);
          await client.enableMicrophone();
        } catch (connectErr) {
          console.warn("LiveKit connection failed, running in degraded mode:", connectErr);
        }
        setError(null);
      } catch (err) {
        console.error("Failed to join huddle:", err);
        const message = err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied"
          : err instanceof Error
            ? err.message
            : "Failed to join huddle";
        setError(message);
        // Leave the huddle since we can't even fetch the token
        dispatch({ type: "huddle/setCurrentChannel", channelId: null });
      }
    })();

    return () => {
      unsubscribe();
      client.destroy();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, user?.id]);

  const toggleMute = useCallback(() => {
    setLocalMuted((prev) => !prev);
    const client = clientRef.current;
    if (!client) return;
    client.toggleMicrophone().catch((err) => {
      console.error("Failed to toggle microphone:", err);
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setLocalCameraOn((prev) => !prev);
    const client = clientRef.current;
    if (!client) return;
    client.toggleCamera().catch((err) => {
      console.error("Failed to toggle camera:", err);
    });
  }, []);

  const toggleScreenShare = useCallback(() => {
    setLocalScreenSharing((prev) => !prev);
    const client = clientRef.current;
    if (!client) return;
    const s = client.getState();
    const isSharing = s.localParticipant?.isScreenSharing ?? false;
    if (isSharing) {
      client.stopScreenShare().catch((err) => {
        console.error("Failed to stop screen share:", err);
      });
    } else {
      client.startScreenShare().catch((err) => {
        console.error("Failed to start screen share:", err);
      });
    }
  }, []);

  const switchAudioDevice = useCallback((deviceId: string) => {
    clientRef.current?.switchAudioDevice(deviceId).catch((err) => {
      console.error("Failed to switch audio device:", err);
    });
  }, []);

  const switchVideoDevice = useCallback((deviceId: string) => {
    clientRef.current?.switchVideoDevice(deviceId).catch((err) => {
      console.error("Failed to switch video device:", err);
    });
  }, []);

  // Use LiveKit state when available, fall back to local optimistic state
  const isMuted = mediaState?.localParticipant
    ? mediaState.localParticipant.isMuted
    : localMuted;
  const isCameraOn = mediaState?.localParticipant
    ? mediaState.localParticipant.isCameraOn
    : localCameraOn;
  const isScreenSharing = mediaState?.localParticipant
    ? mediaState.localParticipant.isScreenSharing
    : localScreenSharing;

  return {
    mediaState,
    error,
    isMuted,
    isCameraOn,
    isScreenSharing,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    switchAudioDevice,
    switchVideoDevice,
  };
}
