import { useCallback, useEffect, useState } from "react";
import { isTauri } from "../lib/tauri";

type UpdateStatus =
  | { phase: "idle" }
  | { phase: "updating" }
  | { phase: "pendingRestart"; version: string }
  | { phase: "justUpdated"; version: string };

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const INITIAL_DELAY_MS = 5_000;
const STORAGE_KEY = "openslaq-pending-update-version";

export function useAutoUpdate() {
  const [status, setStatus] = useState<UpdateStatus>(() => {
    // Check if we just restarted after an update
    const pendingVersion = localStorage.getItem(STORAGE_KEY);
    if (pendingVersion) {
      localStorage.removeItem(STORAGE_KEY);
      return { phase: "justUpdated", version: pendingVersion };
    }
    return { phase: "idle" };
  });

  const dismissJustUpdated = useCallback(() => {
    setStatus({ phase: "idle" });
  }, []);

  useEffect(() => {
    if (!isTauri()) return;

    async function checkAndInstall() {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (!update) return;

        setStatus({ phase: "updating" });
        await update.downloadAndInstall();
        localStorage.setItem(STORAGE_KEY, update.version);
        setStatus({ phase: "pendingRestart", version: update.version });
      } catch {
        // Silent failure — auto-updates should never degrade UX
        setStatus({ phase: "idle" });
      }
    }

    const initialTimeout = setTimeout(checkAndInstall, INITIAL_DELAY_MS);
    const intervalId = setInterval(checkAndInstall, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, []);

  return { status, dismissJustUpdated };
}
