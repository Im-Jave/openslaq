import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, Button, Input } from "../ui";
import { BotScopeSelector } from "./BotScopeSelector";
import { useBotsApi } from "../../hooks/api/useBotsApi";
import { getErrorMessage } from "../../lib/errors";

interface BotCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  onCreated: () => void;
}

export function BotCreateDialog({ open, onOpenChange, workspaceSlug, onCreated }: BotCreateDialogProps) {
  const { createBotApp } = useBotsApi();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [scopes, setScopes] = useState<string[]>(["chat:write", "chat:read"]);
  const [events, setEvents] = useState<string[]>(["message:new"]);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !webhookUrl.trim() || scopes.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createBotApp(workspaceSlug, {
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        webhookUrl: webhookUrl.trim(),
        scopes,
        subscribedEvents: events,
      });
      setCreatedToken(result.apiToken);
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create bot"));
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after close
    setTimeout(() => {
      setName("");
      setDescription("");
      setAvatarUrl("");
      setWebhookUrl("");
      setScopes(["chat:write", "chat:read"]);
      setEvents(["message:new"]);
      setError(null);
      setCreatedToken(null);
      setCopied(false);
    }, 200);
  };

  const handleCopy = async () => {
    if (createdToken) {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show token after creation
  if (createdToken) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent size="md">
          <DialogTitle>Bot Created</DialogTitle>
          <div className="mt-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium m-0 mb-1">
                Save this API token now — it won't be shown again.
              </p>
            </div>
            <div className="flex gap-2">
              <code
                data-testid="bot-api-token"
                className="flex-1 bg-surface-secondary px-3 py-2 rounded text-xs font-mono break-all border border-border-default"
              >
                {createdToken}
              </code>
              <Button variant="primary" size="sm" onClick={() => void handleCopy()} data-testid="copy-token-btn">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="secondary" onClick={handleClose}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="lg" className="max-h-[80vh] flex flex-col p-0">
        <div className="px-6 pt-5 pb-4 border-b border-border-default shrink-0">
          <DialogTitle>Add Bot</DialogTitle>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-primary mb-1 block">Name *</label>
              <Input
                data-testid="bot-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Bot"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-primary mb-1 block">Description</label>
              <Input
                data-testid="bot-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this bot do?"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-primary mb-1 block">Avatar URL</label>
              <Input
                data-testid="bot-avatar-input"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-primary mb-1 block">Webhook URL *</label>
              <Input
                data-testid="bot-webhook-input"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
              />
            </div>

            <BotScopeSelector
              selectedScopes={scopes}
              onScopesChange={setScopes}
              selectedEvents={events}
              onEventsChange={setEvents}
            />

            {error && <div className="text-sm text-danger-text">{error}</div>}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border-default flex justify-end gap-2 shrink-0">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            data-testid="create-bot-submit"
            disabled={!name.trim() || !webhookUrl.trim() || scopes.length === 0 || creating}
            onClick={() => void handleCreate()}
          >
            {creating ? "Creating..." : "Create Bot"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
