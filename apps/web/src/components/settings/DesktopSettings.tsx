import { useState, useEffect, useCallback } from "react";
import { Switch } from "../ui";

const STORAGE_KEY = "openslaq-desktop-launch-at-login";

export function DesktopSettings() {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@tauri-apps/plugin-autostart")
      .then(({ isEnabled }) => isEnabled())
      .then((val) => {
        setEnabled(val);
        localStorage.setItem(STORAGE_KEY, String(val));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(async (checked: boolean) => {
    setEnabled(checked);
    localStorage.setItem(STORAGE_KEY, String(checked));
    try {
      const { enable, disable } = await import(
        "@tauri-apps/plugin-autostart"
      );
      if (checked) {
        await enable();
      } else {
        await disable();
      }
    } catch {
      setEnabled(!checked);
      localStorage.setItem(STORAGE_KEY, String(!checked));
    }
  }, []);

  return (
    <div className="w-full flex flex-col gap-4">
      <label className="text-sm font-medium text-secondary">Startup</label>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-primary">Launch at login</span>
          <span className="text-xs text-muted">
            OpenSlaq will start minimized in the system tray
          </span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading}
          data-testid="desktop-launch-at-login"
        />
      </div>
    </div>
  );
}
