import type { BotScope, BotEventType } from "@openslaq/shared";

const SCOPE_GROUPS: { label: string; scopes: { value: BotScope; label: string; description: string }[] }[] = [
  {
    label: "Messages",
    scopes: [
      { value: "chat:read", label: "Read messages", description: "Read channel message history" },
      { value: "chat:write", label: "Send messages", description: "Post messages to channels" },
    ],
  },
  {
    label: "Channels",
    scopes: [
      { value: "channels:read", label: "List channels", description: "View channel names and info" },
      { value: "channels:write", label: "Manage channels", description: "Create and modify channels" },
    ],
  },
  {
    label: "Members",
    scopes: [
      { value: "channels:members:read", label: "View members", description: "See who is in a channel" },
      { value: "channels:members:write", label: "Manage members", description: "Add or remove channel members" },
    ],
  },
  {
    label: "Reactions",
    scopes: [
      { value: "reactions:read", label: "Read reactions", description: "See emoji reactions" },
      { value: "reactions:write", label: "Add reactions", description: "React to messages with emoji" },
    ],
  },
  {
    label: "Users & Presence",
    scopes: [
      { value: "users:read", label: "View users", description: "See user profiles" },
      { value: "presence:read", label: "View presence", description: "See who is online" },
    ],
  },
];

const EVENT_OPTIONS: { value: BotEventType; label: string }[] = [
  { value: "message:new", label: "New messages" },
  { value: "message:updated", label: "Message edits" },
  { value: "message:deleted", label: "Message deletions" },
  { value: "reaction:updated", label: "Reaction changes" },
  { value: "channel:member-added", label: "Member added" },
  { value: "channel:member-removed", label: "Member removed" },
  { value: "presence:updated", label: "Presence changes" },
];

interface BotScopeSelectorProps {
  selectedScopes: string[];
  onScopesChange: (scopes: string[]) => void;
  selectedEvents: string[];
  onEventsChange: (events: string[]) => void;
}

export function BotScopeSelector({ selectedScopes, onScopesChange, selectedEvents, onEventsChange }: BotScopeSelectorProps) {
  const toggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      onScopesChange(selectedScopes.filter((s) => s !== scope));
    } else {
      onScopesChange([...selectedScopes, scope]);
    }
  };

  const toggleEvent = (event: string) => {
    if (selectedEvents.includes(event)) {
      onEventsChange(selectedEvents.filter((e) => e !== event));
    } else {
      onEventsChange([...selectedEvents, event]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Permissions</h4>
        <div className="flex flex-col gap-3">
          {SCOPE_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-xs font-medium text-secondary mb-1">{group.label}</div>
              <div className="flex flex-col gap-1">
                {group.scopes.map((scope) => (
                  <label key={scope.value} className="flex items-start gap-2 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-0.5"
                      data-testid={`scope-${scope.value}`}
                    />
                    <div>
                      <div className="text-sm text-primary">{scope.label}</div>
                      <div className="text-xs text-faint">{scope.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Event Subscriptions</h4>
        <div className="flex flex-col gap-1">
          {EVENT_OPTIONS.map((event) => (
            <label key={event.value} className="flex items-center gap-2 cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={selectedEvents.includes(event.value)}
                onChange={() => toggleEvent(event.value)}
                data-testid={`event-${event.value}`}
              />
              <span className="text-sm text-primary">{event.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
