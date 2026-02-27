import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MentionBadge } from "../MentionBadge";

describe("MentionBadge", () => {
  it("renders a user mention with display name", () => {
    render(<MentionBadge token="user-1" displayName="Alice" />);

    expect(screen.getByText("@Alice")).toBeTruthy();
    expect(screen.getByTestId("mention-badge-user-1")).toBeTruthy();
  });

  it("renders a user mention with token fallback when no displayName", () => {
    render(<MentionBadge token="user-1" />);

    expect(screen.getByText("@user-1")).toBeTruthy();
  });

  it("renders @here as group mention", () => {
    render(<MentionBadge token="here" />);

    expect(screen.getByText("@here")).toBeTruthy();
    expect(screen.getByTestId("mention-badge-here")).toBeTruthy();
  });

  it("renders @channel as group mention", () => {
    render(<MentionBadge token="channel" />);

    expect(screen.getByText("@channel")).toBeTruthy();
  });

  it("calls onPress for user mentions when tapped", () => {
    const onPress = jest.fn();
    render(<MentionBadge token="user-1" displayName="Alice" onPress={onPress} />);

    fireEvent.press(screen.getByTestId("mention-badge-user-1"));

    expect(onPress).toHaveBeenCalledWith("user-1");
  });

  it("does not call onPress for group mentions", () => {
    const onPress = jest.fn();
    render(<MentionBadge token="here" onPress={onPress} />);

    // Group mentions are Text, not Pressable, so press should not trigger onPress
    fireEvent.press(screen.getByTestId("mention-badge-here"));

    expect(onPress).not.toHaveBeenCalled();
  });
});
