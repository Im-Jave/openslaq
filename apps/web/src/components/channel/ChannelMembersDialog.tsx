import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { useChannelMembersApi, type ChannelMember } from "../../hooks/api/useChannelMembersApi";
import { useWorkspaceMembersApi } from "../../hooks/api/useWorkspaceMembersApi";
import type { ChannelType } from "@openslaq/shared";
import type { PresenceEntry } from "../../state/chat-store";

interface ChannelMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  workspaceSlug: string;
  presence: Record<string, PresenceEntry>;
  onOpenProfile: (userId: string) => void;
  channelType?: ChannelType;
  canManageMembers?: boolean;
  channelCreatorId?: string | null;
}

export function ChannelMembersDialog({
  open,
  onOpenChange,
  channelId,
  workspaceSlug,
  presence,
  onOpenProfile,
  channelType,
  canManageMembers,
  channelCreatorId,
}: ChannelMembersDialogProps) {
  const { listChannelMembers, addMember, removeMember } = useChannelMembersApi();
  const { listMembers: listWorkspaceMembers } = useWorkspaceMembersApi();
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [search, setSearch] = useState("");
  const [addingMode, setAddingMode] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<{ id: string; displayName: string; email: string; avatarUrl: string | null }[]>([]);
  const [addSearch, setAddSearch] = useState("");

  const isPrivate = channelType === "private";
  const showManage = isPrivate && canManageMembers;

  const loadMembers = useCallback(async () => {
    const result = await listChannelMembers(workspaceSlug, channelId);
    setMembers(result);
  }, [workspaceSlug, channelId, listChannelMembers]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setAddingMode(false);
      setAddSearch("");
      return;
    }

    loadMembers();
  }, [open, loadMembers]);

  useEffect(() => {
    if (!addingMode) return;
    listWorkspaceMembers(workspaceSlug).then(setWorkspaceMembers);
  }, [addingMode, workspaceSlug, listWorkspaceMembers]);

  const filtered = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  const availableMembers = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    const available = workspaceMembers.filter((m) => !memberIds.has(m.id));
    if (!addSearch) return available;
    const q = addSearch.toLowerCase();
    return available.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [workspaceMembers, members, addSearch]);

  const handleClickMember = (userId: string) => {
    onOpenChange(false);
    onOpenProfile(userId);
  };

  const handleAddMember = async (userId: string) => {
    await addMember(workspaceSlug, channelId, userId);
    await loadMembers();
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMember(workspaceSlug, channelId, userId);
    setMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  if (addingMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="md" className="max-h-[70vh]">
          <div className="px-4 pt-4 pb-3 border-b border-border-default">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddingMode(false)}
                className="text-secondary hover:text-primary bg-transparent border-none cursor-pointer p-1"
                data-testid="add-member-back"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <DialogTitle>Add Member</DialogTitle>
            </div>
            <div className="mt-3">
              <Input
                data-testid="add-member-search-input"
                placeholder="Search workspace members..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {availableMembers.map((member) => (
              <div
                key={member.id}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-hover"
                data-testid={`add-member-${member.id}`}
              >
                <Avatar
                  src={member.avatarUrl}
                  alt={member.displayName}
                  fallback={member.displayName}
                  size="md"
                  shape="circle"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-primary truncate">
                    {member.displayName}
                  </div>
                  <div className="text-xs text-faint truncate">
                    {member.email}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleAddMember(member.id)}
                  data-testid={`add-member-button-${member.id}`}
                >
                  Add
                </Button>
              </div>
            ))}
            {availableMembers.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-faint">
                No members available to add
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-h-[70vh]">
        <div className="px-4 pt-4 pb-3 border-b border-border-default">
          <div className="flex items-center justify-between">
            <DialogTitle>Channel Members</DialogTitle>
            {showManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAddingMode(true)}
                data-testid="add-member-trigger"
              >
                Add member
              </Button>
            )}
          </div>
          <div className="mt-3">
            <Input
              data-testid="member-search-input"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {filtered.map((member) => {
            const isOnline = presence[member.id]?.online ?? false;
            const isCreator = member.id === channelCreatorId;
            return (
              <div
                key={member.id}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-hover"
              >
                <button
                  data-testid={`channel-member-${member.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer bg-transparent border-none p-0"
                  onClick={() => handleClickMember(member.id)}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      src={member.avatarUrl}
                      alt={member.displayName}
                      fallback={member.displayName}
                      size="md"
                      shape="circle"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${isOnline ? "bg-green-500" : "bg-gray-400"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-primary truncate">
                        {member.displayName}
                      </span>
                      {member.id.startsWith("bot:") && (
                        <span className="inline-flex items-center px-1 py-0 rounded text-[9px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          APP
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-faint truncate">
                      {member.email}
                    </div>
                  </div>
                </button>
                {showManage && !isCreator && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleRemoveMember(member.id)}
                    data-testid={`remove-member-${member.id}`}
                  >
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-faint">
              No members found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
