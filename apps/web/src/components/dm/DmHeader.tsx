import type { HuddleState } from "@openslack/shared";
import { HuddleHeaderButton } from "../huddle/HuddleHeaderButton";

interface DmHeaderProps {
  otherUserName: string;
  isSelf: boolean;
  channelId?: string;
  activeHuddle?: HuddleState | null;
  currentHuddleChannelId?: string | null;
  onStartHuddle?: () => void;
  onJoinHuddle?: () => void;
}

export function DmHeader({
  otherUserName,
  isSelf,
  channelId,
  activeHuddle,
  currentHuddleChannelId,
  onStartHuddle,
  onJoinHuddle,
}: DmHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-border-default min-h-[52px] flex items-center justify-between">
      <h2 className="font-bold text-lg m-0 text-primary">
        {isSelf ? `${otherUserName} (notes)` : otherUserName}
      </h2>
      {channelId && onStartHuddle && onJoinHuddle && (
        <HuddleHeaderButton
          channelId={channelId}
          activeHuddle={activeHuddle ?? null}
          currentHuddleChannelId={currentHuddleChannelId ?? null}
          onStart={onStartHuddle}
          onJoin={onJoinHuddle}
        />
      )}
    </div>
  );
}
