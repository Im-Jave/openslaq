import { renderHook, act } from "@testing-library/react-native";
import { searchMessages } from "@openslaq/client-core";
import type { SearchResultItem } from "@openslaq/shared";
import { useSearch } from "../useSearch";

jest.mock("@openslaq/client-core", () => ({
  createApiClient: jest.fn(() => ({ __api: "mock-api-client" })),
  searchMessages: jest.fn(),
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

const mockAuthProvider = {
  getAccessToken: jest.fn(),
  requireAccessToken: jest.fn(),
  onAuthRequired: jest.fn(),
};

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: mockAuthProvider,
  }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {
      channels: [{ id: "ch-1", name: "general", type: "public" }],
      dms: [],
    },
  }),
}));

const searchMessagesMock = searchMessages as jest.Mock;

function makeResult(overrides: Partial<SearchResultItem> = {}): SearchResultItem {
  return {
    messageId: "msg-1" as any,
    channelId: "ch-1" as any,
    channelName: "general",
    channelType: "public",
    userId: "u-1" as any,
    userDisplayName: "User One",
    content: "hello world",
    headline: "<mark>hello</mark> world",
    parentMessageId: null,
    createdAt: "2025-01-01T00:00:00Z",
    rank: 1,
    ...overrides,
  };
}

describe("useSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces search calls (300ms)", async () => {
    searchMessagesMock.mockResolvedValue({ results: [], total: 0 });

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    // Not called yet (debouncing)
    expect(searchMessagesMock).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).toHaveBeenCalledTimes(1);
  });

  it("filter changes trigger new search after debounce", async () => {
    searchMessagesMock.mockResolvedValue({ results: [makeResult()], total: 1 });

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).toHaveBeenCalledTimes(1);

    // Change filter
    act(() => {
      result.current.updateFilters({ channelId: "ch-1" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).toHaveBeenCalledTimes(2);
  });

  it("loadMore calls API with offset+20 and appends results", async () => {
    const firstBatch = Array.from({ length: 20 }, (_, i) =>
      makeResult({ messageId: `msg-${i}` as any }),
    );
    searchMessagesMock.mockResolvedValueOnce({ results: firstBatch, total: 25 });

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);

    const moreBatch = Array.from({ length: 5 }, (_, i) =>
      makeResult({ messageId: `msg-${20 + i}` as any }),
    );
    searchMessagesMock.mockResolvedValueOnce({ results: moreBatch, total: 25 });

    await act(async () => {
      result.current.loadMore();
    });

    expect(searchMessagesMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ offset: 20 }),
    );
    expect(result.current.results).toHaveLength(25);
  });

  it("error from API sets error state", async () => {
    searchMessagesMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.error).toBe("Search failed");
    expect(result.current.results).toHaveLength(0);
  });

  it("reset clears filters, results, and aborts", async () => {
    searchMessagesMock.mockResolvedValue({ results: [makeResult()], total: 1 });

    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "hello" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toHaveLength(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.filters.q).toBe("");
    expect(result.current.results).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("empty query clears results without API call", async () => {
    const { result } = renderHook(() => useSearch("test-ws"));

    act(() => {
      result.current.updateFilters({ q: "" });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchMessagesMock).not.toHaveBeenCalled();
    expect(result.current.results).toHaveLength(0);
  });

  it("returns channels and dms from chat store", () => {
    const { result } = renderHook(() => useSearch("test-ws"));

    expect(result.current.channels).toHaveLength(1);
    expect(result.current.channels[0].name).toBe("general");
    expect(result.current.dms).toHaveLength(0);
  });
});
