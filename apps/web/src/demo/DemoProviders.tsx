import type { Dispatch, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Message } from "@openslack/shared";
import { asChannelId, asMessageId, asUserId } from "@openslack/shared";
import { SocketContext, type SocketContextValue } from "../socket/SocketProvider";
import { ChatStoreProvider, useChatStore, type ChatStoreState } from "../state/chat-store";
import {
  GalleryModeProvider,
  GalleryMockDataProvider,
  MockUserProvider,
} from "../gallery/gallery-context";
import {
  DEMO_CHANNELS,
  DEMO_CHANNEL_IDS,
  DEMO_CHANNEL_MESSAGES,
  DEMO_DMS,
  DEMO_MOCK_DATA,
  DEMO_PRESENCE,
  DEMO_THREAD_REPLIES,
  DEMO_UNREAD_COUNTS,
  DEMO_USER,
  DEMO_WORKSPACES,
} from "./mock-data";

const STORAGE_KEY = "openslack-demo-state-v1";

const noopSocket: SocketContextValue = {
  socket: null,
  status: "disconnected",
  lastError: null,
  joinChannel: () => {},
  leaveChannel: () => {},
};

function seedDemoStore(dispatch: Dispatch<{ type: string; [key: string]: unknown }>) {
  dispatch({
    type: "workspace/bootstrapSuccess",
    channels: DEMO_CHANNELS,
    workspaces: DEMO_WORKSPACES,
    dms: DEMO_DMS,
  });

  for (const [channelId, messages] of Object.entries(DEMO_CHANNEL_MESSAGES)) {
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

  for (const { parent, replies } of Object.values(DEMO_THREAD_REPLIES)) {
    dispatch({
      type: "thread/setData",
      parent,
      replies,
      newerCursor: null,
      hasNewer: false,
    });
  }

  dispatch({ type: "unread/setCounts", counts: DEMO_UNREAD_COUNTS });
  dispatch({
    type: "presence/sync",
    users: Object.entries(DEMO_PRESENCE).map(([userId, p]) => ({
      userId,
      online: p.online,
      lastSeenAt: p.lastSeenAt,
    })),
  });

  dispatch({ type: "workspace/selectChannel", channelId: DEMO_CHANNEL_IDS.general });
}

function isChatStoreState(value: unknown): value is ChatStoreState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChatStoreState>;
  return Array.isArray(candidate.channels) && Array.isArray(candidate.workspaces) && !!candidate.messagesById;
}

function useDemoNetworkGuard() {
  const { dispatch } = useChatStore();

  useLayoutEffect(() => {
    const report = (method: string, url: string) => {
      dispatch({
        type: "mutations/error",
        error: `Demo mode blocked network request: ${method.toUpperCase()} ${url}`,
      });
      console.warn("[demo-mode] blocked network request", { method, url });
    };

    const originalFetch = window.fetch.bind(window);
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    const originalWebSocket = window.WebSocket;

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      // Let Stack Auth initialise gracefully — return "no session" instead of crashing.
      // The SDK checks for x-stack-known-error header to handle expected errors;
      // CANNOT_GET_OWN_USER_WITHOUT_USER makes getClientUserByToken() return null.
      if (url.includes("stack-auth.com")) {
        return new Response(
          JSON.stringify({ code: "CANNOT_GET_OWN_USER_WITHOUT_USER", message: "Demo mode" }),
          { status: 200, headers: { "x-stack-known-error": "CANNOT_GET_OWN_USER_WITHOUT_USER" } },
        );
      }

      report(method, url);
      throw new Error("Demo mode blocked fetch");
    }) as unknown as typeof window.fetch;

    XMLHttpRequest.prototype.open = function open(this: XMLHttpRequest, method: string, url: string | URL) {
      (this as XMLHttpRequest & { __demoBlocked?: { method: string; url: string } }).__demoBlocked = {
        method,
        url: String(url),
      };
    } as typeof XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.send = function send(this: XMLHttpRequest) {
      const metadata = (this as XMLHttpRequest & { __demoBlocked?: { method: string; url: string } }).__demoBlocked;
      report(metadata?.method ?? "GET", metadata?.url ?? "unknown-url");
      throw new Error("Demo mode blocked XMLHttpRequest");
    } as typeof XMLHttpRequest.prototype.send;

    (window as unknown as { WebSocket: typeof WebSocket }).WebSocket = function blockedWebSocket(
      url: string | URL,
    ) {
      report("WS", String(url));
      throw new Error("Demo mode blocked WebSocket");
    } as unknown as typeof WebSocket;

    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXhrOpen;
      XMLHttpRequest.prototype.send = originalXhrSend;
      (window as unknown as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
    };
  }, [dispatch]);
}

