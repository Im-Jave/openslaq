import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { CodeBlockShiki } from "tiptap-extension-code-block-shiki";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { useState, useCallback, useEffect } from "react";
import clsx from "clsx";
import { EditorToolbar } from "./EditorToolbar";
import "./rich-text-editor.css";

interface RichTextEditorProps {
  onSubmit: (markdown: string) => void;
  placeholder?: string;
  onFileSelect?: () => void;
  uploading?: boolean;
  onFilePaste?: (files: File[]) => void;
  hasAttachments?: boolean;
  initialContent?: string | null;
  onContentChange?: (markdown: string) => void;
  filePreview?: React.ReactNode;
}

// VS Code language IDs that differ from Shiki's bundled language names
const VSCODE_LANG_MAP: Record<string, string> = {
  typescriptreact: "tsx",
  javascriptreact: "jsx",
};

function getMarkdown(editor: { storage: Record<string, unknown> }): string {
  return (editor.storage.markdown as MarkdownStorage).getMarkdown();
}

export function RichTextEditor({
  onSubmit,
  placeholder = "Type a message...",
  onFileSelect,
  uploading,
  onFilePaste,
  hasAttachments,
  initialContent,
  onContentChange,
  filePreview,
}: RichTextEditorProps) {
  const [focused, setFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [, setTxCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false }),
      CodeBlockShiki.configure({
        themes: { light: "light-plus", dark: "dark-plus" },
      }),
      Link.configure({ autolink: true, openOnClick: false }),
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    autofocus: true,
    onFocus() {
      setFocused(true);
    },
    onBlur() {
      setFocused(false);
    },
    onTransaction() {
      setTxCount((c) => c + 1);
    },
    onUpdate({ editor: e }) {
      setIsEmpty(e.isEmpty);
      onContentChange?.(getMarkdown(e as unknown as { storage: Record<string, unknown> }));
    },
    editorProps: {
      handleKeyDown(_view, event) {
        if (event.key === "Enter" && !event.shiftKey) {
          if (!editor) return false;
          if (editor.isActive("codeBlock") || editor.isActive("bulletList") || editor.isActive("orderedList")) {
            return false;
          }
          event.preventDefault();
          handleSend();
          return true;
        }
        return false;
      },
      handlePaste(_view, event) {
        // Handle file pastes
        const items = event.clipboardData?.items;
        if (items && onFilePaste) {
          const files: File[] = [];
          for (const item of items) {
            if (item.kind === "file") {
              const file = item.getAsFile();
              if (file) files.push(file);
            }
          }
          if (files.length > 0) {
            onFilePaste(files);
            return true;
          }
        }
        // Handle VS Code paste — normalize language IDs before the
        // extension's handler runs (editorProps runs before plugins)
        if (event.clipboardData && editor && !editor.isActive("codeBlock")) {
          const text = event.clipboardData.getData("text/plain");
          const vsData = event.clipboardData.getData("vscode-editor-data");
          if (text && vsData) {
            try {
              const mode = (JSON.parse(vsData) as { mode?: string }).mode;
              if (mode) {
                const language = VSCODE_LANG_MAP[mode] ?? mode;
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "codeBlock",
                    attrs: { language },
                    content: [{ type: "text", text: text.replace(/\r\n?/g, "\n") }],
                  })
                  .run();
                return true;
              }
            } catch {
              // Invalid JSON, fall through
            }
          }
        }
        return false;
      },
    },
  });

  // Restore draft content once editor is ready (component remounts per channel via `key`)
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
      editor.commands.focus("end");
      setIsEmpty(editor.isEmpty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleSend = useCallback(() => {
    if (!editor) return;
    const md = getMarkdown(editor as unknown as { storage: Record<string, unknown> });
    if (md.trim() || hasAttachments) {
      onSubmit(md.trim());
      editor.commands.clearContent();
    }
  }, [editor, onSubmit, hasAttachments]);

  if (!editor) return null;

  return (
    <div
      className={clsx(
        "rounded-lg overflow-hidden transition-[border-color,box-shadow] duration-150",
        focused
          ? "border border-slack-blue shadow-[0_0_0_1px_#1264a3]"
          : "border border-border-input",
      )}
    >
      <EditorContent editor={editor} />
      {filePreview}
      <EditorToolbar
        editor={editor}
        onSend={handleSend}
        disabled={isEmpty && !hasAttachments}
        onFileSelect={onFileSelect}
        uploading={uploading}
      />
    </div>
  );
}
