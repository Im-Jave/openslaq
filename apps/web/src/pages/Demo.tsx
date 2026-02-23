import { Navigate, Route, Routes } from "react-router-dom";
import { StackProvider, StackTheme } from "@stackframe/react";
import { AppLayout } from "../components/layout/AppLayout";
import { DemoProviders } from "../demo/DemoProviders";
import { stackApp } from "../stack";

export function DemoPage() {
  return (
    <DemoProviders>
      <StackProvider app={stackApp}>
        <StackTheme>
          <Routes>
            <Route index element={<Navigate to="w/acme" replace />} />
            <Route path="w/:workspaceSlug/*" element={<AppLayout />} />
            <Route path="*" element={<Navigate to="w/acme" replace />} />
          </Routes>
        </StackTheme>
      </StackProvider>
    </DemoProviders>
  );
}
