export type UserId = string & { readonly __brand: "UserId" };
export type WorkspaceId = string & { readonly __brand: "WorkspaceId" };
export type ChannelId = string & { readonly __brand: "ChannelId" };
export type MessageId = string & { readonly __brand: "MessageId" };
export type AttachmentId = string & { readonly __brand: "AttachmentId" };

export function asUserId(id: string): UserId {
  return id as UserId;
}
export function asWorkspaceId(id: string): WorkspaceId {
  return id as WorkspaceId;
}
export function asChannelId(id: string): ChannelId {
  return id as ChannelId;
}
export function asMessageId(id: string): MessageId {
  return id as MessageId;
}
export function asAttachmentId(id: string): AttachmentId {
  return id as AttachmentId;
}
