import { useUser } from "@stackframe/react";
import { useMockUser } from "../gallery/gallery-context";

/**
 * Wrapper around Stack Auth's useUser().
 * In gallery mode, returns the mock user from context instead.
 */
export function useCurrentUser() {
  const mockUser = useMockUser();
  const realUser = useUser();
  return mockUser ?? realUser;
}
