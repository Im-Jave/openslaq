import ReactMarkdown, { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import type { Components } from "react-markdown";
import { CodeBlock } from "./CodeBlock";

interface MessageContentProps {
  content: string;
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
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-slack-blue">
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

function PlainMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={sharedComponents}>
      {content}
    </ReactMarkdown>
  );
}

export function MessageContent({ content }: MessageContentProps) {
  const hasCodeBlock = content.includes("```");

  return (
    <div className="text-sm leading-normal mt-0.5">
      {hasCodeBlock ? (
        <MarkdownHooks
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={sharedComponents}
          fallback={<PlainMarkdown content={content} />}
        >
          {content}
        </MarkdownHooks>
      ) : (
        <PlainMarkdown content={content} />
      )}
    </div>
  );
}
