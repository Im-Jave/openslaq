import { StackHandler, StackProvider, StackTheme } from "@stackframe/react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { stackApp } from "./stack";
import { HomePage } from "./pages/Home";
import { WorkspaceListPage } from "./pages/WorkspaceList";
import { CreateWorkspacePage } from "./pages/CreateWorkspace";
import { InviteAcceptPage } from "./pages/InviteAccept";
import { DemoPage } from "./pages/Demo";
import { NotFoundPage } from "./pages/NotFound";
import { DesktopPage } from "./pages/Desktop";
import { HuddlePage } from "./pages/HuddlePage";
import { SocketProvider } from "./socket/SocketProvider";
import { ChatStoreProvider } from "./state/chat-store";
import { ThemeProvider } from "./theme/ThemeProvider";
import { TooltipProvider } from "./components/ui";
import { DeepLinkListener } from "./hooks/useDeepLink";

const GalleryPage = import.meta.env.DEV
  ? lazy(() => import("./gallery/GalleryPage").then((m) => ({ default: m.GalleryPage })))
  : () => null;

const AdminPage = lazy(() =>
  import("./pages/admin/AdminPage").then((m) => ({ default: m.AdminPage })),
);

function HandlerRoutes() {
  const location = useLocation();
  return (
    <StackHandler location={location.pathname} fullPage />
  );
}

export function App() {
  // Gallery has its own MemoryRouter — render outside BrowserRouter to avoid nesting
  if (import.meta.env.DEV && window.location.pathname.startsWith("/dev/gallery")) {
    return (
      <Suspense fallback={null}>
        <ThemeProvider>
          <TooltipProvider>
            <StackProvider app={stackApp}>
              <GalleryPage />
            </StackProvider>
          </TooltipProvider>
        </ThemeProvider>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <BrowserRouter>
        <ThemeProvider>
          <TooltipProvider>
            <Routes>
              <Route path="/demo/*" element={<DemoPage />} />
              <Route path="/desktop" element={<DesktopPage />} />
              <Route
                path="/huddle/:channelId"
                element={
                  <StackProvider app={stackApp}>
                    <HuddlePage />
                  </StackProvider>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <StackProvider app={stackApp}>
                    <AdminPage />
                  </StackProvider>
                }
              />
              <Route
                path="*"
                element={
                  <StackProvider app={stackApp}>
                    <DeepLinkListener />
                    <SocketProvider>
                      <ChatStoreProvider>
                        <StackTheme>
                          <Routes>
                            <Route path="/handler/*" element={<HandlerRoutes />} />
                            <Route path="/invite/:code" element={<InviteAcceptPage />} />
                            <Route path="/w/:workspaceSlug/*" element={<HomePage />} />
                            <Route path="/create-workspace" element={<CreateWorkspacePage />} />
                            <Route path="/" element={<WorkspaceListPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                          </Routes>
                        </StackTheme>
                      </ChatStoreProvider>
                    </SocketProvider>
                  </StackProvider>
                }
              />
            </Routes>
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Suspense>
  );
}
