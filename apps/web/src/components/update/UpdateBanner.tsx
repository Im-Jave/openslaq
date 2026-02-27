import { useEffect } from "react";
import { useAutoUpdate } from "../../hooks/useAutoUpdate";

const AUTO_DISMISS_MS = 8_000;

export function UpdateBanner() {
  const { status, dismissJustUpdated } = useAutoUpdate();

  useEffect(() => {
    if (status.phase !== "justUpdated") return;
    const id = setTimeout(dismissJustUpdated, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [status.phase, dismissJustUpdated]);

  if (status.phase !== "justUpdated") return null;

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2 bg-accent-bg text-accent-text text-sm shrink-0">
      <span>Updated to v{status.version}</span>
      <button
        className="px-3 py-1 rounded text-xs text-accent-text hover:opacity-70"
        onClick={dismissJustUpdated}
      >
        Dismiss
      </button>
    </div>
  );
}
