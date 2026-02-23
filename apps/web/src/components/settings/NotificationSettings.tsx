import { useState, useCallback, useEffect } from "react";
import {
  getNotificationPreferences,
  setNotificationPreferences,
} from "../../lib/notification-preferences";
import { Switch } from "../ui";

export function NotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [sound, setSound] = useState(true);
  const [permissionState, setPermissionState] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    const prefs = getNotificationPreferences();
    setEnabled(prefs.enabled);
    setSound(prefs.sound);
    if (typeof Notification !== "undefined") {
      setPermissionState(Notification.permission);
    }
  }, []);

  const handleToggleEnabled = useCallback(async (checked: boolean) => {
    if (checked) {
      if (typeof Notification !== "undefined") {
        const permission = await Notification.requestPermission();
        setPermissionState(permission);
        if (permission === "granted") {
          setEnabled(true);
          setNotificationPreferences({ enabled: true });
        }
      }
    } else {
      setEnabled(false);
      setNotificationPreferences({ enabled: false });
    }
  }, []);

  const handleToggleSound = useCallback((checked: boolean) => {
    setSound(checked);
    setNotificationPreferences({ sound: checked });
  }, []);

  return (
    <div className="w-full flex flex-col gap-4">
      <label className="text-sm font-medium text-secondary">
        Notifications
      </label>
      <div className="flex items-center justify-between">
        <span className="text-sm text-primary">Desktop notifications</span>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggleEnabled}
          data-testid="notifications-enabled"
        />
      </div>
      {permissionState === "denied" && (
        <p className="text-xs text-danger-text">
          Notifications are blocked in your browser settings. Please update your
          browser permissions to enable notifications.
        </p>
      )}
      <div className="flex items-center justify-between">
        <span
          className={`text-sm ${enabled ? "text-primary" : "text-muted"}`}
        >
          Notification sound
        </span>
        <Switch
          checked={sound}
          onCheckedChange={handleToggleSound}
          disabled={!enabled}
          data-testid="notifications-sound"
        />
      </div>
    </div>
  );
}
