import { useCallback } from "react";
import { editMessage, deleteMessage, toggleReaction } from "@openslaq/client-core";
import type { AuthProvider } from "@openslaq/client-core";
import type { ChatAction, ChatStoreState } from "@openslaq/client-core";
import { api } from "@/lib/api";

interface Deps {
  authProvider: AuthProvider;
  state: ChatStoreState;
  dispatch: (action: ChatAction) => void;
  userId?: string;
}

export function useMessageActions({ authProvider, state, dispatch, userId }: Deps) {
  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await editMessage(deps, { messageId, content });
    },
    [authProvider, dispatch, state],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await deleteMessage(deps, { messageId });
    },
    [authProvider, dispatch, state],
  );

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!userId) return;
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await toggleReaction(deps, { messageId, emoji, userId });
    },
    [authProvider, dispatch, state, userId],
  );

  return { handleEditMessage, handleDeleteMessage, handleToggleReaction };
}
