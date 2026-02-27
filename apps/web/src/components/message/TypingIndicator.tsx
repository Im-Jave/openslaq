import type { TypingUser } from "../../hooks/chat/useTypingTracking";

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

function formatTypingText(users: TypingUser[]): string {
  const first = users[0]!;
  if (users.length === 1) {
    return `${first.displayName} is typing...`;
  }
  const second = users[1]!;
  if (users.length === 2) {
    return `${first.displayName} and ${second.displayName} are typing...`;
  }
  return `${first.displayName} and ${users.length - 1} others are typing...`;
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  return (
    <div data-testid="typing-indicator" className="px-4 py-1 text-xs italic text-muted">
      {formatTypingText(typingUsers)}
    </div>
  );
}
