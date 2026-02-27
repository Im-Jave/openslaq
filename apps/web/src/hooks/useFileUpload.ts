import { useState, useCallback } from "react";
import type { Attachment } from "@openslaq/shared";
import { asAttachmentId, asUserId } from "@openslaq/shared";
import { env } from "../env";
import { requireAccessToken } from "../lib/auth";
import { useGalleryMode } from "../gallery/gallery-context";

interface PendingFile {
  id: string;
  file: File;
}

interface UseFileUploadReturn {
  pendingFiles: PendingFile[];
  uploadedAttachments: Attachment[];
  uploading: boolean;
  error: string | null;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  removeAttachment: (id: string) => void;
  uploadAll: (user: { getAuthJson: () => Promise<{ accessToken?: string | null }> }) => Promise<Attachment[]>;
  reset: () => void;
  hasFiles: boolean;
}

export function useFileUpload(): UseFileUploadReturn {
  const isGallery = useGalleryMode();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setUploadedAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const uploadAll = useCallback(
    async (user: { getAuthJson: () => Promise<{ accessToken?: string | null }> }): Promise<Attachment[]> => {
      if (pendingFiles.length === 0) return uploadedAttachments;

      setUploading(true);
      setError(null);

      try {
        if (isGallery) {
          const attachments: Attachment[] = pendingFiles.map(({ file }) => ({
            id: asAttachmentId(`demo-attachment-${crypto.randomUUID()}`),
            messageId: null,
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            uploadedBy: asUserId("user-you"),
            createdAt: new Date().toISOString(),
            downloadUrl: URL.createObjectURL(file),
          }));
          const all = [...uploadedAttachments, ...attachments];
          setUploadedAttachments(all);
          setPendingFiles([]);
          return all;
        }

        const token = await requireAccessToken(user);
        const formData = new FormData();
        for (const { file } of pendingFiles) {
          formData.append("files", file);
        }

        const res = await fetch(`${env.VITE_API_URL}/api/uploads`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const body = (await res.json()) as { error: string };
          throw new Error(body.error || "Upload failed");
        }

        const data = (await res.json()) as { attachments: Attachment[] };
        const all = [...uploadedAttachments, ...data.attachments];
        setUploadedAttachments(all);
        setPendingFiles([]);
        return all;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [isGallery, pendingFiles, uploadedAttachments],
  );

  const reset = useCallback(() => {
    setPendingFiles([]);
    setUploadedAttachments([]);
    setError(null);
  }, []);

  return {
    pendingFiles,
    uploadedAttachments,
    uploading,
    error,
    addFiles,
    removeFile,
    removeAttachment,
    uploadAll,
    reset,
    hasFiles: pendingFiles.length > 0 || uploadedAttachments.length > 0,
  };
}
