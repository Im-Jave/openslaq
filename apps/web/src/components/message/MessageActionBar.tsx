import { useEffect, useRef, useState } from "react";
import { EmojiPicker } from "./EmojiPicker";
import { Button, Tooltip } from "../ui";

interface MessageActionBarProps {
  onAddReaction: (emoji: string) => void;
  onOpenThread?: () => void;
  onEditMessage?: () => void;
  onDeleteMessage?: () => void;
  isOwnMessage?: boolean;
}

export function MessageActionBar({
  onAddReaction,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  isOwnMessage,
}: MessageActionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const quickReactions = ["✅", "👀", "🙌"];

  return (
    <div
      data-testid="message-action-bar"
      className="absolute -top-2 right-2 flex gap-0.5 bg-surface border border-border-default rounded-md p-0.5 shadow-sm"
    >
      {quickReactions.map((emoji) => (
        <Tooltip key={emoji} content={`React with ${emoji}`}>
          <Button
            variant="ghost"
            size="icon"
            data-testid={`quick-react-${emoji}`}
            onClick={() => onAddReaction(emoji)}
            className="text-base leading-none"
          >
            {emoji}
          </Button>
        </Tooltip>
      ))}
      <Tooltip content="Add reaction">
        <Button
          ref={emojiButtonRef}
          variant="ghost"
          size="icon"
          data-testid="reaction-trigger"
          onClick={() => setShowPicker(!showPicker)}
          className="text-base leading-none"
        >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5" />
          <circle cx="5.5" cy="6.5" r="1" fill="#666" />
          <circle cx="10.5" cy="6.5" r="1" fill="#666" />
          <path d="M5 10c.5 1.5 2.5 2.5 3 2.5s2.5-1 3-2.5" stroke="#666" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </Button>
      </Tooltip>
      {showPicker && (
        <EmojiPicker
          anchorRef={emojiButtonRef}
          onSelect={(emoji) => {
            onAddReaction(emoji);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
      {onOpenThread && (
        <Tooltip content="Reply in thread">
          <Button
            variant="ghost"
            size="icon"
            data-testid="reply-action-trigger"
            onClick={onOpenThread}
            className="text-base leading-none"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 3h12v7H5l-3 3V3z"
                stroke="#666"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </Tooltip>
      )}
      {isOwnMessage && (onEditMessage || onDeleteMessage) && (
        <div className="relative">
          <Tooltip content="More actions">
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              data-testid="message-overflow-menu"
              onClick={() => setShowMenu(!showMenu)}
              className="text-base leading-none"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3" r="1.5" fill="#666" />
                <circle cx="8" cy="8" r="1.5" fill="#666" />
                <circle cx="8" cy="13" r="1.5" fill="#666" />
              </svg>
            </Button>
          </Tooltip>
          {showMenu && (
            <div
              ref={menuRef}
              data-testid="message-overflow-dropdown"
              className="absolute right-0 top-full mt-1 bg-surface border border-border-default rounded-md shadow-lg py-1 z-50 min-w-[160px]"
            >
              {onEditMessage && (
                <button
                  type="button"
                  data-testid="edit-message-action"
                  onClick={() => {
                    setShowMenu(false);
                    onEditMessage();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-secondary cursor-pointer bg-transparent border-none"
                >
                  Edit message
                </button>
              )}
              {onDeleteMessage && (
                <button
                  type="button"
                  data-testid="delete-message-action"
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteMessage();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-danger-text hover:bg-surface-secondary cursor-pointer bg-transparent border-none"
                >
                  Delete message
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
