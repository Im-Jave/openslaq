import { useState, type ReactNode, type CSSProperties } from "react";

const LANGUAGE_NAMES: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  typescriptreact: "tsx",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "shell",
  bash: "bash",
  zsh: "zsh",
  yml: "yaml",
  md: "markdown",
};

function getLanguage(children: ReactNode): string | null {
  if (!children || typeof children !== "object" || !("props" in children)) return null;
  const className = (children as { props?: { className?: string } }).props?.className;
  if (!className) return null;
  const match = className.match(/language-(\w+)/);
  if (!match?.[1]) return null;
  const lang = match[1];
  return LANGUAGE_NAMES[lang] ?? lang;
}

function getCodeText(children: ReactNode): string {
  if (!children || typeof children !== "object" || !("props" in children)) return "";
  const props = (children as { props?: { children?: ReactNode } }).props;
  return extractText(props?.children);
}

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

interface CodeBlockProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function CodeBlock({ children, className, style }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const language = getLanguage(children);
  const codeText = getCodeText(children);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
    } catch {
      // Fallback for environments without clipboard API (e.g. non-HTTPS)
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group/code my-1 rounded-md overflow-hidden border border-border-default">
      {language && (
        <div className="flex items-center justify-between bg-surface-tertiary px-3 py-1 text-xs text-text-muted">
          <span data-testid="code-language">{language}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="opacity-0 group-hover/code:opacity-100 transition-opacity text-text-muted hover:text-text-primary cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre
        className={`p-3 overflow-x-auto m-0 rounded-t-none ${className ?? ""}`}
        style={style ?? { backgroundColor: "var(--surface-tertiary)" }}
      >
        {children}
      </pre>
    </div>
  );
}
