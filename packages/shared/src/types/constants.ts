export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const CHANNEL_TYPES = {
  PUBLIC: "public",
  PRIVATE: "private",
  DM: "dm",
  GROUP_DM: "group_dm",
} as const;

export type ChannelType = (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES];

export const DEFAULT_CHANNELS = {
  GENERAL: "general",
} as const;
