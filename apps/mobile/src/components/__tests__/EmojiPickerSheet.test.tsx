import React from "react";
import { render } from "@testing-library/react-native";
import { EmojiPickerSheet } from "../EmojiPickerSheet";

jest.mock("rn-emoji-keyboard", () => {
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ open, onEmojiSelected, onClose }: { open: boolean; onEmojiSelected: (e: { emoji: string }) => void; onClose: () => void }) => {
      if (!open) return null;
      return (
        <View testID="emoji-picker">
          <Text
            testID="emoji-pick-thumbsup"
            onPress={() => onEmojiSelected({ emoji: "👍" })}
          >
            👍
          </Text>
          <Text testID="emoji-close" onPress={() => onClose()}>
            Close
          </Text>
        </View>
      );
    },
  };
});

describe("EmojiPickerSheet", () => {
  it("renders when visible", () => {
    const { getByTestId } = render(
      <EmojiPickerSheet visible onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(getByTestId("emoji-picker")).toBeTruthy();
  });

  it("does not render when not visible", () => {
    const { queryByTestId } = render(
      <EmojiPickerSheet visible={false} onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(queryByTestId("emoji-picker")).toBeNull();
  });

  it("calls onSelect with emoji string and onClose", () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = render(
      <EmojiPickerSheet visible onSelect={onSelect} onClose={onClose} />,
    );

    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(getByTestId("emoji-pick-thumbsup"));

    expect(onSelect).toHaveBeenCalledWith("👍");
    expect(onClose).toHaveBeenCalled();
  });
});
