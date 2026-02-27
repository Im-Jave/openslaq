import { useEffect } from "react";
import { bootstrapWorkspace } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

export function useWorkspaceBootstrap(
  workspaceSlug?: string,
  urlChannelId?: string,
  urlDmChannelId?: string,
) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const auth = useAuthProvider();

  useEffect(() => {
    if (isGallery || !workspaceSlug) return;

    const deps = { api, auth, dispatch, getState: () => state };
    void bootstrapWorkspace(deps, { workspaceSlug, urlChannelId, urlDmChannelId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isGallery, auth, workspaceSlug]);
}
