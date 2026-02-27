import { useEffect, useRef } from "react";
import { isTauri } from "../lib/tauri";

interface MenuEventOptions {
  onPreferences?: () => void;
  onNewMessage?: () => void;
  onToggleSidebar?: () => void;
  onKeyboardShortcuts?: () => void;
}

export function useMenuEvents(options: MenuEventOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    async function setup() {
      const { listen } = await import("@tauri-apps/api/event");
      if (cancelled) return;

      const events: Array<{ name: string; handler: () => void }> = [
        {
          name: "menu:preferences",
          handler: () => optionsRef.current.onPreferences?.(),
        },
        {
          name: "menu:new-message",
          handler: () => optionsRef.current.onNewMessage?.(),
        },
        {
          name: "menu:toggle-sidebar",
          handler: () => optionsRef.current.onToggleSidebar?.(),
        },
        {
          name: "menu:keyboard-shortcuts",
          handler: () => optionsRef.current.onKeyboardShortcuts?.(),
        },
        {
          name: "menu:zoom-in",
          handler: () => {
            const current = parseFloat(document.body.style.zoom || "1");
            document.body.style.zoom = String(Math.min(current + 0.1, 2));
          },
        },
        {
          name: "menu:zoom-out",
          handler: () => {
            const current = parseFloat(document.body.style.zoom || "1");
            document.body.style.zoom = String(Math.max(current - 0.1, 0.5));
          },
        },
        {
          name: "menu:actual-size",
          handler: () => {
            document.body.style.zoom = "1";
          },
        },
      ];

      for (const { name, handler } of events) {
        if (cancelled) return;
        const unlisten = await listen(name, handler);
        if (cancelled) {
          unlisten();
          return;
        }
        unlisteners.push(unlisten);
      }
    }

    setup();

    return () => {
      cancelled = true;
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, []);
}
