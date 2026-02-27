import { useEffect } from "react";
import { isTauri } from "../lib/tauri";
import { parseDeepLinkUrl, setPendingIntent } from "../lib/deep-link";

/**
 * Listens for deep-link:open events from Tauri and stores them as pending intents.
 * Active regardless of auth state so cold-start links survive login redirects.
 *
 * In dev/e2e, exposes window.__openslaqDeepLink(url) for testing.
 */
export function useDeepLink() {
  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    async function setup() {
      const { listen } = await import("@tauri-apps/api/event");
      if (cancelled) return;

      unlisten = await listen<string>("deep-link:open", (event) => {
        const intent = parseDeepLinkUrl(event.payload);
        setPendingIntent(intent);
      });

      if (cancelled) {
        unlisten();
        unlisten = undefined;
      }
    }

    setup();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // Expose test helper in dev / e2e
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    if (import.meta.env.DEV) {
      w.__openslaqDeepLink = (url: string) => {
        const intent = parseDeepLinkUrl(url);
        setPendingIntent(intent);
      };
    }
    return () => {
      delete (window as unknown as Record<string, unknown>).__openslaqDeepLink;
    };
  }, []);
}

/**
 * Stateless component wrapper — mount in App.tsx so the listener is active
 * before auth/bootstrap.
 */
export function DeepLinkListener() {
  useDeepLink();
  return null;
}
