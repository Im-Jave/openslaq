import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useAdminApi } from "../../hooks/api/useAdminApi";
import { Button } from "../../components/ui/button";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

interface Activity {
  messagesPerDay: { date: string; count: number }[];
  usersPerDay: { date: string; count: number }[];
}

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "365d", days: 365 },
] as const;

export function ActivityTab({ user }: { user: AuthJsonUser }) {
  const { getActivity } = useAdminApi(user);
  const [days, setDays] = useState(30);
  const [activity, setActivity] = useState<Activity | null>(null);

  useEffect(() => {
    getActivity(days).then(setActivity);
  }, [getActivity, days]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.days}
            size="sm"
            variant={days === r.days ? "primary" : "secondary"}
            onClick={() => setDays(r.days)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {activity && (
        <div className="space-y-6">
          <div className="bg-surface border border-border-strong rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary mb-4">
              Messages / Day
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={activity.messagesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#1264a3"
                  fill="#1264a3"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-surface border border-border-strong rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary mb-4">
              New Users / Day
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activity.usersPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2eb67d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
