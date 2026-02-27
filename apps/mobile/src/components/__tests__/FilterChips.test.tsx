import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FilterChips } from "../search/FilterChips";

describe("FilterChips", () => {
  it("shows default labels when no filters active", () => {
    const chips = [
      { key: "channel", label: "Channel", value: undefined, onPress: jest.fn(), onClear: jest.fn() },
      { key: "person", label: "Person", value: undefined, onPress: jest.fn(), onClear: jest.fn() },
    ];

    render(<FilterChips chips={chips} />);

    expect(screen.getByTestId("filter-chip-channel")).toBeTruthy();
    expect(screen.getByTestId("filter-chip-person")).toBeTruthy();
    // No clear buttons should be visible
    expect(screen.queryByTestId("filter-chip-clear-channel")).toBeNull();
    expect(screen.queryByTestId("filter-chip-clear-person")).toBeNull();
  });

  it("active filter shows value and X button", () => {
    const chips = [
      { key: "channel", label: "Channel", value: "general", onPress: jest.fn(), onClear: jest.fn() },
    ];

    render(<FilterChips chips={chips} />);

    expect(screen.getByTestId("filter-chip-clear-channel")).toBeTruthy();
  });

  it("tapping X calls onClear callback", () => {
    const onClear = jest.fn();
    const chips = [
      { key: "channel", label: "Channel", value: "general", onPress: jest.fn(), onClear },
    ];

    render(<FilterChips chips={chips} />);

    fireEvent.press(screen.getByTestId("filter-chip-clear-channel"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("tapping chip calls onPress callback", () => {
    const onPress = jest.fn();
    const chips = [
      { key: "channel", label: "Channel", value: undefined, onPress, onClear: jest.fn() },
    ];

    render(<FilterChips chips={chips} />);

    fireEvent.press(screen.getByTestId("filter-chip-channel"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
