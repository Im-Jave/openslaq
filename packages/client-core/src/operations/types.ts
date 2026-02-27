import type { ApiClient } from "../api/client";
import type { AuthProvider } from "../platform/types";
import type { ChatAction, ChatStoreState } from "../chat-reducer";

export interface OperationDeps {
  api: ApiClient;
  auth: AuthProvider;
  dispatch: (action: ChatAction) => void;
  getState: () => ChatStoreState;
}

/** Subset for API-only operations (invites, admin, etc.) */
export interface ApiDeps {
  api: ApiClient;
  auth: AuthProvider;
}
