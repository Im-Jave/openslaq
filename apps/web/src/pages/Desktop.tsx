import { Button } from "../components/ui";

const RELEASE_URL = "https://github.com/openslaq/openslaq/releases/latest";

export function DesktopPage() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-primary mb-3">OpenSlaq Desktop</h1>
        <p className="text-muted mb-10">
          Download the desktop app. macOS is available now, Windows and Linux are coming soon.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border-default bg-surface p-5">
            <h2 className="text-lg font-semibold text-primary mb-4">macOS</h2>
            <Button asChild className="w-full" data-testid="desktop-download-macos">
              <a href={RELEASE_URL} target="_blank" rel="noopener noreferrer">
                Install for macOS
              </a>
            </Button>
          </div>

          <div className="rounded-xl border border-border-default bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Windows</h2>
              <span className="text-xs text-muted">Coming soon</span>
            </div>
            <Button className="w-full" disabled data-testid="desktop-download-windows">
              Install for Windows
            </Button>
          </div>

          <div className="rounded-xl border border-border-default bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Linux</h2>
              <span className="text-xs text-muted">Coming soon</span>
            </div>
            <Button className="w-full" disabled data-testid="desktop-download-linux">
              Install for Linux
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
