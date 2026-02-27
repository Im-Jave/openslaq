import type { Dispatch, ReactNode } from "react";
import { createContext, useContext, useMemo, useReducer } from "react";
import type { Message } from "@openslaq/shared";
import { chatReducer, initialState } from "@openslaq/client-core";
import type { ChatAction, ChatStoreState } from "@openslaq/client-core";

interface ChatStoreContextValue {
  state: ChatStoreState;
  dispatch: Dispatch<ChatAction>;
}

const ChatStoreContext = createContext<ChatStoreContextValue | null>(null);

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <ChatStoreContext.Provider value={value}>
      {children}
    </ChatStoreContext.Provider>
  );
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

  const activeChannel =
    state.channels.find((c) => c.id === state.activeChannelId) ?? null;
  const activeDm =
    state.dms.find((dm) => dm.channel.id === state.activeDmId) ?? null;
  const currentChannelId =
    activeChannel?.id ?? activeDm?.channel.id ?? null;

  const channelMessages = currentChannelId
    ? (state.channelMessageIds[currentChannelId] ?? [])
        .map((id) => state.messagesById[id])
        .filter((m): m is Message => Boolean(m))
    : [];

  return {
    activeChannel,
    activeDm,
    currentChannelId,
    channelMessages,
  };
}
