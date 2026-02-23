const NOTIFICATIONS_ENABLED_KEY = "openslack-notifications-enabled";
const NOTIFICATIONS_SOUND_KEY = "openslack-notifications-sound";

export function getNotificationPreferences(): {
  enabled: boolean;
  sound: boolean;
} {
  return {
    enabled: localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true",
    sound: localStorage.getItem(NOTIFICATIONS_SOUND_KEY) !== "false",
  };
}

export function setNotificationPreferences(
  prefs: Partial<{ enabled: boolean; sound: boolean }>,
): void {
  if (prefs.enabled !== undefined) {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(prefs.enabled));
  }
  if (prefs.sound !== undefined) {
    localStorage.setItem(NOTIFICATIONS_SOUND_KEY, String(prefs.sound));
  }
}
