import { useRef, useState } from "react";
import clsx from "clsx";
import type { ReactionGroup } from "@openslaq/shared";
import { EmojiPicker } from "./EmojiPicker";

interface ReactionBarProps {
  reactions: ReactionGroup[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
}

export function ReactionBar({ reactions, currentUserId, onToggleReaction }: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  if (reactions.length === 0 && !showPicker) return null;

  return (
    <div
      data-testid="reaction-bar"
      className="flex flex-wrap gap-1 mt-1 items-center"
    >
      {reactions.map((r) => {
        const isActive = r.userIds.some((userId) => userId === currentUserId);
        return (
          <button
            key={r.emoji}
            data-testid={`reaction-pill-${r.emoji}`}
            onClick={() => onToggleReaction(r.emoji)}
            className={clsx(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-xl cursor-pointer text-[13px] leading-5",
              isActive
                ? "border border-slaq-blue bg-surface-selected"
                : "border border-border-default bg-surface-secondary",
            )}
          >
            <span>{r.emoji}</span>
            <span className="text-[11px] text-muted">{r.count}</span>
          </button>
        );
      })}
      <button
        ref={addButtonRef}
        data-testid="reaction-add-button"
        onClick={() => setShowPicker(!showPicker)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-xl border border-border-default bg-surface-secondary cursor-pointer text-sm p-0"
      >
        +
      </button>
      {showPicker && (
        <EmojiPicker
          anchorRef={addButtonRef}
          onSelect={(emoji) => {
            onToggleReaction(emoji);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
