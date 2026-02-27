import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MessageInput } from "../MessageInput";

describe("MessageInput", () => {
  it("send button is disabled when empty", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const sendButton = screen.getByText("↑");
    fireEvent.press(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });

  it("typing enables send button", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "hello");
    fireEvent.press(screen.getByText("↑"));

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("calls onSend with trimmed text and clears input", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "  hello world  ");
    fireEvent.press(screen.getByText("↑"));

    expect(onSend).toHaveBeenCalledWith("hello world");
    expect(input.props.value).toBe("");
  });

  it("whitespace-only does not trigger onSend", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "   ");
    fireEvent.press(screen.getByText("↑"));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows edit banner when editingMessage is set", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={{ id: "msg-1", content: "original text" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
      />,
    );

    expect(screen.getByTestId("edit-banner")).toBeTruthy();
    expect(screen.getByText("Editing message")).toBeTruthy();
    expect(screen.getByTestId("edit-cancel")).toBeTruthy();
  });

  it("pre-fills input with message content in edit mode", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={{ id: "msg-1", content: "original text" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
      />,
    );

    const input = screen.getByTestId("message-input");
    expect(input.props.value).toBe("original text");
  });

  it("calls onSaveEdit in edit mode when content changed", () => {
    const onSaveEdit = jest.fn();
    const onSend = jest.fn();

    render(
      <MessageInput
        onSend={onSend}
        editingMessage={{ id: "msg-1", content: "original text" }}
        onCancelEdit={jest.fn()}
        onSaveEdit={onSaveEdit}
      />,
    );

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "updated text");
    fireEvent.press(screen.getByText("↑"));

    expect(onSaveEdit).toHaveBeenCalledWith("msg-1", "updated text");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("cancel clears edit mode", () => {
    const onCancelEdit = jest.fn();

    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={{ id: "msg-1", content: "original text" }}
        onCancelEdit={onCancelEdit}
        onSaveEdit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("edit-cancel"));
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it("does not show edit banner when editingMessage is null", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        editingMessage={null}
      />,
    );

    expect(screen.queryByTestId("edit-banner")).toBeNull();
  });

  it("calls onTyping when text changes", () => {
    const onTyping = jest.fn();
    render(<MessageInput onSend={jest.fn()} onTyping={onTyping} />);

    const input = screen.getByPlaceholderText("Message");
    fireEvent.changeText(input, "h");
    fireEvent.changeText(input, "he");

    expect(onTyping).toHaveBeenCalledTimes(2);
  });

  it("shows attachment button when onAddAttachment is provided", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        onAddAttachment={jest.fn()}
      />,
    );

    expect(screen.getByTestId("attachment-button")).toBeTruthy();
  });

  it("hides attachment button when onAddAttachment is not provided", () => {
    render(<MessageInput onSend={jest.fn()} />);

    expect(screen.queryByTestId("attachment-button")).toBeNull();
  });

  it("calls onAddAttachment when attachment button is pressed", () => {
    const onAddAttachment = jest.fn();
    render(
      <MessageInput
        onSend={jest.fn()}
        onAddAttachment={onAddAttachment}
      />,
    );

    fireEvent.press(screen.getByTestId("attachment-button"));

    expect(onAddAttachment).toHaveBeenCalled();
  });

  it("enables send button when files are pending even with empty text", () => {
    const onSend = jest.fn();
    const pendingFiles = [
      { id: "f1", uri: "file:///test.jpg", name: "test.jpg", mimeType: "image/jpeg", isImage: true },
    ];
    render(
      <MessageInput
        onSend={onSend}
        pendingFiles={pendingFiles}
        onAddAttachment={jest.fn()}
        onRemoveFile={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("message-send"));

    expect(onSend).toHaveBeenCalledWith("");
  });

  it("shows upload spinner when uploading", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        uploading={true}
        pendingFiles={[
          { id: "f1", uri: "file:///test.jpg", name: "test.jpg", mimeType: "image/jpeg", isImage: true },
        ]}
        onAddAttachment={jest.fn()}
        onRemoveFile={jest.fn()}
      />,
    );

    expect(screen.getByTestId("upload-spinner")).toBeTruthy();
  });

  it("shows mention suggestion list when @ triggers autocomplete", () => {
    const members = [
      { id: "user-1", displayName: "Alice" },
      { id: "user-2", displayName: "Bob" },
    ];
    render(<MessageInput onSend={jest.fn()} members={members} />);

    const input = screen.getByTestId("message-input");
    fireEvent.changeText(input, "@a");
    // Simulate cursor position after the typed text
    fireEvent(input, "selectionChange", {
      nativeEvent: { selection: { start: 2, end: 2 } },
    });

    expect(screen.getByTestId("mention-suggestion-list")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
  });
});
