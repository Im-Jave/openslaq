declare module "react-native-syntax-highlighter" {
  import type { ComponentType } from "react";

  interface SyntaxHighlighterProps {
    language?: string;
    style?: Record<string, unknown>;
    fontSize?: number;
    highlighter?: "hljs" | "prism";
    customStyle?: Record<string, unknown>;
    children: string;
  }

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module "react-syntax-highlighter/styles/hljs" {
  const atomOneDark: Record<string, unknown>;
  const atomOneLight: Record<string, unknown>;
  export { atomOneDark, atomOneLight };
}

declare module "react-syntax-highlighter/styles/hljs/*" {
  const style: Record<string, unknown>;
  export default style;
}
