import { useCallback } from "react";
import { useAuthProvider } from "../../lib/api-client";
import { env } from "../../env";

export function useBotActions() {
  const auth = useAuthProvider();

  const triggerAction = useCallback(
    async (messageId: string, actionId: string) => {
      const token = await auth.requireAccessToken();
      const res = await fetch(
        `${env.VITE_API_URL}/api/bot-interactions/${messageId}/actions/${actionId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!res.ok) {
        console.error("Bot action failed:", res.status);
      }
      // The message update will come back via the message:updated socket event
    },
    [auth],
  );

  return { triggerAction };
}
