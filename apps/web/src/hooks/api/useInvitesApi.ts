import { useCallback } from "react";
import {
  getInvite as coreGetInvite,
  acceptInvite as coreAcceptInvite,
} from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";

export function useInvitesApi() {
  const auth = useAuthProvider();

  const getInvite = useCallback(
    (code: string) => coreGetInvite({ api, auth }, code),
    [auth],
  );

  const acceptInvite = useCallback(
    (code: string) => coreAcceptInvite({ api, auth }, code),
    [auth],
  );

  return { getInvite, acceptInvite };
}
