import { Fragment } from "react";
import ReactMarkdown, { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import type { Components } from "react-markdown";
import type { Mention } from "@openslaq/shared";
import { CodeBlock } from "./CodeBlock";

interface MessageContentProps {
  content: string;
  mentions?: Mention[];
  onOpenProfile?: (userId: string) => void;
}

const sharedComponents: Components = {
  p: ({ children }) => <p className="m-0">{children}</p>,
  code: ({ children, className }) => {
    // Block code (inside <pre>) has a className from the language tag — let Shiki handle styling
    if (className) {
      return <code className={className}>{children}</code>;
    }
    // Inline code
    return (
      <code className="bg-code-inline-bg px-1 py-px rounded text-[13px]">
        {children}
      </code>
    );
  },
  pre: CodeBlock,
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-border-strong my-1 pl-3 text-muted">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-slaq-blue">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-1 pl-6 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 pl-6 list-decimal">{children}</ol>,
};

// Stable references — MarkdownHooks' useEffect depends on plugin array identity
const remarkPlugins = [remarkGfm];
const rehypePlugins = [[rehypeShiki, {
  themes: { light: "light-plus", dark: "dark-plus" },
  addLanguageClass: true,
  langAlias: { typescriptreact: "tsx" },
}] as [typeof rehypeShiki, Parameters<typeof rehypeShiki>[0]]];

const MENTION_REGEX = /<@([^>]+)>/g;

function MentionBadge({
  token,
  mentions,
  onOpenProfile,
}: {
  token: string;
  mentions: Mention[];
  onOpenProfile?: (userId: string) => void;
}) {
  if (token === "here") {
    return (
      <span className="inline bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1 rounded font-medium text-[13px]">
        @here
      </span>
    );
  }
  if (token === "channel") {
    return (
      <span className="inline bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1 rounded font-medium text-[13px]">
        @channel
      </span>
    );
  }

  const mention = mentions.find((m) => m.userId === token);
  const displayName = mention?.displayName ?? token;

  return (
    <button
      type="button"
      onClick={() => onOpenProfile?.(token)}
      className="inline bg-[#1264a31a] text-slaq-blue px-1 rounded font-medium text-[13px] border-none cursor-pointer hover:underline"
    >
      @{displayName}
    </button>
  );
}

function renderContentWithMentions(
  content: string,
  mentions: Mention[],
  onOpenProfile?: (userId: string) => void,
  hasCodeBlock?: boolean,
) {
  // If no mentions in content, render normally
  if (!MENTION_REGEX.test(content)) {
    return hasCodeBlock ? (
      <MarkdownHooks
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={sharedComponents}
        fallback={<ReactMarkdown remarkPlugins={remarkPlugins} components={sharedComponents}>{content}</ReactMarkdown>}
      >
        {content}
      </MarkdownHooks>
    ) : (
      <ReactMarkdown remarkPlugins={remarkPlugins} components={sharedComponents}>
        {content}
      </ReactMarkdown>
    );
  }

  // Split on mention tokens and render alternating text/mention segments
  const segments: Array<{ type: "text"; value: string } | { type: "mention"; token: string }> = [];
  let lastIndex = 0;

  // Reset regex state
  MENTION_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "mention", token: match[1]! });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "mention" ? (
          <MentionBadge key={i} token={seg.token} mentions={mentions} onOpenProfile={onOpenProfile} />
        ) : (
          <Fragment key={i}>
            <ReactMarkdown remarkPlugins={remarkPlugins} components={sharedComponents}>
              {seg.value}
            </ReactMarkdown>
          </Fragment>
        ),
      )}
    </>
  );
}

export function MessageContent({ content, mentions = [], onOpenProfile }: MessageContentProps) {
  const hasCodeBlock = content.includes("```");

  return (
    <div className="text-sm leading-normal mt-0.5">
      {renderContentWithMentions(content, mentions, onOpenProfile, hasCodeBlock)}
    </div>
  );
}
