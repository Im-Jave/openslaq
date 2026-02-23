import { useState, useEffect } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { AuthError, getErrorMessage } from "../../lib/errors";
import { redirectToAuth } from "../../lib/auth";
import { Dialog, DialogContent, DialogTitle } from "../ui";

interface Member {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

interface NewDmDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  workspaceSlug: string;
}

export function NewDmDialog({
  open,
  onClose,
  onSelectUser,
  workspaceSlug,
}: NewDmDialogProps) {
  const user = useCurrentUser();
  const isGallery = useGalleryMode();
  const galleryMockData = useGalleryMockData();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user || !workspaceSlug) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (isGallery) {
          const demoMembers = (galleryMockData?.members ?? []).map((member) => ({
            id: member.id,
            displayName: member.displayName,
            email: member.email,
            avatarUrl: member.avatarUrl,
          }));
          if (!cancelled) {
            setMembers(demoMembers);
          }
          return;
        }

        const res = await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].members.$get({ param: { slug: workspaceSlug } }, { headers }),
        );
        const data = (await res.json()) as Member[];
        if (!cancelled) {
          setMembers(data);
        }
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }

        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load members"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [galleryMockData?.members, isGallery, open, user, workspaceSlug]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent size="sm" className="max-h-[400px] overflow-auto p-4">
        <DialogTitle className="mb-3">New Direct Message</DialogTitle>
        {loading && <p className="text-faint text-sm">Loading members...</p>}
        {error && <p className="text-danger-text text-[13px]">{error}</p>}
        {!loading && !error && members.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => {
              onSelectUser(member.id);
              onClose();
            }}
            className="block w-full py-2 px-3 border-none bg-transparent cursor-pointer text-left text-sm rounded text-primary hover:bg-surface-hover"
          >
            <div className="font-medium">{member.displayName}</div>
            <div className="text-xs text-faint">{member.email}</div>
          </button>
        ))}
      </DialogContent>
    </Dialog>
  );
}
