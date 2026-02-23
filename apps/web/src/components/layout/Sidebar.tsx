import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGalleryMode } from "../../gallery/gallery-context";
import { ChannelList } from "../channel/ChannelList";
import { CreateChannelDialog } from "../channel/CreateChannelDialog";
import { DmList } from "../dm/DmList";
import { NewDmDialog } from "../dm/NewDmDialog";
import { CustomUserButton } from "../user/CustomUserButton";
import { WorkspaceSettingsDialog } from "../settings/WorkspaceSettingsDialog";
import { InviteDialog } from "../settings/InviteDialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import type { Channel, HuddleState } from "@openslack/shared";
import { HuddleBar } from "../huddle/HuddleBar";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface DmConversation {
  channel: { id: string };
  otherUser: { id: string; displayName: string; avatarUrl: string | null };
}

interface PresenceEntry {
  online: boolean;
  lastSeenAt: string | null;
}

interface SidebarProps {
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  channels: Channel[];
  activeDmId: string | null;
  onSelectDm: (channelId: string) => void;
  dms: DmConversation[];
  currentUserId: string;
  onStartDm: (userId: string) => void;
  workspaceSlug: string;
  workspaces: WorkspaceInfo[];
  unreadCounts: Record<string, number>;
  presence: Record<string, PresenceEntry>;
  onOpenSearch?: () => void;
  onChannelCreated?: (channel: Channel) => void;
  activeHuddles?: Record<string, HuddleState>;
  currentHuddleChannelId?: string | null;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onLeaveHuddle?: () => void;
  onSwitchDevice?: (deviceId: string) => void;
  style?: React.CSSProperties;
}

function loadCollapseState(): { channels: boolean; dms: boolean } {
  try {
    const stored = localStorage.getItem("openslack-sidebar-collapse");
    if (stored) return JSON.parse(stored) as { channels: boolean; dms: boolean };
  } catch {
    // ignore
  }
  return { channels: false, dms: false };
}

export function Sidebar({
  activeChannelId,
  onSelectChannel,
  channels,
  activeDmId,
  onSelectDm,
  dms,
  currentUserId,
  onStartDm,
  workspaceSlug,
  workspaces,
  unreadCounts,
  presence,
  onOpenSearch,
  onChannelCreated,
  activeHuddles,
  currentHuddleChannelId,
  isMuted,
  onToggleMute,
  onLeaveHuddle,
  onSwitchDevice,
  style,
}: SidebarProps) {
  const isGallery = useGalleryMode();
  const navigate = useNavigate();
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [sidebarCollapse, setSidebarCollapse] = useState(loadCollapseState);

  useEffect(() => {
    localStorage.setItem("openslack-sidebar-collapse", JSON.stringify(sidebarCollapse));
  }, [sidebarCollapse]);

  const toggleChannelsCollapsed = useCallback(() => {
    setSidebarCollapse((prev) => ({ ...prev, channels: !prev.channels }));
  }, []);

  const toggleDmsCollapsed = useCallback(() => {
    setSidebarCollapse((prev) => ({ ...prev, dms: !prev.dms }));
  }, []);

  const currentWorkspace = workspaces.find((ws) => ws.slug === workspaceSlug);
  const workspaceName = currentWorkspace?.name ?? workspaceSlug;
  const canManage = currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  return (
    <div className="shrink-0 bg-gray-900 text-white flex flex-col" style={style}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-full p-4 font-bold text-lg text-white bg-transparent border-none border-b border-gray-800 cursor-pointer flex items-center justify-between text-left"
          >
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {workspaceName}
            </span>
            <span className="text-xs ml-2 shrink-0">&#9662;</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={0} className="min-w-[200px] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto">
          {workspaces
            .filter((ws) => ws.slug !== workspaceSlug)
            .map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onSelect={() => navigate(`/w/${ws.slug}`)}
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => navigate("/")}
            className="text-text-secondary text-[13px]"
          >
            All workspaces
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuItem
              onSelect={() => setInviteDialogOpen(true)}
              className="text-text-secondary text-[13px]"
            >
              Invite People
            </DropdownMenuItem>
          )}
          {canManage && (
            <DropdownMenuItem
              onSelect={() => setWorkspaceSettingsOpen(true)}
              className="text-text-secondary text-[13px]"
            >
              Settings
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {onOpenSearch && (
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full px-4 py-2 text-[13px] text-gray-400 bg-transparent border-none border-b border-gray-800 cursor-pointer text-left flex items-center gap-2 hover:bg-gray-800"
          data-testid="search-trigger"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search messages...
          <kbd className="ml-auto text-[10px] text-gray-500 bg-gray-800 px-1 py-0.5 rounded">
            {navigator.platform.includes("Mac") ? "\u2318K" : "Ctrl+K"}
          </kbd>
        </button>
      )}

      <div className="flex-1 overflow-y-auto">
        <ChannelList
          activeChannelId={activeChannelId}
          onSelectChannel={onSelectChannel}
          channels={channels}
          unreadCounts={unreadCounts}
          collapsed={sidebarCollapse.channels}
          onToggleCollapsed={toggleChannelsCollapsed}
          onCreateChannel={() => setCreateChannelOpen(true)}
          activeHuddles={activeHuddles}
        />

        <DmList
          activeDmId={activeDmId}
          onSelectDm={onSelectDm}
          dms={dms}
          currentUserId={currentUserId}
          onNewDm={() => setNewDmOpen(true)}
          unreadCounts={unreadCounts}
          presence={presence}
          collapsed={sidebarCollapse.dms}
          onToggleCollapsed={toggleDmsCollapsed}
          activeHuddles={activeHuddles}
        />
      </div>

      {currentHuddleChannelId && activeHuddles?.[currentHuddleChannelId] && onToggleMute && onLeaveHuddle && (
        <HuddleBar
          huddle={activeHuddles[currentHuddleChannelId]}
          channels={channels}
          dms={dms}
          isMuted={isMuted ?? false}
          onToggleMute={onToggleMute}
          onLeave={onLeaveHuddle}
          onSwitchDevice={onSwitchDevice}
        />
      )}

      {!isGallery && (
        <div className="user-button-full-width border-t border-gray-800 p-2">
          <CustomUserButton showUserInfo />
        </div>
      )}

      <NewDmDialog
        open={newDmOpen}
        onClose={() => setNewDmOpen(false)}
        onSelectUser={onStartDm}
        workspaceSlug={workspaceSlug}
      />

      <CreateChannelDialog
        open={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        onChannelCreated={(channel) => {
          setCreateChannelOpen(false);
          onChannelCreated?.(channel);
        }}
        workspaceSlug={workspaceSlug}
        canCreatePrivate={canManage}
      />

      <WorkspaceSettingsDialog
        open={workspaceSettingsOpen}
        onOpenChange={setWorkspaceSettingsOpen}
        workspaceSlug={workspaceSlug}
      />

      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
