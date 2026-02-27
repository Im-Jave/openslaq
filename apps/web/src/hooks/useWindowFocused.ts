import { useEffect, useState } from "react";
import { isTauri } from "../lib/tauri";

export function useWindowFocused(): boolean {
  const [focused, setFocused] = useState(!document.hidden);

  useEffect(() => {
    if (isTauri()) {
      let unlisten: (() => void) | undefined;
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        getCurrentWindow()
          .onFocusChanged(({ payload }) => setFocused(payload))
          .then((fn) => {
            unlisten = fn;
          });
      });
      return () => unlisten?.();
    }

    const onVisibility = () => setFocused(!document.hidden);
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return focused;
}
