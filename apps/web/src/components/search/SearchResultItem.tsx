import type { SearchResultItem as SearchResultItemType } from "@openslack/shared";

interface SearchResultItemProps {
  result: SearchResultItemType;
  isSelected: boolean;
  onClick: () => void;
}

export function SearchResultItem({ result, isSelected, onClick }: SearchResultItemProps) {
  const isPrivate = result.channelType === "private";
  const channelLabel =
    result.channelType === "dm" ? "DM" : `${isPrivate ? "" : "#"}${result.channelName}`;

  const time = new Date(result.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-none cursor-pointer ${
        isSelected ? "bg-surface-selected" : "bg-surface hover:bg-surface-secondary"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-muted mb-1">
        <span className="font-medium text-secondary flex items-center gap-0.5">
          {isPrivate && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
          {channelLabel}
        </span>
        <span>{result.userDisplayName}</span>
        <span>{time}</span>
        {result.parentMessageId && (
          <span className="bg-surface-tertiary text-muted px-1.5 py-0.5 rounded text-[10px]">
            in thread
          </span>
        )}
      </div>
      <div
        className="text-sm text-primary line-clamp-2 [&_mark]:bg-mark-bg [&_mark]:rounded-sm [&_mark]:px-0.5"
        dangerouslySetInnerHTML={{ __html: result.headline }}
      />
    </button>
  );
}
