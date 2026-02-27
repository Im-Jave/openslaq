import { useCallback } from "react";
import {
  listBots as coreListBots,
  createBot as coreCreateBot,
  updateBot as coreUpdateBot,
  deleteBot as coreDeleteBot,
  regenerateBotToken as coreRegenerateBotToken,
  toggleBot as coreToggleBot,
} from "@openslaq/client-core";
import type { BotApp } from "@openslaq/shared";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";

export function useBotsApi() {
  const auth = useAuthProvider();

  const listBotApps = useCallback(
    async (workspaceSlug: string): Promise<BotApp[]> => {
      return coreListBots({ api, auth }, workspaceSlug);
    },
    [auth],
  );

  const createBotApp = useCallback(
    async (
      workspaceSlug: string,
      data: {
        name: string;
        description?: string;
        avatarUrl?: string;
        webhookUrl: string;
        scopes: string[];
        subscribedEvents?: string[];
      },
    ) => {
      return coreCreateBot({ api, auth }, workspaceSlug, data);
    },
    [auth],
  );

  const updateBotApp = useCallback(
    async (
      workspaceSlug: string,
      botId: string,
      data: {
        name?: string;
        description?: string | null;
        avatarUrl?: string | null;
        webhookUrl?: string;
        scopes?: string[];
        subscribedEvents?: string[];
      },
    ) => {
      return coreUpdateBot({ api, auth }, workspaceSlug, botId, data);
    },
    [auth],
  );

  const deleteBotApp = useCallback(
    async (workspaceSlug: string, botId: string) => {
      return coreDeleteBot({ api, auth }, workspaceSlug, botId);
    },
    [auth],
  );

  const regenerateToken = useCallback(
    async (workspaceSlug: string, botId: string) => {
      return coreRegenerateBotToken({ api, auth }, workspaceSlug, botId);
    },
    [auth],
  );

  const toggleBotEnabled = useCallback(
    async (workspaceSlug: string, botId: string, enabled: boolean) => {
      return coreToggleBot({ api, auth }, workspaceSlug, botId, enabled);
    },
    [auth],
  );

  return { listBotApps, createBotApp, updateBotApp, deleteBotApp, regenerateToken, toggleBotEnabled };
}
