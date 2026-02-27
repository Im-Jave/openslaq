import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FlatList, Text, View } from "react-native";

/**
 * Minimal reproduction of the ThreadScreen's reply list pagination behavior.
 * The actual ThreadScreen is a page component with many dependencies;
 * we test the core pagination logic with a standalone FlatList.
 */
function ThreadReplyList({
  replies,
  loadOlderReplies,
}: {
  replies: Array<{ id: string; content: string }>;
  loadOlderReplies: () => void;
}) {
  return (
    <FlatList
      testID="thread-replies"
      data={replies}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View testID={`reply-${item.id}`}>
          <Text>{item.content}</Text>
        </View>
      )}
      onStartReached={loadOlderReplies}
      inverted
    />
  );
}

describe("Thread pagination", () => {
  it("renders newest replies", () => {
    const replies = Array.from({ length: 5 }, (_, i) => ({
      id: `reply-${i + 1}`,
      content: `Reply ${i + 1}`,
    }));

    render(<ThreadReplyList replies={replies} loadOlderReplies={jest.fn()} />);

    // The last reply in the array (newest) should be rendered
    expect(screen.getByTestId("reply-reply-5")).toBeTruthy();
    expect(screen.getByText("Reply 5")).toBeTruthy();
    // First reply should also be in the list
    expect(screen.getByTestId("reply-reply-1")).toBeTruthy();
  });

  it("calls loadOlderReplies on scroll to top", () => {
    const loadOlder = jest.fn();
    const replies = Array.from({ length: 10 }, (_, i) => ({
      id: `reply-${i + 1}`,
      content: `Reply ${i + 1}`,
    }));

    render(<ThreadReplyList replies={replies} loadOlderReplies={loadOlder} />);

    const list = screen.getByTestId("thread-replies");
    fireEvent(list, "startReached");

    expect(loadOlder).toHaveBeenCalled();
  });
});
