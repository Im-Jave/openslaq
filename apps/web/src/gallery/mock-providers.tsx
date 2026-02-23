import type { ReactNode } from "react";
import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import type { Message } from "@openslack/shared";
import { SocketContext, type SocketContextValue } from "../socket/SocketProvider";
import { ChatStoreProvider, useChatStore } from "../state/chat-store";
import type { WorkspaceInfo, DmConversation, PresenceEntry } from "../state/chat-store";
import {
  GalleryModeProvider,
  MockUserProvider,
  GalleryMockDataProvider,
  type GalleryMockData,
  type MockUser,
} from "./gallery-context";
import type { Channel } from "@openslack/shared";

// ── Noop socket value ──

const noopSocket: SocketContextValue = {
  socket: null,
  status: "disconnected",
  lastError: null,
  joinChannel: () => {},
  leaveChannel: () => {},
};

// ── State seeder ──

interface SeedConfig {
  channels: Channel[];
  workspaces: WorkspaceInfo[];
  dms: DmConversation[];
  /** channelId → messages (already sorted chronologically) */
  channelMessages: Record<string, Message[]>;
  /** parentMessageId → replies */
  threadReplies?: Record<string, { parent: Message; replies: Message[] }>;
  unreadCounts?: Record<string, number>;
  presence?: Record<string, PresenceEntry>;
  activeChannelId?: string | null;
  activeDmId?: string | null;
  activeThreadId?: string | null;
  activeProfileUserId?: string | null;
  ui?: {
    bootstrapLoading?: boolean;
    bootstrapError?: string | null;
    mutationError?: string | null;
    channelMessagesLoading?: Record<string, boolean>;
    channelMessagesError?: Record<string, string | null>;
    threadLoading?: Record<string, boolean>;
    threadError?: Record<string, string | null>;
  };
}

function StateSeeder({ config }: { config: SeedConfig }) {
  const { dispatch } = useChatStore();

  useEffect(() => {
    // 1. Bootstrap workspace
    dispatch({
      type: "workspace/bootstrapSuccess",
      channels: config.channels,
      workspaces: config.workspaces,
      dms: config.dms,
    });

    // 2. Seed channel messages
    for (const [channelId, messages] of Object.entries(config.channelMessages)) {
      dispatch({
        type: "channel/setMessages",
        channelId,
        messages,
        olderCursor: null,
        newerCursor: null,
        hasOlder: false,
        hasNewer: false,
      });
    }

    // 3. Seed thread data
    if (config.threadReplies) {
      for (const { parent, replies } of Object.values(config.threadReplies)) {
        dispatch({
          type: "thread/setData",
          parent,
          replies,
          newerCursor: null,
          hasNewer: false,
        });
      }
    }

    // 4. Unread counts
    if (config.unreadCounts) {
      dispatch({ type: "unread/setCounts", counts: config.unreadCounts });
    }

    // 5. Presence
    if (config.presence) {
      dispatch({
        type: "presence/sync",
        users: Object.entries(config.presence).map(([userId, p]) => ({
          userId,
          online: p.online,
          lastSeenAt: p.lastSeenAt,
        })),
      });
    }

    // 6. Selections
    if (config.activeChannelId) {
      dispatch({ type: "workspace/selectChannel", channelId: config.activeChannelId });
    }
    if (config.activeDmId) {
      dispatch({ type: "workspace/selectDm", channelId: config.activeDmId });
    }
    if (config.activeThreadId) {
      dispatch({ type: "workspace/openThread", messageId: config.activeThreadId });
    }
    if (config.activeProfileUserId) {
      dispatch({ type: "workspace/openProfile", userId: config.activeProfileUserId });
    }

    // 7. UI overrides
    if (config.ui?.bootstrapLoading) {
      dispatch({
        type: "workspace/bootstrapStart",
        workspaceSlug: config.workspaces[0]?.slug ?? "acme",
      });
    }
    if (config.ui?.bootstrapError) {
      dispatch({
        type: "workspace/bootstrapError",
        error: config.ui.bootstrapError,
      });
    }
    if (config.ui?.mutationError !== undefined) {
      dispatch({ type: "mutations/error", error: config.ui.mutationError });
    }
    for (const [channelId, loading] of Object.entries(config.ui?.channelMessagesLoading ?? {})) {
      if (loading) {
        dispatch({ type: "channel/loadStart", channelId });
      }
    }
    for (const [channelId, error] of Object.entries(config.ui?.channelMessagesError ?? {})) {
      if (error) {
        dispatch({ type: "channel/loadError", channelId, error });
      }
    }
    for (const [parentMessageId, loading] of Object.entries(config.ui?.threadLoading ?? {})) {
      if (loading) {
        dispatch({ type: "thread/loadStart", parentMessageId });
      }
    }
    for (const [parentMessageId, error] of Object.entries(config.ui?.threadError ?? {})) {
      if (error) {
        dispatch({ type: "thread/loadError", parentMessageId, error });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on mount
  }, []);

  return null;
}

// ── MockProviders ──

interface MockProvidersProps {
  mockUser: MockUser;
  seed: SeedConfig;
  mocks?: GalleryMockData;
  initialRoute: string;
  children: ReactNode;
}

export function MockProviders({ mockUser, seed, mocks, initialRoute, children }: MockProvidersProps) {
  return (
    <GalleryModeProvider value={true}>
      <MockUserProvider value={mockUser}>
        <GalleryMockDataProvider value={mocks ?? null}>
          <SocketContext.Provider value={noopSocket}>
            <ChatStoreProvider>
              <StateSeeder config={seed} />
              <MemoryRouter initialEntries={[initialRoute]}>
                {children}
              </MemoryRouter>
            </ChatStoreProvider>
          </SocketContext.Provider>
        </GalleryMockDataProvider>
      </MockUserProvider>
    </GalleryModeProvider>
  );
}

export type { SeedConfig };
