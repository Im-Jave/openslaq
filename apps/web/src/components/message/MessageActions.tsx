import type { MessageActionButton } from "@openslaq/shared";

interface MessageActionsProps {
  actions: MessageActionButton[];
  messageId: string;
  onAction: (messageId: string, actionId: string) => void;
}

const styleClasses: Record<string, string> = {
  primary: "bg-slaq-blue text-white hover:bg-slaq-blue/90",
  danger: "bg-red-600 text-white hover:bg-red-700",
  default: "bg-surface-secondary text-primary hover:bg-surface-tertiary border border-border-default",
};

export function MessageActions({ actions, messageId, onAction }: MessageActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          data-testid={`bot-action-${action.id}`}
          onClick={() => onAction(messageId, action.id)}
          className={`px-3 py-1 text-sm font-medium rounded cursor-pointer border-none ${styleClasses[action.style ?? "default"] ?? styleClasses.default}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
