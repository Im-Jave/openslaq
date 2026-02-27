import { useState } from "react";
import { asChannelId, asUserId } from "@openslaq/shared";
import type { Channel, ChannelType } from "@openslaq/shared";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { AuthError, getErrorMessage } from "../../lib/errors";
import { redirectToAuth } from "../../lib/auth";
import { useGalleryMode } from "../../gallery/gallery-context";
import { useChatStore } from "../../state/chat-store";
import { Dialog, DialogContent, DialogTitle, Button, Input } from "../ui";

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onChannelCreated: (channel: Channel) => void;
  workspaceSlug: string;
  canCreatePrivate?: boolean;
}

export function CreateChannelDialog({
  open,
  onClose,
  onChannelCreated,
  workspaceSlug,
  canCreatePrivate,
}: CreateChannelDialogProps) {
  const user = useCurrentUser();
  const isGallery = useGalleryMode();
  const { state } = useChatStore();
  const [name, setName] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !user || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      if (isGallery) {
        const workspaceId = state.workspaces.find((ws) => ws.slug === workspaceSlug)?.id ?? state.workspaces[0]?.id;
        if (!workspaceId) {
          throw new Error("No workspace found for demo channel creation");
        }

        const channel: Channel = {
          id: asChannelId(`demo-channel-${Date.now()}`),
          workspaceId,
          name: name.trim().toLowerCase().replace(/\s+/g, "-"),
          type: type as ChannelType,
          description: null,
          displayName: null,
          isArchived: false,
          createdBy: asUserId(user.id),
          createdAt: new Date().toISOString(),
        };
        setName("");
        setType("public");
        onChannelCreated(channel);
        return;
      }

      const res = await authorizedRequest(user, (headers) =>
        api.api.workspaces[":slug"].channels.$post(
          { param: { slug: workspaceSlug }, json: { name: name.trim(), type } },
          { headers },
        ),
      );
      const channel = (await res.json()) as Channel;
      setName("");
      setType("public");
      onChannelCreated(channel);
    } catch (err) {
      if (err instanceof AuthError) {
        redirectToAuth();
        return;
      }
      setError(getErrorMessage(err, "Failed to create channel"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setType("public");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent size="sm" className="p-4">
        <DialogTitle className="mb-3">Create Channel</DialogTitle>
        {error && <p className="text-danger-text text-[13px] mb-2">{error}</p>}
        <Input
          data-testid="create-channel-name-input"
          placeholder="Channel name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          autoFocus
        />
        {canCreatePrivate && (
          <div className="flex gap-2 mt-3" data-testid="channel-visibility-toggle">
            <button
              type="button"
              onClick={() => setType("public")}
              className={`flex-1 px-3 py-2 text-sm rounded border cursor-pointer ${
                type === "public"
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-transparent text-secondary border-border-default hover:bg-hover"
              }`}
            >
              # Public
            </button>
            <button
              type="button"
              onClick={() => setType("private")}
              className={`flex-1 px-3 py-2 text-sm rounded border cursor-pointer ${
                type === "private"
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-transparent text-secondary border-border-default hover:bg-hover"
              }`}
            >
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Private
            </button>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || submitting}
          >
            {submitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
