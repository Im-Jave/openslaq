import type { Dispatch, ReactNode } from "react";
import { createContext, useContext, useMemo, useReducer } from "react";
import type {
  Channel,
  Workspace,
  Role,
  Message,
  ChannelId,
  MessageId,
  ReactionGroup,
  HuddleState,
} from "@openslack/shared";

export interface WorkspaceInfo extends Workspace {
  role: Role;
}

export interface DmConversation {
  channel: Channel;
  otherUser: { id: string; displayName: string; avatarUrl: string | null };
}

interface ChatUiState {
  bootstrapLoading: boolean;
  bootstrapError: string | null;
  channelMessagesLoading: Record<string, boolean>;
  channelMessagesError: Record<string, string | null>;
  threadLoading: Record<string, boolean>;
  threadError: Record<string, string | null>;
  mutationError: string | null;
}

export interface PresenceEntry {
  online: boolean;
  lastSeenAt: string | null;
}

export interface ScrollTarget {
  messageId: string;
  highlightMessageId: string;
}

export interface ChannelPaginationState {
  olderCursor: string | null;
  newerCursor: string | null;
  hasOlder: boolean;
  hasNewer: boolean;
  loadingOlder: boolean;
  loadingNewer: boolean;
}

export interface ThreadPaginationState {
  newerCursor: string | null;
  hasNewer: boolean;
  loadingNewer: boolean;
}

export interface ChatStoreState {
  workspaceSlug: string | null;
  workspaces: WorkspaceInfo[];
  channels: Channel[];
  dms: DmConversation[];
  activeChannelId: string | null;
  activeDmId: string | null;
  activeThreadId: string | null;
  activeProfileUserId: string | null;
  messagesById: Record<string, Message>;
  channelMessageIds: Record<string, string[]>;
  threadReplyIds: Record<string, string[]>;
  channelPagination: Record<string, ChannelPaginationState>;
  threadPagination: Record<string, ThreadPaginationState>;
  unreadCounts: Record<string, number>;
  presence: Record<string, PresenceEntry>;
  activeHuddles: Record<string, HuddleState>;
  currentHuddleChannelId: string | null;
  scrollTarget: ScrollTarget | null;
  ui: ChatUiState;
}

const initialState: ChatStoreState = {
  workspaceSlug: null,
  workspaces: [],
  channels: [],
  dms: [],
  activeChannelId: null,
  activeDmId: null,
  activeThreadId: null,
  activeProfileUserId: null,
  messagesById: {},
  channelMessageIds: {},
  threadReplyIds: {},
  channelPagination: {},
  threadPagination: {},
  unreadCounts: {},
  presence: {},
  activeHuddles: {},
  currentHuddleChannelId: null,
  scrollTarget: null,
  ui: {
    bootstrapLoading: false,
    bootstrapError: null,
    channelMessagesLoading: {},
    channelMessagesError: {},
    threadLoading: {},
    threadError: {},
    mutationError: null,
  },
};

