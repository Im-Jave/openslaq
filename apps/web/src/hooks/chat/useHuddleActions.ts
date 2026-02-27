import { useCallback, useEffect, useRef } from "react";
import { setCurrentHuddleChannel } from "@openslaq/client-core";
import type { ChannelId, UserId } from "@openslaq/shared";
import { useChatStore } from "../../state/chat-store";
import { useCurrentUser } from "../useCurrentUser";

function openHuddlePopup(channelId: string, channelName?: string): Window | null {
  const nameParam = channelName ? `?name=${encodeURIComponent(channelName)}` : "";
  return window.open(
    `/huddle/${channelId}${nameParam}`,
    `huddle-${channelId}`,
    "width=480,height=640,resizable=yes",
  );
}

export function useHuddleActions() {
  const user = useCurrentUser();
  const { state, dispatch } = useChatStore();
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll popup.closed to detect when user closes the window
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (state.currentHuddleChannelId && popupRef.current) {
      const channelId = state.currentHuddleChannelId;
      pollRef.current = setInterval(() => {
        if (popupRef.current?.closed) {
          popupRef.current = null;
          if (channelId) {
            dispatch({ type: "huddle/ended", channelId: channelId as ChannelId });
          }
          setCurrentHuddleChannel(dispatch, null);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }, 500);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state.currentHuddleChannelId, dispatch]);

  const startHuddle = useCallback(
    (channelId: string, channelName?: string) => {
      setCurrentHuddleChannel(dispatch, channelId);
      // Optimistically populate activeHuddles so the UI shows "In huddle" immediately
      if (user) {
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
      }
      popupRef.current = openHuddlePopup(channelId, channelName);
    },
    [dispatch, user],
  );

  const joinHuddle = useCallback(
    (channelId: string, channelName?: string) => {
      setCurrentHuddleChannel(dispatch, channelId);
      popupRef.current = openHuddlePopup(channelId, channelName);
    },
    [dispatch],
  );

  const leaveHuddle = useCallback(() => {
    // Clean up the optimistic activeHuddles entry
    if (state.currentHuddleChannelId) {
      dispatch({ type: "huddle/ended", channelId: state.currentHuddleChannelId as ChannelId });
    }
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    setCurrentHuddleChannel(dispatch, null);
  }, [dispatch, state.currentHuddleChannelId]);

  return {
    startHuddle,
    joinHuddle,
    leaveHuddle,
    currentHuddleChannelId: state.currentHuddleChannelId,
  };
}
