import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminApi } from "../../hooks/api/useAdminApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
  channelCount: number;
  messageCount: number;
}

export function WorkspacesTab() {
  const { getWorkspaces } = useAdminApi();
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(
    async (p: number, s: string) => {
      const result = await getWorkspaces(p, 20, s || undefined);
      if (result) {
        setWorkspaces(result.workspaces);
        setTotalPages(result.totalPages);
      }
    },
    [getWorkspaces],
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

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search workspaces by name or slug..."
        defaultValue=""
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong text-left text-muted">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Slug</th>
              <th className="pb-2 pr-4 text-right">Members</th>
              <th className="pb-2 pr-4 text-right">Channels</th>
              <th className="pb-2 pr-4 text-right">Messages</th>
              <th className="pb-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr
                key={w.id}
                className="border-b border-border-strong/50 hover:bg-surface-secondary"
              >
                <td className="py-2 pr-4 font-medium text-primary">
                  {w.name}
                </td>
                <td className="py-2 pr-4 text-muted font-mono text-xs">
                  {w.slug}
                </td>
                <td className="py-2 pr-4 text-right">{w.memberCount}</td>
                <td className="py-2 pr-4 text-right">{w.channelCount}</td>
                <td className="py-2 pr-4 text-right">{w.messageCount}</td>
                <td className="py-2 text-muted">{formatDate(w.createdAt)}</td>
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
    </div>
  );
}
