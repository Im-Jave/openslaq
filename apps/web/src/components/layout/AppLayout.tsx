import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ResizeHandle } from "./ResizeHandle";
import { MessageList } from "../message/MessageList";
import { MessageInput, type MessageInputHandle } from "../message/MessageInput";
import { ChannelHeader } from "../channel/ChannelHeader";
import { DmHeader } from "../dm/DmHeader";
import { ThreadPanel } from "../message/ThreadPanel";
import { UserProfileSidebar } from "../profile/UserProfileSidebar";
import { SearchModal } from "../search/SearchModal";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useResizable } from "../../hooks/useResizable";
import { useWorkspaceBootstrap } from "../../hooks/chat/useWorkspaceBootstrap";
import { useUnreadTracking } from "../../hooks/chat/useUnreadTracking";
import { usePresenceTracking } from "../../hooks/chat/usePresenceTracking";
import { useHuddleTracking } from "../../hooks/chat/useHuddleTracking";
import { useHuddleActions } from "../../hooks/chat/useHuddleActions";
import { useHuddleAudio } from "../../hooks/chat/useHuddleAudio";
import { useDmActions } from "../../hooks/chat/useDmActions";
import { useScrollToMessage } from "../../hooks/chat/useScrollToMessage";
import { useChannelMemberTracking } from "../../hooks/chat/useChannelMemberTracking";
import { useNotifications } from "../../hooks/useNotifications";
import { useFileDragOverlay } from "../../hooks/useFileDragOverlay";
import { useChatSelectors, useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";
import type { SearchResultItem, Channel } from "@openslack/shared";

export function AppLayout() {
  const user = useCurrentUser();
  const { workspaceSlug, channelId: urlChannelId, dmChannelId: urlDmChannelId } = useParams<{
    workspaceSlug: string;
    channelId: string;
    dmChannelId: string;
  }>();
  const navigate = useNavigate();
  const { state, dispatch } = useChatStore();
  const { activeChannel, activeDm, currentChannelId } = useChatSelectors();
  const { createDm } = useDmActions(user, workspaceSlug);

  const [searchOpen, setSearchOpen] = useState(false);
  const huddleActions = useHuddleActions();
  const huddleAudio = useHuddleAudio(user?.id);
  const isGallery = useGalleryMode();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<MessageInputHandle>(null);

  const handleFileDrop = useCallback((files: FileList) => {
    messageInputRef.current?.addFiles(files);
  }, []);

  const { isDraggingFiles } = useFileDragOverlay({
    dropRef: mainContentRef,
    onDrop: handleFileDrop,
  });

  useWorkspaceBootstrap(user, workspaceSlug, urlChannelId, urlDmChannelId);

  // Sync store state → URL (one-way: store is source of truth)
  useEffect(() => {
    if (isGallery || state.ui.bootstrapLoading || !workspaceSlug) return;
    const base = `/w/${workspaceSlug}`;
    if (state.activeDmId) {
      const target = `${base}/dm/${state.activeDmId}`;
      if (urlDmChannelId !== state.activeDmId) {
        navigate(target, { replace: true });
      }
    } else if (state.activeChannelId) {
      const target = `${base}/c/${state.activeChannelId}`;
      if (urlChannelId !== state.activeChannelId) {
        navigate(target, { replace: true });
      }
    }
  }, [isGallery, state.activeChannelId, state.activeDmId, state.ui.bootstrapLoading, workspaceSlug, urlChannelId, urlDmChannelId, navigate]);
  useUnreadTracking(user, workspaceSlug);
  usePresenceTracking();
  useHuddleTracking();
  useChannelMemberTracking(workspaceSlug);
  useNotifications();
  useScrollToMessage(currentChannelId, workspaceSlug);

  const leftResize = useResizable({
    side: "right",
    min: 200,
    max: 400,
    defaultWidth: 260,
    storageKey: "openslack-sidebar-width-left",
  });
  const rightResize = useResizable({
    side: "left",
    min: 300,
    max: 600,
    defaultWidth: 400,
    storageKey: "openslack-sidebar-width-right",
  });

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectChannel = useCallback(
    (id: string) => {
      dispatch({ type: "workspace/selectChannel", channelId: id });
    },
    [dispatch],
  );

  const handleSelectDm = useCallback(
    (channelId: string) => {
      dispatch({ type: "workspace/selectDm", channelId });
    },
    [dispatch],
  );

  const handleOpenThread = useCallback(
    (messageId: string) => {
      dispatch({ type: "workspace/openThread", messageId });
    },
    [dispatch],
  );

  const handleCloseThread = useCallback(() => {
    dispatch({ type: "workspace/closeThread" });
  }, [dispatch]);

  const handleOpenProfile = useCallback(
    (userId: string) => {
      dispatch({ type: "workspace/openProfile", userId });
    },
    [dispatch],
  );

  const handleCloseProfile = useCallback(() => {
    dispatch({ type: "workspace/closeProfile" });
  }, [dispatch]);

  const handleSendMessageFromProfile = useCallback(
    async (targetUserId: string) => {
      await createDm(targetUserId);
      dispatch({ type: "workspace/closeProfile" });
    },
    [createDm, dispatch],
  );

  const handleStartDm = useCallback(
    async (targetUserId: string) => {
      await createDm(targetUserId);
    },
    [createDm],
  );

  const handleChannelCreated = useCallback(
    (channel: Channel) => {
      dispatch({ type: "workspace/addChannel", channel });
      dispatch({ type: "workspace/selectChannel", channelId: channel.id });
    },
    [dispatch],
  );

  const handleNavigateToMessage = useCallback(
    (result: SearchResultItem) => {
      // Select the right channel/DM
      const isDm = result.channelType === "dm";
      if (isDm) {
        dispatch({ type: "workspace/selectDm", channelId: result.channelId });
      } else {
        dispatch({ type: "workspace/selectChannel", channelId: result.channelId });
      }

      // If it's a thread reply, open the thread panel
      if (result.parentMessageId) {
        dispatch({ type: "workspace/openThread", messageId: result.parentMessageId });
      }

      // Set scroll target — for replies, navigate to the parent in channel view
      const targetMessageId = result.parentMessageId ?? result.messageId;
      dispatch({
        type: "navigation/setScrollTarget",
        scrollTarget: {
          messageId: targetMessageId,
          highlightMessageId: targetMessageId,
        },
      });
    },
    [dispatch],
  );

  const handleToggleMute = useCallback(() => {
    const newMuted = !huddleAudio.isMuted;
    huddleAudio.toggleMute(newMuted);
    huddleActions.toggleMute(newMuted);
  }, [huddleAudio, huddleActions]);

  const handleLeaveHuddle = useCallback(() => {
    huddleActions.leaveHuddle();
  }, [huddleActions]);

  const handleStartHuddle = useCallback(
    (channelId: string) => {
      huddleActions.startHuddle(channelId);
    },
    [huddleActions],
  );

  const handleJoinHuddle = useCallback(
    (channelId: string) => {
      huddleActions.joinHuddle(channelId);
    },
    [huddleActions],
  );

  const currentUserId = user?.id ?? "";
  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const canManage = currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  return (
    <div className="flex h-screen">
      <Sidebar
        activeChannelId={state.activeChannelId}
        onSelectChannel={handleSelectChannel}
        channels={state.channels}
        activeDmId={state.activeDmId}
        onSelectDm={handleSelectDm}
        dms={state.dms}
        currentUserId={currentUserId}
        onStartDm={handleStartDm}
        workspaceSlug={workspaceSlug ?? ""}
        workspaces={state.workspaces}
        unreadCounts={state.unreadCounts}
        presence={state.presence}
        onOpenSearch={() => setSearchOpen(true)}
        onChannelCreated={handleChannelCreated}
        activeHuddles={state.activeHuddles}
        currentHuddleChannelId={state.currentHuddleChannelId}
        isMuted={huddleAudio.isMuted}
        onToggleMute={handleToggleMute}
        onLeaveHuddle={handleLeaveHuddle}
        onSwitchDevice={huddleAudio.switchDevice}
        style={{ width: leftResize.width }}
      />
      <ResizeHandle
        testId="resize-handle-left"
        onMouseDown={leftResize.handleMouseDown}
        isDragging={leftResize.isDragging}
      />

      <div ref={mainContentRef} className="flex-1 min-w-0 flex flex-col bg-surface relative" data-testid="main-content">
        {state.ui.bootstrapLoading ? (
          <div className="flex-1 flex items-center justify-center text-faint">
            Loading workspace...
          </div>
        ) : state.ui.bootstrapError ? (
          <div className="flex-1 flex items-center justify-center text-danger-text">
            {state.ui.bootstrapError}
          </div>
        ) : activeChannel ? (
          <>
            <ChannelHeader
              channelName={activeChannel.name}
              channelId={activeChannel.id}
              channelType={activeChannel.type}
              channelCreatorId={activeChannel.createdBy}
              memberCount={activeChannel.memberCount}
              workspaceSlug={workspaceSlug ?? ""}
              presence={state.presence}
              onOpenProfile={handleOpenProfile}
              activeHuddle={state.activeHuddles[activeChannel.id] ?? null}
              currentHuddleChannelId={state.currentHuddleChannelId}
              onStartHuddle={() => handleStartHuddle(activeChannel.id)}
              onJoinHuddle={() => handleJoinHuddle(activeChannel.id)}
              canManageMembers={canManage || activeChannel.createdBy === currentUserId}
            />
            <MessageList channelId={activeChannel.id} onOpenThread={handleOpenThread} onOpenProfile={handleOpenProfile} />
            <MessageInput ref={messageInputRef} channelId={activeChannel.id} channelName={activeChannel.name} externalDragDrop />
          </>
        ) : activeDm ? (
          <>
            <DmHeader
              otherUserName={activeDm.otherUser.displayName}
              isSelf={activeDm.otherUser.id === currentUserId}
              channelId={activeDm.channel.id}
              activeHuddle={state.activeHuddles[activeDm.channel.id] ?? null}
              currentHuddleChannelId={state.currentHuddleChannelId}
              onStartHuddle={() => handleStartHuddle(activeDm.channel.id)}
              onJoinHuddle={() => handleJoinHuddle(activeDm.channel.id)}
            />
            <MessageList channelId={activeDm.channel.id} onOpenThread={handleOpenThread} onOpenProfile={handleOpenProfile} />
            <MessageInput
              ref={messageInputRef}
              channelId={activeDm.channel.id}
              channelName={activeDm.otherUser.displayName}
              externalDragDrop
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-faint">
            Select a channel or DM to start chatting
          </div>
        )}

        {state.ui.mutationError && (
          <div className="px-4 py-2 border-t border-danger-border text-danger-text bg-danger-bg text-[13px]">
            {state.ui.mutationError}
          </div>
        )}

        {isDraggingFiles && (
          <div className="absolute inset-0 bg-surface/80 z-20 flex flex-col items-center justify-center pointer-events-none" data-testid="drag-overlay">
            <svg className="w-12 h-12 text-slack-blue mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-lg font-semibold text-primary">Upload file</span>
          </div>
        )}
      </div>

      {state.activeProfileUserId ? (
        <>
          <ResizeHandle
            testId="resize-handle-right"
            onMouseDown={rightResize.handleMouseDown}
            isDragging={rightResize.isDragging}
          />
          <UserProfileSidebar
            userId={state.activeProfileUserId}
            onClose={handleCloseProfile}
            onSendMessage={handleSendMessageFromProfile}
            style={{ width: rightResize.width }}
          />
        </>
      ) : state.activeThreadId && currentChannelId ? (
        <>
          <ResizeHandle
            testId="resize-handle-right"
            onMouseDown={rightResize.handleMouseDown}
            isDragging={rightResize.isDragging}
          />
          <ThreadPanel
            channelId={currentChannelId}
            parentMessageId={state.activeThreadId}
            onClose={handleCloseThread}
            onOpenProfile={handleOpenProfile}
            style={{ width: rightResize.width }}
          />
        </>
      ) : null}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateToMessage={handleNavigateToMessage}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
