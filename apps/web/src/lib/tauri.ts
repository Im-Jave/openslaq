export function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Linux")) return "Linux";
  return "Desktop";
}
