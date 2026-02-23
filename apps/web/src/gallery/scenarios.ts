import type { SeedConfig } from "./mock-providers";
import {
  MOCK_CURRENT_USER,
  MOCK_WORKSPACE,
  MOCK_CHANNELS,
  MOCK_DMS,
  MOCK_GENERAL_MESSAGES,
  MOCK_THREAD_REPLIES,
  MOCK_DM_MESSAGES,
  MOCK_PRESENCE,
  MOCK_UNREAD_COUNTS,
  MOCK_MEMBERS,
  MOCK_SEARCH_RESPONSES,
  MOCK_WORKSPACE_LIST,
  CHANNEL_IDS,
  USER_IDS,
} from "./mock-data";
import type { GalleryMockData, MockUser } from "./gallery-context";

export interface Scenario {
  id: string;
  label: string;
  description: string;
  mockUser: MockUser;
  seed: SeedConfig;
  mocks?: GalleryMockData;
  initialRoute: string;
  /** Optional: dispatch a keydown after mount (e.g. Cmd+K for search) */
  triggerKeyAfterMount?: { key: string; metaKey?: boolean; ctrlKey?: boolean };
}

// Shared base seed config
const baseSeed: Omit<
  SeedConfig,
  "activeChannelId" | "activeDmId" | "activeThreadId" | "activeProfileUserId" | "ui"
> = {
  channels: MOCK_CHANNELS,
  workspaces: [MOCK_WORKSPACE],
  dms: MOCK_DMS,
  channelMessages: {
    [CHANNEL_IDS.general]: MOCK_GENERAL_MESSAGES,
    [CHANNEL_IDS.dmBob]: MOCK_DM_MESSAGES,
  },
  threadReplies: {
    "msg-6": {
      parent: MOCK_GENERAL_MESSAGES.find((m) => m.id === "msg-6")!,
      replies: MOCK_THREAD_REPLIES,
    },
  },
  presence: MOCK_PRESENCE,
  unreadCounts: MOCK_UNREAD_COUNTS,
};

