import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SearchScreen } from "../search/SearchScreen";

const mockUpdateFilters = jest.fn();
const mockReset = jest.fn();
const mockLoadMore = jest.fn();

let mockFilters = { q: "", channelId: undefined, userId: undefined, fromDate: undefined, toDate: undefined };
let mockResults: any[] = [];
let mockTotal = 0;
let mockLoading = false;
let mockError: string | null = null;
let mockHasMore = false;

jest.mock("@/hooks/useSearch", () => ({
  useSearch: () => ({
    filters: mockFilters,
    updateFilters: mockUpdateFilters,
    results: mockResults,
    total: mockTotal,
    loading: mockLoading,
    error: mockError,
    loadMore: mockLoadMore,
    hasMore: mockHasMore,
    reset: mockReset,
    channels: [],
    dms: [],
  }),
}));

// Mock sub-components that aren't relevant to these tests
jest.mock("../search/FilterChips", () => ({
  FilterChips: () => null,
}));
jest.mock("../search/ChannelPickerModal", () => ({
  ChannelPickerModal: () => null,
}));
jest.mock("../search/MemberPickerModal", () => ({
  MemberPickerModal: () => null,
}));
jest.mock("../search/DatePickerModal", () => ({
  DatePickerModal: () => null,
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "test-ws" }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: mockBack,
    canGoBack: jest.fn(() => false),
  }),
}));

describe("SearchScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFilters = { q: "", channelId: undefined, userId: undefined, fromDate: undefined, toDate: undefined };
    mockResults = [];
    mockTotal = 0;
    mockLoading = false;
    mockError = null;
    mockHasMore = false;
  });

  it("renders search input and empty state", () => {
    render(<SearchScreen />);

    expect(screen.getByTestId("search-input")).toBeTruthy();
    expect(screen.getByTestId("search-empty-state")).toBeTruthy();
  });

  it("clears search and returns to empty state", () => {
    // Start with a query so the clear button is visible
    mockFilters = { ...mockFilters, q: "test query" };

    render(<SearchScreen />);

    expect(screen.getByTestId("search-clear-button")).toBeTruthy();

    fireEvent.press(screen.getByTestId("search-clear-button"));

    expect(mockReset).toHaveBeenCalled();
  });

  it("shows no-results state", () => {
    mockFilters = { ...mockFilters, q: "nonsense query" };
    mockResults = [];
    mockLoading = false;
    mockError = null;

    render(<SearchScreen />);

    expect(screen.getByTestId("search-no-results")).toBeTruthy();
  });

  it("back button calls router.back()", () => {
    render(<SearchScreen />);

    fireEvent.press(screen.getByTestId("search-back-button"));

    expect(mockReset).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });
});
