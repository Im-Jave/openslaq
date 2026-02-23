import clsx from "clsx";
import type { Channel, HuddleState } from "@openslack/shared";
import { Badge, Tooltip } from "../ui";

interface ChannelListProps {
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  channels: Channel[];
  unreadCounts: Record<string, number>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCreateChannel?: () => void;
  activeHuddles?: Record<string, HuddleState>;
}

export function ChannelList({
  activeChannelId,
  onSelectChannel,
  channels,
  unreadCounts,
  collapsed,
  onToggleCollapsed,
  onCreateChannel,
  activeHuddles,
}: ChannelListProps) {
  return (
    <div className="py-2">
      <button
        type="button"
        data-testid="channels-section-header"
        onClick={onToggleCollapsed}
        className="group w-full px-4 py-1 text-[13px] text-gray-400 font-semibold flex items-center justify-between hover:bg-white/10 rounded-sm bg-transparent border-none cursor-pointer text-left"
      >
        <span className="flex items-center gap-1">
          {/* Hash icon (default) */}
          <svg
            className="w-3 h-3 group-hover:hidden"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
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
          Channels
        </span>
        {onCreateChannel && (
          <Tooltip content="Create channel">
            <span
              role="button"
              data-testid="create-channel-button"
              onClick={(e) => { e.stopPropagation(); onCreateChannel(); }}
              className="opacity-0 group-hover:opacity-100 text-base px-1 leading-none hover:text-white"
            >
              +
            </span>
          </Tooltip>
        )}
      </button>
      {!collapsed &&
        channels.map((channel) => {
          const unread = unreadCounts[channel.id] ?? 0;
          const huddle = activeHuddles?.[channel.id];
          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={clsx(
                "flex w-full items-center justify-between py-1 pl-6 pr-4 border-none text-white text-left cursor-pointer text-sm",
                activeChannelId === channel.id
                  ? "bg-white/15"
                  : "bg-transparent hover:bg-white/10",
              )}
            >
              <span className={clsx("flex items-center gap-1.5", unread > 0 && "font-bold")}>
                {channel.type === "private" ? (
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                ) : "# "}{channel.name}
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
