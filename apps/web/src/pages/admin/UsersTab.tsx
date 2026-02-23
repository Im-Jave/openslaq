import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminApi } from "../../hooks/api/useAdminApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar } from "../../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../../components/ui/dialog";
import { getErrorMessage } from "../../lib/errors";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  messageCount: number;
  workspaceCount: number;
}

export function UsersTab({ user }: { user: AuthJsonUser }) {
  const { getUsers, impersonate } = useAdminApi(user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [snippet, setSnippet] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(
    async (p: number, s: string) => {
      const result = await getUsers(p, 20, s || undefined);
      if (result) {
        setUsers(result.users);
        setTotalPages(result.totalPages);
      }
    },
    [getUsers],
  );

  useEffect(() => {
    load(page, search);
  }, [load, page, search]);

  const onSearchChange = (value: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const result = await impersonate(userId);
      if (result) setSnippet(result.snippet);
    } catch (err) {
      alert(getErrorMessage(err, "Impersonation failed"));
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search users by name or email..."
        defaultValue=""
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong text-left text-muted">
              <th className="pb-2 pr-4">User</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4 text-right">Messages</th>
              <th className="pb-2 pr-4 text-right">Workspaces</th>
              <th className="pb-2 pr-4">Last Seen</th>
              <th className="pb-2 pr-4">Created</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-border-strong/50 hover:bg-surface-secondary"
              >
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={u.avatarUrl}
                      fallback={u.displayName}
                      size="sm"
                    />
                    <span className="text-primary font-medium">
                      {u.displayName}
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-muted">{u.email}</td>
                <td className="py-2 pr-4 text-right">{u.messageCount}</td>
                <td className="py-2 pr-4 text-right">{u.workspaceCount}</td>
                <td className="py-2 pr-4 text-muted">
                  {formatDate(u.lastSeenAt)}
                </td>
                <td className="py-2 pr-4 text-muted">
                  {formatDate(u.createdAt)}
                </td>
                <td className="py-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleImpersonate(u.id)}
                  >
                    Impersonate
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={snippet !== null} onOpenChange={() => setSnippet(null)}>
        <DialogContent size="lg">
          <div className="p-6 space-y-4">
            <DialogTitle>Impersonation Snippet</DialogTitle>
            <p className="text-sm text-muted">
              Paste this into the browser console to impersonate the user:
            </p>
            <pre className="bg-surface-secondary rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {snippet}
            </pre>
            <Button
              size="sm"
              onClick={() => {
                if (snippet) navigator.clipboard.writeText(snippet);
              }}
            >
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
