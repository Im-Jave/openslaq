import { useState, useCallback, useRef, useEffect } from "react";
import type { SearchResultItem } from "@openslaq/shared";
import { searchMessages, getErrorMessage } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";

interface SearchFilters {
  q: string;
  channelId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

interface SearchState {
  results: SearchResultItem[];
  total: number;
  loading: boolean;
  error: string | null;
  offset: number;
}

export function useSearch(workspaceSlug: string | undefined) {
  const { state } = useChatStore();
  const isGallery = useGalleryMode();
  const galleryMockData = useGalleryMockData();
  const auth = useAuthProvider();
  const [filters, setFilters] = useState<SearchFilters>({ q: "" });
  const [searchState, setSearchState] = useState<SearchState>({
    results: [],
    total: 0,
    loading: false,
    error: null,
    offset: 0,
  });
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeSearch = useCallback(
    async (searchFilters: SearchFilters, offset: number, append: boolean) => {
      if (!searchFilters.q.trim()) {
        setSearchState({ results: [], total: 0, loading: false, error: null, offset: 0 });
        return;
      }
      if (isGallery) {
        const q = searchFilters.q.trim().toLowerCase();
        const channelKey = `${searchFilters.channelId ?? "*"}::${q}`;
        const fallbackKey = `*::${q}`;
        const configuredResponse =
          galleryMockData?.search?.responses?.[channelKey]
          ?? galleryMockData?.search?.responses?.[fallbackKey]
          ?? galleryMockData?.search?.defaultResponse;
        if (configuredResponse) {
          setSearchState((prev) => ({
            results: append ? [...prev.results, ...configuredResponse.results] : configuredResponse.results,
            total: configuredResponse.total,
            loading: false,
            error: configuredResponse.error ?? null,
            offset,
          }));
          return;
        }

        const channelsById = new Map(state.channels.map((channel) => [channel.id, channel]));
        const dmById = new Map(state.dms.map((dm) => [dm.channel.id, dm]));
        const candidates = Object.values(state.messagesById)
          .filter((message) => !searchFilters.channelId || message.channelId === searchFilters.channelId)
          .filter((message) => {
            const haystack = `${message.content} ${message.senderDisplayName ?? ""}`.toLowerCase();
            return haystack.includes(q);
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const page = candidates.slice(offset, offset + 20);
        const results = page.map((message) => ({
          messageId: message.id,
          channelId: message.channelId,
          channelName: channelsById.get(message.channelId)?.name ?? dmById.get(message.channelId)?.otherUser.displayName ?? "dm",
          channelType: channelsById.get(message.channelId)?.type ?? dmById.get(message.channelId)?.channel.type ?? "public",
          userId: message.userId,
          userDisplayName: message.senderDisplayName ?? message.userId,
          content: message.content,
          headline: message.content,
          parentMessageId: message.parentMessageId,
          createdAt: message.createdAt,
          rank: 1,
        }));

        setSearchState((prev) => ({
          results: append ? [...prev.results, ...results] : results,
          total: candidates.length,
          loading: false,
          error: null,
          offset,
        }));
        return;
      }
      if (!workspaceSlug) {
        setSearchState({ results: [], total: 0, loading: false, error: null, offset: 0 });
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setSearchState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await searchMessages(
          { api, auth },
          {
            workspaceSlug,
            q: searchFilters.q,
            offset,
            limit: 20,
            channelId: searchFilters.channelId,
            userId: searchFilters.userId,
            fromDate: searchFilters.fromDate,
            toDate: searchFilters.toDate,
          },
        );

        setSearchState((prev) => ({
          results: append ? [...prev.results, ...data.results] : data.results,
          total: data.total,
          loading: false,
          error: null,
          offset,
        }));
      } catch (err) {
        setSearchState((prev) => ({
          ...prev,
          loading: false,
          error: getErrorMessage(err, "Search failed"),
        }));
      }
    },
    [auth, galleryMockData?.search?.defaultResponse, galleryMockData?.search?.responses, isGallery, state.channels, state.dms, state.messagesById, workspaceSlug],
  );

  const updateFilters = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...newFilters };
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void executeSearch(next, 0, false);
        }, 300);
        return next;
      });
    },
    [executeSearch],
  );

  const loadMore = useCallback(() => {
    const nextOffset = searchState.offset + 20;
    if (nextOffset >= searchState.total) return;
    void executeSearch(filters, nextOffset, true);
  }, [executeSearch, filters, searchState.offset, searchState.total]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFilters({ q: "" });
    setSearchState({ results: [], total: 0, loading: false, error: null, offset: 0 });
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    filters,
    updateFilters,
    results: searchState.results,
    total: searchState.total,
    loading: searchState.loading,
    error: searchState.error,
    loadMore,
    hasMore: searchState.offset + 20 < searchState.total,
    reset,
    channels: state.channels,
    dms: state.dms,
  };
}
