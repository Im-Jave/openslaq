import { useState } from "react";
import type { ChannelType, HuddleState } from "@openslack/shared";
import { ChannelMembersDialog } from "./ChannelMembersDialog";
import { HuddleHeaderButton } from "../huddle/HuddleHeaderButton";
import { Button, Tooltip } from "../ui";
import type { PresenceEntry } from "../../state/chat-store";

interface ChannelHeaderProps {
  channelName: string | null;
  channelId?: string;
  channelType?: ChannelType;
  channelCreatorId?: string | null;
  memberCount?: number;
  workspaceSlug?: string;
  presence?: Record<string, PresenceEntry>;
  onOpenProfile?: (userId: string) => void;
  activeHuddle?: HuddleState | null;
  currentHuddleChannelId?: string | null;
  onStartHuddle?: () => void;
  onJoinHuddle?: () => void;
  canManageMembers?: boolean;
}

export function ChannelHeader({
  channelName,
  channelId,
  channelType,
  channelCreatorId,
  memberCount,
  workspaceSlug,
  presence,
  onOpenProfile,
  activeHuddle,
  currentHuddleChannelId,
  onStartHuddle,
  onJoinHuddle,
  canManageMembers,
}: ChannelHeaderProps) {
  const [membersOpen, setMembersOpen] = useState(false);

  const isPrivate = channelType === "private";

  return (
    <div className="px-4 py-3 border-b border-border-default min-h-[52px] flex items-center justify-between">
      <h2 className="font-bold text-lg m-0 text-primary">
        {isPrivate ? (
          <span className="text-faint font-normal mr-1 inline-flex items-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" data-testid="private-channel-icon">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </span>
        ) : (
          <span className="text-faint font-normal mr-0.5">#</span>
        )}
        {channelName ?? "Channel"}
      </h2>

      <div className="flex items-center gap-1">
        {channelId && onStartHuddle && onJoinHuddle && (
          <HuddleHeaderButton
            channelId={channelId}
            activeHuddle={activeHuddle ?? null}
            currentHuddleChannelId={currentHuddleChannelId ?? null}
            onStart={onStartHuddle}
            onJoin={onJoinHuddle}
          />
        )}

      {channelId && memberCount != null && (
        <>
          <Tooltip content="View members">
            <Button
              data-testid="channel-member-count"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMembersOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
              </svg>
              {memberCount}
            </Button>
          </Tooltip>
          <ChannelMembersDialog
            open={membersOpen}
            onOpenChange={setMembersOpen}
            channelId={channelId}
            workspaceSlug={workspaceSlug ?? ""}
            presence={presence ?? {}}
            onOpenProfile={onOpenProfile ?? (() => {})}
            channelType={channelType}
            canManageMembers={canManageMembers}
            channelCreatorId={channelCreatorId}
          />
        </>
      )}
      </div>
    </div>
  );
}
