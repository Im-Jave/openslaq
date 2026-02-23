export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_FILES_PER_REQUEST = 10;

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "text/",
];

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/json",
]);

export function isAllowedMimeType(mimeType: string): boolean {
  if (ALLOWED_MIME_TYPES.has(mimeType)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}
