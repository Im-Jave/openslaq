import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ChatStoreProvider } from "@/contexts/ChatStoreProvider";
import { SocketProvider } from "@/contexts/SocketProvider";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;

  return (
    <ChatStoreProvider>
      <SocketProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SocketProvider>
    </ChatStoreProvider>
  );
}
