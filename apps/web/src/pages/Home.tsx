import { useUser } from "@stackframe/react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";

export function HomePage() {
  const user = useUser({ or: "redirect" });

  if (!user) return null;

  return (
    <Routes>
      <Route path="c/:channelId" element={<AppLayout />} />
      <Route path="dm/:dmChannelId" element={<AppLayout />} />
      <Route path="*" element={<AppLayout />} />
    </Routes>
  );
}
