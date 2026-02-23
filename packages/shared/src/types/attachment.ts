import type { AttachmentId, MessageId, UserId } from "./ids";

export interface Attachment {
  id: AttachmentId;
  messageId: MessageId | null;
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: UserId;
  createdAt: string;
}
