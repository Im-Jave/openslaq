import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useAdminApi } from "../../hooks/api/useAdminApi";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

interface Stats {
  users: number;
  workspaces: number;
  channels: number;
  messages: number;
  attachments: number;
  reactions: number;
}

interface Activity {
  messagesPerDay: { date: string; count: number }[];
  usersPerDay: { date: string; count: number }[];
}

const STAT_LABELS: { key: keyof Stats; label: string }[] = [
  { key: "users", label: "Users" },
  { key: "workspaces", label: "Workspaces" },
  { key: "channels", label: "Channels" },
  { key: "messages", label: "Messages" },
  { key: "attachments", label: "Attachments" },
  { key: "reactions", label: "Reactions" },
];

export function OverviewTab({ user }: { user: AuthJsonUser }) {
  const { getStats, getActivity } = useAdminApi(user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);

  useEffect(() => {
    getStats().then(setStats);
    getActivity(30).then(setActivity);
  }, [getStats, getActivity]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_LABELS.map(({ key, label }) => (
          <div
            key={key}
            className="bg-surface border border-border-strong rounded-lg p-4"
            data-testid={`stat-${key}`}
          >
            <div className="text-sm text-muted">{label}</div>
            <div className="text-2xl font-bold text-primary">
              {stats ? stats[key].toLocaleString() : "-"}
            </div>
          </div>
        ))}
      </div>

      {activity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface border border-border-strong rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary mb-4">
              Messages / Day (30d)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={activity.messagesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#1264a3"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-surface border border-border-strong rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary mb-4">
              New Users / Day (30d)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={activity.usersPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2eb67d"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