export const SCENARIOS: Scenario[] = [
  {
    id: "channel-with-messages",
    label: "Channel with messages",
    description: "#general with markdown, reactions, and thread indicators",
    mockUser: MOCK_CURRENT_USER,
    seed: { ...baseSeed, activeChannelId: CHANNEL_IDS.general, activeDmId: null, activeThreadId: null },
    initialRoute: "/w/acme",
  },
  {
    id: "thread-panel-open",
    label: "Thread panel open",
    description: "Channel view with thread panel showing parent + 2 replies",
    mockUser: MOCK_CURRENT_USER,
    seed: { ...baseSeed, activeChannelId: CHANNEL_IDS.general, activeDmId: null, activeThreadId: "msg-6" },
    initialRoute: "/w/acme",
  },
  {
    id: "dm-conversation",
    label: "DM conversation",
    description: "Direct message with Bob selected",
    mockUser: MOCK_CURRENT_USER,
    seed: { ...baseSeed, activeChannelId: null, activeDmId: CHANNEL_IDS.dmBob, activeThreadId: null },
    initialRoute: "/w/acme",
  },
  {
    id: "empty-channel",
    label: "Empty channel",
    description: "#engineering selected with no messages yet",
    mockUser: MOCK_CURRENT_USER,
    seed: { ...baseSeed, activeChannelId: CHANNEL_IDS.engineering, activeDmId: null, activeThreadId: null },
    initialRoute: "/w/acme",
  },
  {
    id: "search-modal",
    label: "Search modal",
    description: "Workspace view with search modal open (Cmd+K)",
    mockUser: MOCK_CURRENT_USER,
    seed: { ...baseSeed, activeChannelId: CHANNEL_IDS.general, activeDmId: null, activeThreadId: null },
    initialRoute: "/w/acme",
    triggerKeyAfterMount: { key: "k", metaKey: true },
  },
  {
    id: "unread-badges",
    label: "Unread badges",
    description: "Multiple channels with unread count badges visible",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: CHANNEL_IDS.general,
      activeDmId: null,
      activeThreadId: null,
      unreadCounts: {
        [CHANNEL_IDS.random]: 3,
        [CHANNEL_IDS.engineering]: 7,
        [CHANNEL_IDS.dmBob]: 2,
      },
    },
    initialRoute: "/w/acme",
  },
  {
    id: "bootstrap-loading",
    label: "Bootstrap loading",
    description: "Main pane loading state while workspace bootstrap is in progress",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: CHANNEL_IDS.general,
      activeDmId: null,
      activeThreadId: null,
      ui: { bootstrapLoading: true },
    },
    initialRoute: "/w/acme",
  },
  {
    id: "bootstrap-error",
    label: "Bootstrap error",
    description: "Workspace-level error while loading initial data",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: null,
      activeDmId: null,
      activeThreadId: null,
      ui: { bootstrapError: "Failed to load workspace data" },
    },
    initialRoute: "/w/acme",
  },
  {
    id: "no-selection",
    label: "No selection",
    description: "Workspace loaded with no active channel or DM selected",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: null,
      activeDmId: null,
      activeThreadId: null,
    },
    initialRoute: "/w/acme",
  },
  {
    id: "channel-loading",
    label: "Channel loading",
    description: "Selected channel with message list loading state",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: CHANNEL_IDS.general,
      activeDmId: null,
      activeThreadId: null,
      ui: { channelMessagesLoading: { [CHANNEL_IDS.general]: true } },
    },
    initialRoute: "/w/acme",
  },
  {
    id: "channel-error",
    label: "Channel error",
    description: "Selected channel with message load error state",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: CHANNEL_IDS.general,
      activeDmId: null,
      activeThreadId: null,
      ui: { channelMessagesError: { [CHANNEL_IDS.general]: "Failed to load messages" } },
    },
    initialRoute: "/w/acme",
  },
  {
    id: "thread-loading",
    label: "Thread loading",
    description: "Thread panel open with loading indicator",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: CHANNEL_IDS.general,
      activeDmId: null,
      activeThreadId: "msg-6",
      ui: { threadLoading: { "msg-6": true } },
    },
    initialRoute: "/w/acme",
  },
  {
    id: "thread-error",
    label: "Thread error",
    description: "Thread panel open with load error message",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: CHANNEL_IDS.general,
      activeDmId: null,
      activeThreadId: "msg-6",
      ui: { threadError: { "msg-6": "Failed to load thread" } },
    },
    initialRoute: "/w/acme",
  },
  {
    id: "mutation-error-banner",
    label: "Mutation error banner",
    description: "Channel view showing bottom mutation error banner",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: CHANNEL_IDS.general,
      activeDmId: null,
      activeThreadId: null,
      ui: { mutationError: "Failed to send message" },
    },
    initialRoute: "/w/acme",
  },
  {
    id: "profile-sidebar-offline",
    label: "Profile sidebar offline",
    description: "User profile sidebar open with offline presence/last seen",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: CHANNEL_IDS.general,
      activeDmId: null,
      activeThreadId: null,
      activeProfileUserId: USER_IDS.carol,
    },
    mocks: {
      members: MOCK_MEMBERS,
    },
    initialRoute: "/w/acme",
  },
  {
    id: "search-no-results",
    label: "Search no results",
    description: "Search modal open with prefilled query returning no matches",
    mockUser: MOCK_CURRENT_USER,
    seed: {
      ...baseSeed,
      activeChannelId: CHANNEL_IDS.general,
      activeDmId: null,
      activeThreadId: null,
    },
    mocks: {
      search: {
        prefillQuery: "nothing-here",
        responses: MOCK_SEARCH_RESPONSES,
      },
    },
    initialRoute: "/w/acme",
    triggerKeyAfterMount: { key: "k", metaKey: true },
  },
  {
    id: "workspace-list",
    label: "Workspace list",
    description: "Home page with 3 workspaces (owner, admin, member roles)",
    mockUser: MOCK_CURRENT_USER,
    seed: { ...baseSeed, activeChannelId: null, activeDmId: null, activeThreadId: null },
    mocks: {
      workspaceList: MOCK_WORKSPACE_LIST,
    },
    initialRoute: "/",
  },
];