type ChatAction =
  | { type: "demo/hydrate"; state: ChatStoreState }
  | { type: "workspace/bootstrapStart"; workspaceSlug: string }
  | {
      type: "workspace/bootstrapSuccess";
      channels: Channel[];
      workspaces: WorkspaceInfo[];
      dms: DmConversation[];
    }
  | { type: "workspace/bootstrapError"; error: string }
  | { type: "workspace/selectChannel"; channelId: string }
  | { type: "workspace/selectDm"; channelId: string }
  | { type: "workspace/openThread"; messageId: string }
  | { type: "workspace/closeThread" }
  | { type: "workspace/openProfile"; userId: string }
  | { type: "workspace/closeProfile" }
  | { type: "workspace/addDm"; dm: DmConversation }
  | { type: "workspace/addChannel"; channel: Channel }
  | { type: "workspace/removeChannel"; channelId: string }
  | { type: "channel/loadStart"; channelId: string }
  | { type: "channel/loadError"; channelId: string; error: string }
  | {
      type: "channel/setMessages";
      channelId: string;
      messages: Message[];
      olderCursor?: string | null;
      newerCursor?: string | null;
      hasOlder?: boolean;
      hasNewer?: boolean;
    }
  | { type: "channel/prependMessages"; channelId: string; messages: Message[]; olderCursor: string | null; hasOlder: boolean }
  | { type: "channel/appendMessages"; channelId: string; messages: Message[]; newerCursor: string | null; hasNewer: boolean }
  | { type: "channel/setLoadingOlder"; channelId: string; loading: boolean }
  | { type: "channel/setLoadingNewer"; channelId: string; loading: boolean }
  | { type: "thread/loadStart"; parentMessageId: string }
  | { type: "thread/loadError"; parentMessageId: string; error: string }
  | {
      type: "thread/setData";
      parent: Message;
      replies: Message[];
      newerCursor?: string | null;
      hasNewer?: boolean;
    }
  | { type: "thread/appendReplies"; parentMessageId: string; replies: Message[]; newerCursor: string | null; hasNewer: boolean }
  | { type: "thread/setLoadingNewer"; parentMessageId: string; loading: boolean }
  | { type: "messages/upsert"; message: Message }
  | { type: "messages/delete"; messageId: string; channelId: string }
  | { type: "messages/updateReactions"; messageId: string; reactions: ReactionGroup[] }
  | {
      type: "messages/updateThreadSummary";
      channelId: ChannelId;
      parentMessageId: MessageId;
      replyCount: number;
      latestReplyAt: string;
    }
  | { type: "mutations/error"; error: string | null }
  | { type: "unread/setCounts"; counts: Record<string, number> }
  | { type: "unread/increment"; channelId: string }
  | { type: "unread/clear"; channelId: string }
  | {
      type: "presence/sync";
      users: Array<{ userId: string; online: boolean; lastSeenAt: string | null }>;
    }
  | {
      type: "presence/updated";
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
    }
  | { type: "navigation/setScrollTarget"; scrollTarget: ScrollTarget }
  | { type: "navigation/clearScrollTarget" }
  | { type: "huddle/sync"; huddles: HuddleState[] }
  | { type: "huddle/started"; huddle: HuddleState }
  | { type: "huddle/updated"; huddle: HuddleState }
  | { type: "huddle/ended"; channelId: string }
  | { type: "huddle/setCurrentChannel"; channelId: string | null };

function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function insertSortedByCreatedAt(state: ChatStoreState, ids: string[], messageId: string): string[] {
  const next = [...ids, messageId];
  next.sort((a, b) => {
    const aDate = state.messagesById[a]?.createdAt ?? "";
    const bDate = state.messagesById[b]?.createdAt ?? "";
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });
  return dedupeIds(next);
}

