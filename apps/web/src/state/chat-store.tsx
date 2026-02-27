import type { Dispatch, ReactNode } from "react";
import { createContext, useContext, useMemo, useReducer } from "react";
import type { Message } from "@openslaq/shared";
import { chatReducer, initialState } from "@openslaq/client-core";
import type { ChatAction, ChatStoreState } from "@openslaq/client-core";

// Re-export all public types so consumers don't need to change imports
export type {
  ChatAction,
  ChatStoreState,
  WorkspaceInfo,
  DmConversation,
  GroupDmConversation,
  GroupDmMember,
  PresenceEntry,
  ScrollTarget,
  ChannelPaginationState,
  ThreadPaginationState,
} from "@openslaq/client-core";

interface ChatStoreContextValue {
  state: ChatStoreState;
  dispatch: Dispatch<ChatAction>;
}

const ChatStoreContext = createContext<ChatStoreContextValue | null>(null);

interface ChatStoreProviderProps {
  children: ReactNode;
}

export function ChatStoreProvider({ children }: ChatStoreProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ChatStoreContext.Provider value={value}>{children}</ChatStoreContext.Provider>;
}

export function useChatStore(): ChatStoreContextValue {
  const value = useContext(ChatStoreContext);
  if (!value) {
    throw new Error("useChatStore must be used inside ChatStoreProvider");
  }
  return value;
}

export function useChatSelectors() {
  const { state } = useChatStore();

  const activeChannel = state.channels.find((channel) => channel.id === state.activeChannelId) ?? null;
  const activeDm = state.dms.find((dm) => dm.channel.id === state.activeDmId) ?? null;
  const activeGroupDm = state.groupDms.find((g) => g.channel.id === state.activeGroupDmId) ?? null;
  const currentChannelId = activeChannel?.id ?? activeDm?.channel.id ?? activeGroupDm?.channel.id ?? null;

  const channelMessages = currentChannelId
    ? (state.channelMessageIds[currentChannelId] ?? [])
        .map((id) => state.messagesById[id])
        .filter((message): message is Message => Boolean(message))
    : [];

  const threadParent = state.activeThreadId ? state.messagesById[state.activeThreadId] ?? null : null;
  const threadReplies = state.activeThreadId
    ? (state.threadReplyIds[state.activeThreadId] ?? [])
        .map((id) => state.messagesById[id])
        .filter((message): message is Message => Boolean(message))
    : [];

  return {
    activeChannel,
    activeDm,
    activeGroupDm,
    currentChannelId,
    channelMessages,
    threadParent,
    threadReplies,
  };
}
