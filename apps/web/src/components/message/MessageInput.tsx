import { useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useParams } from "react-router-dom";
import { RichTextEditor, type MentionSuggestionItem } from "@openslaq/editor";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { FilePreviewList } from "./FilePreviewList";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useDraftMessage } from "../../hooks/useDraftMessage";
import { useMessageMutations } from "../../hooks/chat/useMessageMutations";
import { useWorkspaceMembersApi } from "../../hooks/api/useWorkspaceMembersApi";
import { AuthError } from "../../lib/errors";
import { redirectToAuth } from "../../lib/auth";

interface MessageInputProps {
  channelId: string;
  channelName?: string | null;
  parentMessageId?: string | null;
  externalDragDrop?: boolean;
  onTyping?: () => void;
}

export interface MessageInputHandle {
  addFiles: (files: FileList | File[]) => void;
  focus: () => void;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  function MessageInput({ channelId, channelName, parentMessageId, externalDragDrop, onTyping }, ref) {
    const user = useCurrentUser();
    const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const upload = useFileUpload();
    const { sendMessage } = useMessageMutations(user);
    const draftKey = parentMessageId ? `thread-${parentMessageId}` : channelId;
    const { draft, saveDraft, clearDraft } = useDraftMessage(draftKey);
    const { listMembers } = useWorkspaceMembersApi();
    const [mentionMembers, setMentionMembers] = useState<MentionSuggestionItem[]>([]);

    useEffect(() => {
      if (!workspaceSlug) return;
      listMembers(workspaceSlug).then((members) => {
        setMentionMembers(
          members
            .filter((m) => m.id !== user?.id)
            .map((m) => ({
              id: m.id,
              displayName: m.displayName,
              avatarUrl: m.avatarUrl,
            })),
        );
      }).catch(() => {});
    }, [workspaceSlug, listMembers, user?.id]);

    useImperativeHandle(ref, () => ({
      addFiles: (files: FileList | File[]) => upload.addFiles(files),
      focus: () => {
        const el = document.querySelector<HTMLElement>("[contenteditable=true]");
        el?.focus();
      },
    }), [upload]);

    const handleSubmit = async (markdown: string) => {
      if (!user || !workspaceSlug) return;

      let attachmentIds: string[] = [];
      let attachments = upload.uploadedAttachments;
      if (upload.hasFiles) {
        try {
          attachments = await upload.uploadAll(user);
          attachmentIds = attachments.map((a) => a.id);
        } catch (err) {
          if (err instanceof AuthError) {
            redirectToAuth();
          }
          return;
        }
      }

      const hasContent = markdown.trim().length > 0;
      if (!hasContent && attachmentIds.length === 0) return;

      const sent = await sendMessage({
        channelId,
        workspaceSlug,
        content: markdown,
        attachmentIds,
        attachments,
        parentMessageId,
      });

      if (sent) {
        upload.reset();
        clearDraft();
      }
    };

    const handleFileSelect = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
          upload.addFiles(e.target.files);
          e.target.value = "";
        }
      },
      [upload],
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
          upload.addFiles(e.dataTransfer.files);
        }
      },
      [upload],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
    }, []);

    const handleFilePaste = useCallback(
      (files: File[]) => {
        upload.addFiles(files);
      },
      [upload],
    );

    const handleContentChange = useCallback(
      (content: string) => {
        saveDraft(content);
        onTyping?.();
      },
      [onTyping, saveDraft],
    );

    const placeholder = parentMessageId
      ? "Reply in thread..."
      : channelName
        ? `Message #${channelName}`
        : "Type a message...";

    const filePreview = (
      <FilePreviewList
        pendingFiles={upload.pendingFiles}
        uploadedAttachments={upload.uploadedAttachments}
        onRemoveFile={upload.removeFile}
        onRemoveAttachment={upload.removeAttachment}
      />
    );

    const localDragProps = externalDragDrop
      ? {}
      : {
          onDrop: handleDrop,
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
        };

    return (
      <div className="px-4 pb-4 relative" {...localDragProps}>
        {!externalDragDrop && dragOver && (
          <div className="absolute inset-0 bg-slaq-blue/[0.08] border-2 border-dashed border-slaq-blue rounded-lg z-10 flex items-center justify-center text-sm text-slaq-blue pointer-events-none">
            Drop files here
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <RichTextEditor
          key={parentMessageId ? `thread-${parentMessageId}` : channelId}
          onSubmit={handleSubmit}
          placeholder={placeholder}
          onFileSelect={handleFileSelect}
          uploading={upload.uploading}
          onFilePaste={handleFilePaste}
          hasAttachments={upload.hasFiles}
          initialContent={draft}
          onContentChange={handleContentChange}
          filePreview={filePreview}
          members={mentionMembers}
        />
        {upload.error && (
          <div className="text-danger-text text-xs mt-1">{upload.error}</div>
        )}
      </div>
    );
  },
);