function chatReducer(state: ChatStoreState, action: ChatAction): ChatStoreState {
  switch (action.type) {
    case "demo/hydrate": {
      return {
        ...action.state,
        ui: { ...action.state.ui, mutationError: null },
      };
    }
    case "workspace/bootstrapStart": {
      const sameWorkspace = state.workspaceSlug === action.workspaceSlug;
      return {
        ...state,
        workspaceSlug: action.workspaceSlug,
        channels: sameWorkspace ? state.channels : [],
        dms: sameWorkspace ? state.dms : [],
        activeChannelId: sameWorkspace ? state.activeChannelId : null,
        activeDmId: sameWorkspace ? state.activeDmId : null,
        activeThreadId: null,
        activeProfileUserId: state.activeProfileUserId,
        presence: sameWorkspace ? state.presence : {},
        ui: {
          ...state.ui,
          bootstrapLoading: true,
          bootstrapError: null,
        },
      };
    }
    case "workspace/bootstrapSuccess": {
      return {
        ...state,
        channels: action.channels,
        workspaces: action.workspaces,
        dms: action.dms,
        ui: {
          ...state.ui,
          bootstrapLoading: false,
          bootstrapError: null,
        },
      };
    }
    case "workspace/bootstrapError": {
      return {
        ...state,
        ui: {
          ...state.ui,
          bootstrapLoading: false,
          bootstrapError: action.error,
        },
      };
    }
    case "workspace/selectChannel": {
      const { [action.channelId]: _, ...restUnread } = state.unreadCounts;
      return {
        ...state,
        activeChannelId: action.channelId,
        activeDmId: null,
        activeThreadId: null,
        activeProfileUserId: null,
        unreadCounts: restUnread,
      };
    }
    case "workspace/selectDm": {
      const { [action.channelId]: _, ...restUnread } = state.unreadCounts;
      return {
        ...state,
        activeDmId: action.channelId,
        activeChannelId: null,
        activeThreadId: null,
        activeProfileUserId: null,
        unreadCounts: restUnread,
      };
    }
    case "workspace/openThread": {
      return {
        ...state,
        activeThreadId: action.messageId,
        activeProfileUserId: null,
      };
    }
    case "workspace/closeThread": {
      return {
        ...state,
        activeThreadId: null,
      };
    }
    case "workspace/openProfile": {
      return {
        ...state,
        activeProfileUserId: action.userId,
        activeThreadId: null,
      };
    }
    case "workspace/closeProfile": {
      return {
        ...state,
        activeProfileUserId: null,
      };
    }
    case "workspace/addDm": {
      const exists = state.dms.some((dm) => dm.channel.id === action.dm.channel.id);
      return exists
        ? state
        : {
            ...state,
            dms: [...state.dms, action.dm],
          };
    }
    case "workspace/addChannel": {
      const exists = state.channels.some((ch) => ch.id === action.channel.id);
      return exists
        ? state
        : {
            ...state,
            channels: [...state.channels, action.channel],
          };
    }
    case "workspace/removeChannel": {
      return {
        ...state,
        channels: state.channels.filter((ch) => ch.id !== action.channelId),
        activeChannelId: state.activeChannelId === action.channelId ? null : state.activeChannelId,
      };
    }
    case "channel/loadStart": {
      return {
        ...state,
        ui: {
          ...state.ui,
          channelMessagesLoading: {
            ...state.ui.channelMessagesLoading,
            [action.channelId]: true,
          },
          channelMessagesError: {
            ...state.ui.channelMessagesError,
            [action.channelId]: null,
          },
        },
      };
    }
    case "channel/loadError": {
      return {
        ...state,
        ui: {
          ...state.ui,
          channelMessagesLoading: {
            ...state.ui.channelMessagesLoading,
            [action.channelId]: false,
          },
          channelMessagesError: {
            ...state.ui.channelMessagesError,
            [action.channelId]: action.error,
          },
        },
      };
    }
    case "channel/setMessages": {
      const byId = { ...state.messagesById };
      for (const message of action.messages) {
        byId[message.id] = message;
      }

      return {
        ...state,
        messagesById: byId,
        channelMessageIds: {
          ...state.channelMessageIds,
          [action.channelId]: action.messages.map((message) => message.id),
        },
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: {
            olderCursor: action.olderCursor ?? null,
            newerCursor: action.newerCursor ?? null,
            hasOlder: action.hasOlder ?? false,
            hasNewer: action.hasNewer ?? false,
            loadingOlder: false,
            loadingNewer: false,
          },
        },
        ui: {
          ...state.ui,
          channelMessagesLoading: {
            ...state.ui.channelMessagesLoading,
            [action.channelId]: false,
          },
          channelMessagesError: {
            ...state.ui.channelMessagesError,
            [action.channelId]: null,
          },
        },
      };
    }
    case "channel/prependMessages": {
      const byId = { ...state.messagesById };
      for (const message of action.messages) {
        byId[message.id] = message;
      }
      const existingIds = state.channelMessageIds[action.channelId] ?? [];
      const newIds = action.messages.map((m) => m.id);
      const combined = dedupeIds([...newIds, ...existingIds]);
      const prev = state.channelPagination[action.channelId];

      return {
        ...state,
        messagesById: byId,
        channelMessageIds: {
          ...state.channelMessageIds,
          [action.channelId]: combined,
        },
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: {
            olderCursor: action.olderCursor,
            newerCursor: prev?.newerCursor ?? null,
            hasOlder: action.hasOlder,
            hasNewer: prev?.hasNewer ?? false,
            loadingOlder: false,
            loadingNewer: prev?.loadingNewer ?? false,
          },
        },
      };
    }
    case "channel/appendMessages": {
      const byId = { ...state.messagesById };
      for (const message of action.messages) {
        byId[message.id] = message;
      }
      const existingIds = state.channelMessageIds[action.channelId] ?? [];
      const newIds = action.messages.map((m) => m.id);
      const combined = dedupeIds([...existingIds, ...newIds]);
      const prev = state.channelPagination[action.channelId];

      return {
        ...state,
        messagesById: byId,
        channelMessageIds: {
          ...state.channelMessageIds,
          [action.channelId]: combined,
        },
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: {
            olderCursor: prev?.olderCursor ?? null,
            newerCursor: action.newerCursor,
            hasOlder: prev?.hasOlder ?? false,
            hasNewer: action.hasNewer,
            loadingOlder: prev?.loadingOlder ?? false,
            loadingNewer: false,
          },
        },
      };
    }
    case "channel/setLoadingOlder": {
      const prev = state.channelPagination[action.channelId];
      if (!prev) return state;
      return {
        ...state,
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: { ...prev, loadingOlder: action.loading },
        },
      };
    }
    case "channel/setLoadingNewer": {
      const prev = state.channelPagination[action.channelId];
      if (!prev) return state;
      return {
        ...state,
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: { ...prev, loadingNewer: action.loading },
        },
      };
    }
    case "thread/loadStart": {
      return {
        ...state,
        ui: {
          ...state.ui,
          threadLoading: {
            ...state.ui.threadLoading,
            [action.parentMessageId]: true,
          },
          threadError: {
            ...state.ui.threadError,
            [action.parentMessageId]: null,
          },
        },
      };
    }
    case "thread/loadError": {
      return {
        ...state,
        ui: {
          ...state.ui,
          threadLoading: {
            ...state.ui.threadLoading,
            [action.parentMessageId]: false,
          },
          threadError: {
            ...state.ui.threadError,
            [action.parentMessageId]: action.error,
          },
        },
      };
    }
    case "thread/setData": {
      const byId = {
        ...state.messagesById,
        [action.parent.id]: action.parent,
      };
      for (const reply of action.replies) {
        byId[reply.id] = reply;
      }

      return {
        ...state,
        messagesById: byId,
        threadReplyIds: {
          ...state.threadReplyIds,
          [action.parent.id]: action.replies.map((reply) => reply.id),
        },
        threadPagination: {
          ...state.threadPagination,
          [action.parent.id]: {
            newerCursor: action.newerCursor ?? null,
            hasNewer: action.hasNewer ?? false,
            loadingNewer: false,
          },
        },
        ui: {
          ...state.ui,
          threadLoading: {
            ...state.ui.threadLoading,
            [action.parent.id]: false,
          },
          threadError: {
            ...state.ui.threadError,
            [action.parent.id]: null,
          },
        },
      };
    }
    case "thread/appendReplies": {
      const byId = { ...state.messagesById };
      for (const reply of action.replies) {
        byId[reply.id] = reply;
      }
      const existingIds = state.threadReplyIds[action.parentMessageId] ?? [];
      const newIds = action.replies.map((r) => r.id);
      const combined = dedupeIds([...existingIds, ...newIds]);

      return {
        ...state,
        messagesById: byId,
        threadReplyIds: {
          ...state.threadReplyIds,
          [action.parentMessageId]: combined,
        },
        threadPagination: {
          ...state.threadPagination,
          [action.parentMessageId]: {
            newerCursor: action.newerCursor,
            hasNewer: action.hasNewer,
            loadingNewer: false,
          },
        },
      };
    }
    case "thread/setLoadingNewer": {
      const prev = state.threadPagination[action.parentMessageId];
      if (!prev) return state;
      return {
        ...state,
        threadPagination: {
          ...state.threadPagination,
          [action.parentMessageId]: { ...prev, loadingNewer: action.loading },
        },
      };
    }
    case "messages/upsert": {
      const message = action.message;
      const nextById = {
        ...state.messagesById,
        [message.id]: message,
      };

      const nextState: ChatStoreState = {
        ...state,
        messagesById: nextById,
      };

      if (message.parentMessageId) {
        const currentReplies = nextState.threadReplyIds[message.parentMessageId] ?? [];
        nextState.threadReplyIds = {
          ...nextState.threadReplyIds,
          [message.parentMessageId]: insertSortedByCreatedAt(nextState, currentReplies, message.id),
        };
      } else {
        const currentChannelIds = nextState.channelMessageIds[message.channelId] ?? [];
        nextState.channelMessageIds = {
          ...nextState.channelMessageIds,
          [message.channelId]: insertSortedByCreatedAt(nextState, currentChannelIds, message.id),
        };
      }

      return nextState;
    }
    case "messages/delete": {
      const nextById = { ...state.messagesById };
      const message = nextById[action.messageId];
      delete nextById[action.messageId];

      const nextChannelIds = state.channelMessageIds[action.channelId]?.filter((id) => id !== action.messageId) ?? [];

      const nextThreadReplyIds: Record<string, string[]> = { ...state.threadReplyIds };
      for (const parentId of Object.keys(nextThreadReplyIds)) {
        nextThreadReplyIds[parentId] = nextThreadReplyIds[parentId]!.filter((id) => id !== action.messageId);
      }

      return {
        ...state,
        activeThreadId: state.activeThreadId === action.messageId ? null : state.activeThreadId,
        messagesById: nextById,
        channelMessageIds: {
          ...state.channelMessageIds,
          [action.channelId]: nextChannelIds,
        },
        threadReplyIds: nextThreadReplyIds,
        // If a parent message was deleted, replies become inaccessible via UI and are dropped from cache.
        ...(message && !message.parentMessageId
          ? {
              threadReplyIds: Object.fromEntries(
                Object.entries(nextThreadReplyIds).filter(([parentId]) => parentId !== action.messageId),
              ),
            }
          : {}),
      };
    }
    case "messages/updateReactions": {
      const message = state.messagesById[action.messageId];
      if (!message) return state;
      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [action.messageId]: {
            ...message,
            reactions: action.reactions,
          },
        },
      };
    }
    case "messages/updateThreadSummary": {
      const parent = state.messagesById[action.parentMessageId];
      if (!parent || parent.channelId !== action.channelId) return state;
      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [action.parentMessageId]: {
            ...parent,
            replyCount: action.replyCount,
            latestReplyAt: action.latestReplyAt,
          },
        },
      };
    }
    case "mutations/error": {
      return {
        ...state,
        ui: {
          ...state.ui,
          mutationError: action.error,
        },
      };
    }
    case "unread/setCounts": {
      return {
        ...state,
        unreadCounts: action.counts,
      };
    }
    case "unread/increment": {
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.channelId]: (state.unreadCounts[action.channelId] ?? 0) + 1,
        },
      };
    }
    case "unread/clear": {
      const { [action.channelId]: _, ...restUnread } = state.unreadCounts;
      return {
        ...state,
        unreadCounts: restUnread,
      };
    }
    case "presence/sync": {
      const next: Record<string, PresenceEntry> = {};
      for (const u of action.users) {
        next[u.userId] = { online: u.online, lastSeenAt: u.lastSeenAt };
      }
      return { ...state, presence: next };
    }
    case "presence/updated": {
      return {
        ...state,
        presence: {
          ...state.presence,
          [action.userId]: {
            online: action.online,
            lastSeenAt: action.lastSeenAt,
          },
        },
      };
    }
    case "navigation/setScrollTarget": {
      return {
        ...state,
        scrollTarget: action.scrollTarget,
      };
    }
    case "navigation/clearScrollTarget": {
      return {
        ...state,
        scrollTarget: null,
      };
    }
    case "huddle/sync": {
      const huddles: Record<string, HuddleState> = {};
      for (const h of action.huddles) {
        huddles[h.channelId] = h;
      }
      return { ...state, activeHuddles: huddles };
    }
    case "huddle/started": {
      return {
        ...state,
        activeHuddles: {
          ...state.activeHuddles,
          [action.huddle.channelId]: action.huddle,
        },
      };
    }
    case "huddle/updated": {
      return {
        ...state,
        activeHuddles: {
          ...state.activeHuddles,
          [action.huddle.channelId]: action.huddle,
        },
      };
    }
    case "huddle/ended": {
      const { [action.channelId]: _, ...rest } = state.activeHuddles;
      return {
        ...state,
        activeHuddles: rest,
        currentHuddleChannelId:
          state.currentHuddleChannelId === action.channelId
            ? null
            : state.currentHuddleChannelId,
      };
    }
    case "huddle/setCurrentChannel": {
      return {
        ...state,
        currentHuddleChannelId: action.channelId,
      };
    }
    default:
      return state;
  }
}

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
  const currentChannelId = activeChannel?.id ?? activeDm?.channel.id ?? null;

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
    currentChannelId,
    channelMessages,
    threadParent,
    threadReplies,
  };
}
