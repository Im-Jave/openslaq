import type { MarkdownStorage } from "tiptap-markdown";

export const VSCODE_LANG_MAP: Record<string, string> = {
  typescriptreact: "tsx",
  javascriptreact: "jsx",
};

export function getMarkdown(storage: unknown): string {
  return ((storage as { markdown: MarkdownStorage }).markdown).getMarkdown();
}

export function shouldSendOnEnter(params: {
  key: string;
  shiftKey: boolean;
  isCodeBlock: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
}): boolean {
  return params.key === "Enter"
    && !params.shiftKey
    && !params.isCodeBlock
    && !params.isBulletList
    && !params.isOrderedList;
}

export function extractPastedFiles(items: DataTransferItemList | undefined | null): File[] {
  if (!items) return [];

  const files: File[] = [];
  for (const item of items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}

export function parseVsCodePaste(params: {
  text: string;
  vscodeEditorData: string;
  languageMap?: Record<string, string>;
}): { language: string; content: string } | null {
  const { text, vscodeEditorData, languageMap = VSCODE_LANG_MAP } = params;
  if (!text || !vscodeEditorData) return null;

  try {
    const parsed = JSON.parse(vscodeEditorData) as { mode?: string };
    if (!parsed.mode) return null;
    return {
      language: languageMap[parsed.mode] ?? parsed.mode,
      content: text.replace(/\r\n?/g, "\n"),
    };
  } catch {
    return null;
  }
}
