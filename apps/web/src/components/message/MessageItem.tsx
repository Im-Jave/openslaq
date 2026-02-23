import { useState, useRef, useEffect } from "react";
import type { Message } from "@openslack/shared";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { ReactionBar } from "./ReactionBar";
import { MessageActionBar } from "./MessageActionBar";
import { Avatar, Button } from "../ui";

interface MessageItemProps {
  message: Message;
  currentUserId?: string;
  onOpenThread?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onOpenProfile?: (userId: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export function MessageItem({
  message,
  currentUserId,
  onOpenThread,
  onToggleReaction,
  onOpenProfile,
  onEditMessage,
  onDeleteMessage,
}: MessageItemProps) {
  const isTopLevel = !message.parentMessageId;
  const displayName = message.senderDisplayName ?? message.userId;
  const isOwnMessage = Boolean(currentUserId && message.userId === currentUserId);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content ?? "");
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
  }, [isEditing]);

  const handleEditSave = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content && onEditMessage) {
      onEditMessage(message.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content ?? "");
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  return (
    <div className="mb-3 relative group px-4 -mx-4 rounded hover:bg-surface-secondary/50" data-message-id={message.id}>
      {onToggleReaction && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageActionBar
            onAddReaction={(emoji) => onToggleReaction(message.id, emoji)}
            onOpenThread={isTopLevel && onOpenThread ? () => onOpenThread(message.id) : undefined}
            isOwnMessage={isOwnMessage}
            onEditMessage={onEditMessage ? () => {
              setEditContent(message.content ?? "");
              setIsEditing(true);
            } : undefined}
            onDeleteMessage={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
          />
        </div>
      )}
      <div className="flex gap-2.5 items-start">
        {onOpenProfile ? (
          <button
            type="button"
            data-testid={`message-avatar-${message.id}`}
            onClick={() => onOpenProfile(message.userId)}
            className="bg-transparent border-none p-0 cursor-pointer mt-0.5"
          >
            <Avatar
              src={message.senderAvatarUrl}
              fallback={displayName}
              size="md"
              shape="rounded"
            />
          </button>
        ) : (
          <Avatar
            src={message.senderAvatarUrl}
            fallback={displayName}
            size="md"
            shape="rounded"
            className="mt-0.5"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {onOpenProfile ? (
              <button
                type="button"
                onClick={() => onOpenProfile(message.userId)}
                className="bg-transparent border-none p-0 font-semibold text-sm text-primary cursor-pointer hover:underline"
              >
                {displayName}
              </button>
            ) : (
              <span className="font-semibold text-sm text-primary">
                {displayName}
              </span>
            )}
            <span className="text-[11px] text-faint">
              {new Date(message.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          {isEditing ? (
            <div className="mt-1">
              <textarea
                ref={editRef}
                data-testid="edit-message-input"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="w-full bg-surface border border-border-default rounded-md px-3 py-2 text-sm text-primary resize-none focus:outline-none focus:border-slack-blue"
                rows={2}
              />
              <div className="flex gap-2 mt-1 text-xs text-faint">
                <span>Enter to save</span>
                <span>·</span>
                <span>Esc to cancel</span>
              </div>
            </div>
          ) : (
            <>
              {message.content && <MessageContent content={message.content} />}
              {message.attachments?.length > 0 && (
                <MessageAttachments attachments={message.attachments} />
              )}
            </>
          )}
          {currentUserId && onToggleReaction && (
            <ReactionBar
              reactions={message.reactions ?? []}
              currentUserId={currentUserId}
              onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
            />
          )}
          {isTopLevel && onOpenThread && message.replyCount > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="ghost"
                size="sm"
                data-testid={`thread-replies-${message.id}`}
                onClick={() => onOpenThread(message.id)}
                className="text-slack-blue p-0 font-semibold"
              >
                {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
