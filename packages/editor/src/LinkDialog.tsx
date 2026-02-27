import { useState, useEffect } from "react";

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText: string;
  initialUrl: string;
  showRemove: boolean;
  onSubmit: (text: string, url: string) => void;
  onRemove: () => void;
}

export function LinkDialog({
  open,
  onOpenChange,
  initialText,
  initialUrl,
  showRemove,
  onSubmit,
  onRemove,
}: LinkDialogProps) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (!open) return;
    setText(initialText);
    setUrl(initialUrl);
  }, [open, initialText, initialUrl]);

  const isUrlSafe = (u: string): boolean => {
    try {
      const parsed = new URL(u);
      return ["http:", "https:", "mailto:"].includes(parsed.protocol);
    } catch {
      // Allow relative URLs (no protocol)
      return !u.trim().toLowerCase().startsWith("javascript:");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (!isUrlSafe(url)) return;
    onSubmit(text, url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/20" onMouseDown={() => onOpenChange(false)} />
      <div className="relative bg-surface rounded-lg border border-border-default w-[360px] max-w-[calc(100vw-24px)] shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          <div className="text-base font-semibold">{showRemove ? "Edit link" : "Add link"}</div>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-secondary">Display text</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link text"
              data-testid="link-dialog-text"
              className="h-8 rounded border border-border-default bg-surface px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-secondary">URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              data-testid="link-dialog-url"
              autoFocus
              className="h-8 rounded border border-border-default bg-surface px-2 text-sm"
            />
          </label>
          <div className="flex items-center gap-2 justify-end">
            {showRemove && (
              <button
                type="button"
                onClick={onRemove}
                data-testid="link-dialog-remove"
                className="h-8 px-3 rounded bg-danger-bg text-danger-text text-sm"
              >
                Remove link
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 rounded border border-border-default text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              data-testid="link-dialog-save"
              className="h-8 px-3 rounded bg-slaq-blue text-white text-sm disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