function useDemoSimulation(initialized: boolean) {
  const { state, dispatch } = useChatStore();
  const activeRef = useRef<{ activeChannelId: string | null; activeDmId: string | null }>({
    activeChannelId: null,
    activeDmId: null,
  });
  const carolOnlineRef = useRef(false);

  useEffect(() => {
    activeRef.current = {
      activeChannelId: state.activeChannelId,
      activeDmId: state.activeDmId,
    };
  }, [state.activeChannelId, state.activeDmId]);

  useEffect(() => {
    carolOnlineRef.current = state.presence["user-carol"]?.online ?? false;
  }, [state.presence]);

  useEffect(() => {
    if (!initialized) return;

    let counter = 1;

    const interval = window.setInterval(() => {
      const createdAt = new Date().toISOString();
      const targetChannelId = DEMO_CHANNEL_IDS.random;
      const message: Message = {
        id: asMessageId(`demo-random-${Date.now()}-${counter}`),
        channelId: asChannelId(targetChannelId),
        userId: asUserId("user-carol"),
        senderDisplayName: "Carol Davis",
        senderAvatarUrl: null,
        content: `Demo update ${counter}: this channel auto-receives activity to showcase unread badges and live updates.`,
        parentMessageId: null,
        replyCount: 0,
        latestReplyAt: null,
        attachments: [],
        reactions: [],
        createdAt,
        updatedAt: createdAt,
      };

      dispatch({ type: "messages/upsert", message });

      if (activeRef.current.activeChannelId !== targetChannelId && activeRef.current.activeDmId !== targetChannelId) {
        dispatch({ type: "unread/increment", channelId: targetChannelId });
      }

      counter += 1;
    }, 8000);

    const presenceInterval = window.setInterval(() => {
      const online = !carolOnlineRef.current;
      carolOnlineRef.current = online;
      dispatch({
        type: "presence/updated",
        userId: "user-carol",
        online,
        lastSeenAt: online ? null : new Date().toISOString(),
      });
    }, 15000);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(presenceInterval);
    };
  }, [dispatch, initialized]);
}

function DemoRuntime() {
  const { state, dispatch } = useChatStore();
  const initializedRef = useRef(false);

  useDemoNetworkGuard();
  useDemoSimulation(initializedRef.current);

  useEffect(() => {
    if (initializedRef.current) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isChatStoreState(parsed)) {
          dispatch({ type: "demo/hydrate", state: parsed });
          initializedRef.current = true;
          return;
        }
      }
    } catch {
      // Ignore malformed local state and re-seed.
    }

    seedDemoStore(dispatch as Dispatch<{ type: string; [key: string]: unknown }>);
    initializedRef.current = true;
  }, [dispatch]);

  useEffect(() => {
    if (!initializedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return null;
}

interface DemoProvidersProps {
  children: ReactNode;
}

export function DemoProviders({ children }: DemoProvidersProps) {
  return (
    <GalleryModeProvider value={true}>
      <MockUserProvider value={DEMO_USER}>
        <GalleryMockDataProvider value={DEMO_MOCK_DATA}>
          <SocketContext.Provider value={noopSocket}>
            <ChatStoreProvider>
              <DemoRuntime />
              {children}
            </ChatStoreProvider>
          </SocketContext.Provider>
        </GalleryMockDataProvider>
      </MockUserProvider>
    </GalleryModeProvider>
  );
}
