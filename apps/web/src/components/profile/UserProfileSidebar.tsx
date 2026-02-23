import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWorkspaceMembersApi } from "../../hooks/api/useWorkspaceMembersApi";
import { useChatStore, type PresenceEntry } from "../../state/chat-store";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { Avatar, Badge, Button } from "../ui";

const roleVariant = { owner: "amber", admin: "blue", member: "gray" } as const;

interface Member {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  joinedAt: string;
}

interface UserProfileSidebarProps {
  userId: string;
  onClose: () => void;
  onSendMessage: (userId: string) => void;
  style?: React.CSSProperties;
}

function formatPresence(presence: PresenceEntry | undefined): { label: string; online: boolean } {
  if (!presence) return { label: "Offline", online: false };
  if (presence.online) return { label: "Online", online: true };
  if (presence.lastSeenAt) {
    const date = new Date(presence.lastSeenAt);
    return { label: `Last seen ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, online: false };
  }
  return { label: "Offline", online: false };
}

export function UserProfileSidebar({ userId, onClose, onSendMessage, style }: UserProfileSidebarProps) {
  const user = useCurrentUser();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { listMembers } = useWorkspaceMembersApi(user);
  const { state } = useChatStore();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const members = await listMembers(workspaceSlug!);
        if (cancelled) return;
        const found = members.find((m) => m.id === userId) as Member | undefined;
        setMember(found ?? null);
      } catch {
        // silently fail — member not found
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [listMembers, workspaceSlug, userId]);

  const presence = state.presence[userId];
  const presenceInfo = formatPresence(presence);
  const isOwnProfile = user?.id === userId;

  return (
    <div
      data-testid="profile-sidebar"
      className="shrink-0 border-l border-border-default flex flex-col h-full bg-surface"
      style={style}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default font-semibold text-[15px] text-primary">
        <span>Profile</span>
        <button
          data-testid="profile-close"
          onClick={onClose}
          className="bg-transparent border-none cursor-pointer text-lg text-muted px-1"
        >
          &#x2715;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-faint text-[13px] text-center p-4">
            Loading profile...
          </div>
        ) : !member ? (
          <div className="text-faint text-[13px] text-center p-4">
            Member not found
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar
              src={member.avatarUrl}
              fallback={member.displayName}
              size="lg"
              shape="circle"
            />

            <div className="text-center">
              <div data-testid="profile-display-name" className="text-lg font-semibold text-primary">
                {member.displayName}
              </div>
              <div data-testid="profile-email" className="text-sm text-muted mt-0.5">
                {member.email}
              </div>
            </div>

            <Badge
              data-testid="profile-role"
              variant={roleVariant[member.role as keyof typeof roleVariant] ?? "gray"}
              size="md"
            >
              {member.role}
            </Badge>

            <div data-testid="profile-presence" className="flex items-center gap-2 text-sm">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${presenceInfo.online ? "bg-green-500" : "bg-gray-400"}`}
              />
              <span className="text-muted">{presenceInfo.label}</span>
            </div>

            <div className="text-xs text-faint">
              Member since {new Date(member.joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </div>

            {!isOwnProfile && (
              <Button
                data-testid="profile-send-message"
                variant="primary"
                size="sm"
                onClick={() => onSendMessage(userId)}
                className="mt-2"
              >
                Send Message
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
