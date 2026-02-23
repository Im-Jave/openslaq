import { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { StackTheme } from "@stackframe/react";
import { SCENARIOS, type Scenario } from "./scenarios";
import { MockProviders } from "./mock-providers";
import { AppLayout } from "../components/layout/AppLayout";
import { WorkspaceListPage } from "../pages/WorkspaceList";
import { GalleryOverlay } from "./GalleryOverlay";

function ScenarioRenderer({ scenario }: { scenario: Scenario }) {
  // Trigger keydown after mount (e.g. Cmd+K for search modal)
  useEffect(() => {
    if (!scenario.triggerKeyAfterMount) return;
    const timer = setTimeout(() => {
      const { key, metaKey, ctrlKey } = scenario.triggerKeyAfterMount!;
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          metaKey: metaKey ?? false,
          ctrlKey: ctrlKey ?? false,
          bubbles: true,
        }),
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [scenario]);

  return (
    <MockProviders
      mockUser={scenario.mockUser}
      seed={scenario.seed}
      mocks={scenario.mocks}
      initialRoute={scenario.initialRoute}
    >
      <StackTheme>
        <Routes>
          <Route path="/" element={<WorkspaceListPage />} />
          <Route path="/w/:workspaceSlug/*" element={<AppLayout />} />
        </Routes>
      </StackTheme>
    </MockProviders>
  );
}

export function GalleryPage() {
  const [activeId, setActiveId] = useState(SCENARIOS[0]?.id ?? "");
  const [renderKey, setRenderKey] = useState(0);

  const activeScenario = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0]!;

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    setRenderKey((k) => k + 1);
  }, []);

  return (
    <div className="h-screen w-screen relative">
      <ScenarioRenderer key={renderKey} scenario={activeScenario} />
      <GalleryOverlay
        scenarios={SCENARIOS}
        activeId={activeId}
        onSelect={handleSelect}
      />
    </div>
  );
}
