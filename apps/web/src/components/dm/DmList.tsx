import clsx from "clsx";
import type { HuddleState } from "@openslack/shared";
import { Badge, Tooltip } from "../ui";

interface DmUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface DmConversation {
  channel: { id: string };
  otherUser: DmUser;
}

interface PresenceEntry {
  online: boolean;
  lastSeenAt: string | null;
}

interface DmListProps {
  activeDmId: string | null;
  onSelectDm: (channelId: string) => void;
  dms: DmConversation[];
  currentUserId: string;
  onNewDm: () => void;
  unreadCounts: Record<string, number>;
  presence: Record<string, PresenceEntry>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  activeHuddles?: Record<string, HuddleState>;
}

export function DmList({
  activeDmId,
  onSelectDm,
  dms,
  currentUserId,
  onNewDm,
  unreadCounts,
  presence,
  collapsed,
  onToggleCollapsed,
  activeHuddles,
}: DmListProps) {
  return (
    <div className="py-2">
      <button
        type="button"
        data-testid="dms-section-header"
        onClick={onToggleCollapsed}
        className="group w-full px-4 py-1 text-[13px] text-gray-400 font-semibold flex items-center justify-between hover:bg-white/10 rounded-sm bg-transparent border-none cursor-pointer text-left"
      >
        <span className="flex items-center gap-1">
          {/* Speech bubble icon (default) */}
          <svg
            className="w-3 h-3 group-hover:hidden"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {/* Chevron (on hover) */}
          <svg
            className={clsx("w-3 h-3 hidden group-hover:block transition-transform", collapsed && "-rotate-90")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Direct Messages
        </span>
        <Tooltip content="New direct message">
          <span
            role="button"
            data-testid="new-dm-button"
            onClick={(e) => { e.stopPropagation(); onNewDm(); }}
            className="opacity-0 group-hover:opacity-100 text-base px-1 leading-none hover:text-white"
          >
            +
          </span>
        </Tooltip>
      </button>
      {!collapsed && dms.map(({ channel, otherUser }) => {
        const isSelf = otherUser.id === currentUserId;
        const label = isSelf ? `${otherUser.displayName} (you)` : otherUser.displayName;
        const unread = unreadCounts[channel.id] ?? 0;
        const online = presence[otherUser.id]?.online ?? false;
        const huddle = activeHuddles?.[channel.id];
        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => onSelectDm(channel.id)}
            className={clsx(
              "flex w-full items-center justify-between py-1 pl-6 pr-4 border-none text-white text-left cursor-pointer text-sm",
              activeDmId === channel.id
                ? "bg-white/15"
                : "bg-transparent hover:bg-white/10",
            )}
          >
            <span className={clsx("flex items-center gap-2", unread > 0 && "font-bold")}>
              <span
                data-testid={`presence-${otherUser.id}`}
                className={clsx(
                  "w-2 h-2 rounded-full shrink-0",
                  online ? "bg-green-500" : "bg-gray-500",
                )}
              />
              {label}
              {huddle && (
                <span className="flex items-center gap-0.5 text-green-400" data-testid={`huddle-indicator-${channel.id}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 8.464a5 5 0 000 7.072" />
                  </svg>
                  <span className="text-[10px]">{huddle.participants.length}</span>
                </span>
              )}
            </span>
            {unread > 0 && (
              <Badge
                variant="red"
                size="sm"
                data-testid={`unread-badge-${channel.id}`}
              >
                {unread}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
