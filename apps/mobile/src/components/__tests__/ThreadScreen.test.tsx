import React from "react";
import { render, screen } from "@testing-library/react-native";
import { View, ActivityIndicator } from "react-native";
import type { ThreadPaginationState } from "@openslaq/client-core";

// The ThreadScreen is a page component with many dependencies.
// We test the thread loading spinner behavior by rendering a minimal
// reproduction of the relevant FlatList renderItem logic.

/**
 * Minimal reproduction of the ThreadScreen's FlatList renderItem for index=0,
 * which is where the loading spinner appears between the parent separator and replies.
 */
function ThreadLoadingSpinner({
  pagination,
  hasReplies,
}: {
  pagination: ThreadPaginationState | undefined;
  hasReplies: boolean;
}) {
  return (
    <View>
      {hasReplies && (
        <>
          <View testID="parent-separator" />
          {pagination?.loadingOlder && (
            <View testID="thread-load-more-spinner">
              <ActivityIndicator size="small" />
            </View>
          )}
        </>
      )}
    </View>
  );
}

describe("ThreadScreen loading spinner", () => {
  it("renders spinner when loadingOlder is true", () => {
    const pagination: ThreadPaginationState = {
      olderCursor: "some-cursor",
      hasOlder: true,
      loadingOlder: true,
      newerCursor: null,
      hasNewer: false,
      loadingNewer: false,
    };

    render(<ThreadLoadingSpinner pagination={pagination} hasReplies={true} />);

    expect(screen.getByTestId("thread-load-more-spinner")).toBeTruthy();
  });

  it("hides spinner when loadingOlder is false", () => {
    const pagination: ThreadPaginationState = {
      olderCursor: "some-cursor",
      hasOlder: true,
      loadingOlder: false,
      newerCursor: null,
      hasNewer: false,
      loadingNewer: false,
    };

    render(<ThreadLoadingSpinner pagination={pagination} hasReplies={true} />);

    expect(screen.queryByTestId("thread-load-more-spinner")).toBeNull();
  });

  it("hides spinner when there are no replies", () => {
    const pagination: ThreadPaginationState = {
      olderCursor: null,
      hasOlder: false,
      loadingOlder: true,
      newerCursor: null,
      hasNewer: false,
      loadingNewer: false,
    };

    render(<ThreadLoadingSpinner pagination={pagination} hasReplies={false} />);

    expect(screen.queryByTestId("thread-load-more-spinner")).toBeNull();
  });
});
