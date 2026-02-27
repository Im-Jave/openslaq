import { useMemo } from "react";
import type { SearchResultItem as SearchResultItemType } from "@openslaq/shared";

interface SearchResultItemProps {
  result: SearchResultItemType;
  isSelected: boolean;
  onClick: () => void;
}

/** Safely render a headline with <mark> highlights as React elements */
function HighlightedText({ html }: { html: string }) {
  const parts = useMemo(() => {
    // Split on <mark>...</mark> tags, keeping the marked text
    const segments: { text: string; highlighted: boolean }[] = [];
    const regex = /<mark>(.*?)<\/mark>/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: stripTags(html.slice(lastIndex, match.index)), highlighted: false });
      }
      segments.push({ text: stripTags(match[1]!), highlighted: true });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < html.length) {
      segments.push({ text: stripTags(html.slice(lastIndex)), highlighted: false });
    }

    return segments;
  }, [html]);

  return (
    <>
      {parts.map((part, i) =>
        part.highlighted ? (
          <mark key={i} className="bg-mark-bg rounded-sm px-0.5">{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** Strip any remaining HTML tags for safety */
function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, "");
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
      <div className="text-sm text-primary line-clamp-2">
        <HighlightedText html={result.headline} />
      </div>
    </button>
  );
}
