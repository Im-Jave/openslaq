import { Fragment, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import { useSocketEvent } from "../../hooks/useSocketEvent";
import { MessageItem } from "./MessageItem";
import { HuddleSystemMessage } from "./HuddleSystemMessage";
import { DaySeparator } from "./DaySeparator";
import { isDifferentDay } from "./message-date-utils";
import type { Message, ChannelId, MessageId, UserId, ReactionGroup } from "@openslaq/shared";
import { asChannelId } from "@openslaq/shared";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useChannelMessages } from "../../hooks/chat/useChannelMessages";
import { useMessageMutations } from "../../hooks/chat/useMessageMutations";
import { useLoadOlderMessages } from "../../hooks/chat/useLoadOlderMessages";
import { useLoadNewerMessages } from "../../hooks/chat/useLoadNewerMessages";
import { useBotActions } from "../../hooks/chat/useBotActions";
import { useChatStore } from "../../state/chat-store";

interface MessageListProps {
  channelId: string;
  onOpenThread?: (messageId: string) => void;
  onOpenProfile?: (userId: string) => void;
  onJoinHuddle?: (channelId: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onShareMessage?: (messageId: string) => void;
}

export function MessageList({ channelId, onOpenThread, onOpenProfile, onJoinHuddle, onPinMessage, onUnpinMessage, onShareMessage }: MessageListProps) {
  const user = useCurrentUser();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { joinChannel } = useSocket();
  const { state, dispatch } = useChatStore();
  const { toggleReaction, editMessage, deleteMessage, markAsUnread } = useMessageMutations(user);
  const { triggerAction } = useBotActions();

  useChannelMessages(workspaceSlug, channelId);

  const { loadOlder, loadingOlder, hasOlder } = useLoadOlderMessages(channelId);
  const { loadNewer, loadingNewer, hasNewer } = useLoadNewerMessages(channelId);

  const messages = (state.channelMessageIds[channelId] ?? [])
    .map((id) => state.messagesById[id])
    .filter((msg): msg is Message => Boolean(msg));

  const loading = state.ui.channelMessagesLoading[channelId] ?? false;
  const error = state.ui.channelMessagesError[channelId];

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // Track scroll height before prepend for scroll anchoring
  const prevScrollHeightRef = useRef<number>(0);
  const prevScrollTopRef = useRef<number>(0);
  const isPrependingRef = useRef(false);
  const prevMessageCountRef = useRef<number>(0);

  // Scroll-to-bottom on channel load / auto-scroll on new messages
  const prevChannelIdRef = useRef<string>(channelId);
  const didInitialScrollRef = useRef(false);
  const isNearBottomRef = useRef(true);

  // Reset scroll state on channel switch
  useEffect(() => {
    if (channelId !== prevChannelIdRef.current) {
      prevChannelIdRef.current = channelId;
      didInitialScrollRef.current = false;
      prevMessageCountRef.current = 0;
      isNearBottomRef.current = true;
    }
  }, [channelId]);

  // Track whether user is near the bottom of the scroll container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // Mark when a prepend starts
  useEffect(() => {
    if (loadingOlder) {
      const container = scrollContainerRef.current;
      if (container) {
        prevScrollHeightRef.current = container.scrollHeight;
        prevScrollTopRef.current = container.scrollTop;
        isPrependingRef.current = true;
      }
    }
  }, [loadingOlder]);

  // Scroll anchoring: prepend preservation, initial scroll-to-bottom, auto-scroll on new messages
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (!container || messages.length <= prevCount) return;

    if (isPrependingRef.current) {
      const heightDelta = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop = prevScrollTopRef.current + heightDelta;
      isPrependingRef.current = false;
      return;
    }
    if (!didInitialScrollRef.current) {
      container.scrollTop = container.scrollHeight;
      didInitialScrollRef.current = true;
      return;
    }
    if (isNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  // Top IntersectionObserver — load older messages
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasOlder && !loadingOlder) {
          void loadOlder();
        }
      },
      { root: container, rootMargin: "200px 0px 0px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasOlder, loadingOlder, loadOlder]);

  // Bottom IntersectionObserver — load newer messages
  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNewer && !loadingNewer) {
          void loadNewer();
        }
      },
      { root: container, rootMargin: "0px 0px 200px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNewer, loadingNewer, loadNewer]);

  const handleNewMessage = useCallback(
    (message: Message) => {
      if (message.channelId === channelId && !message.parentMessageId) {
        dispatch({ type: "messages/upsert", message });
      }
    },
    [channelId, dispatch],
  );

  const handleThreadUpdated = useCallback(
    (payload: {
      parentMessageId: MessageId;
      channelId: ChannelId;
      replyCount: number;
      latestReplyAt: string;
    }) => {
      if (payload.channelId === channelId) {
        dispatch({
          type: "messages/updateThreadSummary",
          channelId: payload.channelId,
          parentMessageId: payload.parentMessageId,
          replyCount: payload.replyCount,
          latestReplyAt: payload.latestReplyAt,
        });
      }
    },
    [channelId, dispatch],
  );

  const handleReactionUpdated = useCallback(
    (payload: {
      messageId: MessageId;
      channelId: ChannelId;
      reactions: ReactionGroup[];
    }) => {
      if (payload.channelId === channelId) {
        dispatch({
          type: "messages/updateReactions",
          messageId: payload.messageId,
          reactions: payload.reactions,
        });
      }
    },
    [channelId, dispatch],
  );

  const handleMessageUpdated = useCallback(
    (message: Message) => {
      if (message.channelId === channelId) {
        dispatch({ type: "messages/upsert", message });
      }
    },
    [channelId, dispatch],
  );

  const handleMessageDeleted = useCallback(
    (payload: { id: MessageId; channelId: ChannelId }) => {
      if (payload.channelId === channelId) {
        dispatch({ type: "messages/delete", messageId: payload.id, channelId: payload.channelId });
      }
    },
    [channelId, dispatch],
  );

  const handleMessagePinned = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId; pinnedBy: UserId; pinnedAt: string }) => {
      if (payload.channelId === channelId) {
        dispatch({
          type: "messages/updatePinStatus",
          messageId: payload.messageId,
          isPinned: true,
          pinnedBy: payload.pinnedBy,
          pinnedAt: payload.pinnedAt,
        });
      }
    },
    [channelId, dispatch],
  );

  const handleMessageUnpinned = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId }) => {
      if (payload.channelId === channelId) {
        dispatch({
          type: "messages/updatePinStatus",
          messageId: payload.messageId,
          isPinned: false,
        });
      }
    },
    [channelId, dispatch],
  );

  useSocketEvent("message:new", handleNewMessage);
  useSocketEvent("message:updated", handleMessageUpdated);
  useSocketEvent("message:deleted", handleMessageDeleted);
  useSocketEvent("thread:updated", handleThreadUpdated);
  useSocketEvent("reaction:updated", handleReactionUpdated);
  useSocketEvent("message:pinned", handleMessagePinned);
  useSocketEvent("message:unpinned", handleMessageUnpinned);

  useEffect(() => {
    joinChannel(asChannelId(channelId));
  }, [channelId, joinChannel]);

  return (
    <div ref={scrollContainerRef} data-testid="message-list-scroll" className="flex-1 overflow-y-auto p-4">
      {loading ? (
        <div className="flex items-center justify-center h-full text-faint text-sm">
          Loading messages...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full text-danger-text text-sm">
          {error}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-faint text-sm">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <>
          <div ref={topSentinelRef} className="h-px" />
          {loadingOlder && (
            <div data-testid="loading-older" className="text-center text-faint text-xs py-2">
              Loading older messages...
            </div>
          )}
          {messages.map((msg, index) => {
            const showSeparator =
              index === 0 || isDifferentDay(messages[index - 1]!.createdAt, msg.createdAt);
            return (
              <Fragment key={msg.id}>
                {showSeparator && <DaySeparator date={new Date(msg.createdAt)} />}
                {msg.type === "huddle" ? (
                  <HuddleSystemMessage
                    message={msg}
                    activeHuddle={state.activeHuddles[msg.channelId] ?? null}
                    onJoinHuddle={onJoinHuddle}
                  />
                ) : (
                  <MessageItem
                    message={msg}
                    currentUserId={user?.id}
                    senderStatusEmoji={(() => {
                      const p = state.presence[msg.userId];
                      if (!p?.statusEmoji) return null;
                      if (p.statusExpiresAt && new Date(p.statusExpiresAt).getTime() <= Date.now()) return null;
                      return p.statusEmoji;
                    })()}
                    onOpenThread={onOpenThread}
                    onToggleReaction={toggleReaction}
                    onOpenProfile={onOpenProfile}
                    onEditMessage={editMessage}
                    onDeleteMessage={deleteMessage}
                    onMarkAsUnread={markAsUnread}
                    onPinMessage={onPinMessage}
                    onUnpinMessage={onUnpinMessage}
                    onShareMessage={onShareMessage}
                    onBotAction={triggerAction}
                  />
                )}
              </Fragment>
            );
          })}
          {loadingNewer && (
            <div data-testid="loading-newer" className="text-center text-faint text-xs py-2">
              Loading newer messages...
            </div>
          )}
          <div ref={bottomSentinelRef} className="h-px" />
        </>
      )}
    </div>
  );
}
