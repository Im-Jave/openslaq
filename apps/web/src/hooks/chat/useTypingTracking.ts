import { useCallback, useEffect, useRef, useState } from "react";
import type { ChannelId, UserId } from "@openslaq/shared";
import { useSocketEvent } from "../useSocketEvent";

export interface TypingUser {
  userId: string;
  displayName: string;
  expiresAt: number;
}

interface MemberInfo {
  id: string;
  displayName: string;
}

const EXPIRE_MS = 5000;

export function useTypingTracking(
  channelId: string | undefined,
  currentUserId: string | undefined,
  members: MemberInfo[],
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTypingUsers([]);
  }, [channelId]);

  useEffect(() => {
    if (typingUsers.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        setTypingUsers((prev) => {
          const filtered = prev.filter((entry) => entry.expiresAt > now);
          return filtered.length === prev.length ? prev : filtered;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [typingUsers.length]);

  const onUserTyping = useCallback(
    (payload: { userId: UserId; channelId: ChannelId }) => {
      if (payload.channelId !== channelId) return;
      if (payload.userId === currentUserId) return;

      const member = members.find((item) => item.id === payload.userId);
      const displayName = member?.displayName ?? "Someone";

      setTypingUsers((prev) => {
        const existingIndex = prev.findIndex((entry) => entry.userId === payload.userId);
        const nextEntry: TypingUser = {
          userId: payload.userId,
          displayName,
          expiresAt: Date.now() + EXPIRE_MS,
        };
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = nextEntry;
          return next;
        }
        return [...prev, nextEntry];
      });
    },
    [channelId, currentUserId, members],
  );

  useSocketEvent("user:typing", onUserTyping);

  return typingUsers;
}
