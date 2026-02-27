import { useState } from "react";
import type { LinkPreview } from "@openslaq/shared";

interface LinkPreviewCardProps {
  preview: LinkPreview;
}

export function LinkPreviewCard({ preview }: LinkPreviewCardProps) {
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="link-preview"
      className="block max-w-[400px] mt-1 border border-border-default rounded-lg overflow-hidden hover:bg-surface-secondary/50 transition-colors no-underline"
    >
      {preview.imageUrl && !imgError && (
        <img
          src={preview.imageUrl}
          alt=""
          className="w-full max-h-[200px] object-cover"
          onError={() => setImgError(true)}
        />
      )}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 mb-1">
          {preview.faviconUrl && !faviconError && (
            <img
              src={preview.faviconUrl}
              alt=""
              className="w-4 h-4 shrink-0"
              onError={() => setFaviconError(true)}
            />
          )}
          {preview.siteName && (
            <span className="text-xs text-faint truncate">{preview.siteName}</span>
          )}
        </div>
        {preview.title && (
          <div className="text-sm font-medium text-slaq-blue line-clamp-2">{preview.title}</div>
        )}
        {preview.description && (
          <div className="text-xs text-secondary line-clamp-2 mt-0.5">{preview.description}</div>
        )}
      </div>
    </a>
  );
}
