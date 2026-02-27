import { useEffect } from "react";
import { useChatStore } from "../../state/chat-store";
import { isTauri } from "../../lib/tauri";

export function useDockBadge() {
  const { state } = useChatStore();
  const counts = state.unreadCounts;

  useEffect(() => {
    if (!isTauri()) return;

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow()
        .setBadgeCount(total > 0 ? total : undefined)
        .catch(() => {});
    });
  }, [counts]);
}
