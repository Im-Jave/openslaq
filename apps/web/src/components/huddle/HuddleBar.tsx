import type { HuddleState, Channel } from "@openslack/shared";
import { Tooltip } from "../ui";
import { DeviceSelector } from "./DeviceSelector";

interface HuddleBarDm {
  channel: { id: string };
  otherUser: { displayName: string };
}

interface HuddleBarProps {
  huddle: HuddleState;
  channels: Channel[];
  dms: HuddleBarDm[];
  isMuted: boolean;
  onToggleMute: () => void;
  onLeave: () => void;
  onSwitchDevice?: (deviceId: string) => void;
  speakingUserIds?: Set<string>;
}

export function HuddleBar({
  huddle,
  channels,
  dms,
  isMuted,
  onToggleMute,
  onLeave,
  onSwitchDevice,
  speakingUserIds,
}: HuddleBarProps) {
  const channel = channels.find((c) => c.id === huddle.channelId);
  const dm = dms.find((d) => d.channel.id === huddle.channelId);
  const label = channel ? `# ${channel.name}` : dm ? dm.otherUser.displayName : "Huddle";

  return (
    <div className="border-t border-gray-800 bg-gray-800 px-3 py-2" data-testid="huddle-bar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 8.464a5 5 0 000 7.072M17.657 6.343a8 8 0 010 11.314M6.343 6.343a8 8 0 000 11.314" />
            </svg>
            <span className="text-green-400 text-xs font-medium">Huddle</span>
          </div>
          <span className="text-gray-300 text-xs truncate">{label}</span>
          <div className="flex -space-x-1">
            {huddle.participants.map((p) => {
              const isSpeaking = speakingUserIds?.has(p.userId);
              return (
                <div
                  key={p.userId}
                  className={`w-5 h-5 rounded-full bg-gray-600 border-2 flex items-center justify-center text-[9px] text-gray-300 transition-colors ${
                    isSpeaking
                      ? "border-green-400 ring-1 ring-green-400/50"
                      : "border-gray-800"
                  }`}
                  title={p.userId}
                >
                  {p.userId.slice(0, 1).toUpperCase()}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onSwitchDevice && <DeviceSelector onSelectDevice={onSwitchDevice} />}
          <Tooltip content={isMuted ? "Unmute" : "Mute"}>
            <button
              type="button"
              onClick={onToggleMute}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white bg-transparent border-none cursor-pointer"
              data-testid="huddle-mute-toggle"
            >
            {isMuted ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          </Tooltip>
          <Tooltip content="Leave huddle">
            <button
              type="button"
              onClick={onLeave}
              className="p-1.5 rounded hover:bg-red-600/30 text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer"
              data-testid="huddle-leave"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
