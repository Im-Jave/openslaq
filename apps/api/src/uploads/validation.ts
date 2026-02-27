export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_FILES_PER_REQUEST = 10;

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
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
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/tab-separated-values",
]);

export function isAllowedMimeType(mimeType: string): boolean {
  // Strip parameters like charset (e.g. "text/plain;charset=utf-8" → "text/plain")
  const baseType = mimeType.split(";")[0]!.trim();
  if (ALLOWED_MIME_TYPES.has(baseType)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => baseType.startsWith(prefix));
}
