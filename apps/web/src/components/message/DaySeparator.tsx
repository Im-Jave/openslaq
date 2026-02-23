function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface DaySeparatorProps {
  date: Date;
}

export function DaySeparator({ date }: DaySeparatorProps) {
  const label = formatDateLabel(date);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div
      data-testid="day-separator"
      data-date={dateKey}
      className="flex items-center my-4"
    >
      <div className="flex-1 border-t border-border-secondary" />
      <span className="px-3 text-xs text-faint font-medium">{label}</span>
      <div className="flex-1 border-t border-border-secondary" />
    </div>
  );
}
