import { useEffect, useState } from "react";
import { UserButton } from "@stackframe/react";
import { useTheme } from "../../theme/ThemeProvider";
import { UserSettingsDialog } from "../settings/UserSettingsDialog";
import { SetStatusDialog } from "./SetStatusDialog";
import { useChatStore } from "../../state/chat-store";
import { useCurrentUser } from "../../hooks/useCurrentUser";

function isStatusExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

interface CustomUserButtonProps {
  showUserInfo?: boolean;
}

export function CustomUserButton({ showUserInfo }: CustomUserButtonProps) {
  const { mode, cycle } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const user = useCurrentUser();
  const { state } = useChatStore();

  const userId = user?.id;
  const presence = userId ? state.presence[userId] : undefined;
  const hasStatus = presence && !isStatusExpired(presence.statusExpiresAt) && (presence.statusEmoji || presence.statusText);
  const statusLabel = hasStatus
    ? `${presence.statusEmoji ?? ""} ${presence.statusText ?? ""}`.trim()
    : "Set a status";

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("openslaq:open-settings", handler);
    return () => window.removeEventListener("openslaq:open-settings", handler);
  }, []);

  return (
    <>
      <UserButton
        showUserInfo={showUserInfo}
        extraItems={[
          {
            text: statusLabel,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            onClick: () => setStatusOpen(true),
          },
          {
            text: "Settings",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
            onClick: () => setSettingsOpen(true),
          },
          {
            text: `Theme: ${mode === "light" ? "Light" : "Dark"}`,
            icon: mode === "dark" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ),
            onClick: cycle,
          },
        ]}
      />
      <UserSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <SetStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        currentEmoji={hasStatus ? (presence.statusEmoji ?? null) : null}
        currentText={hasStatus ? (presence.statusText ?? null) : null}
      />
    </>
  );
}
