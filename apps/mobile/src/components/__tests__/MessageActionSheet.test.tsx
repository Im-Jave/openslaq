import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MessageActionSheet } from "../MessageActionSheet";
import type { Message } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("user-1"),
    senderDisplayName: "Alice",
    content: "Hello world",
    createdAt: "2025-01-01T12:00:00Z",
    updatedAt: "2025-01-01T12:00:00Z",
    parentMessageId: null,
    latestReplyAt: null,
    reactions: [],
    replyCount: 0,
    attachments: [],
    mentions: [],
    ...overrides,
  };
}

const defaultProps = {
  visible: true,
  onReaction: jest.fn(),
  onOpenEmojiPicker: jest.fn(),
  onEditMessage: jest.fn(),
  onDeleteMessage: jest.fn(),
  onClose: jest.fn(),
};

describe("MessageActionSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders quick reaction buttons", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByTestId("quick-reaction-✅")).toBeTruthy();
    expect(screen.getByTestId("quick-reaction-👀")).toBeTruthy();
    expect(screen.getByTestId("quick-reaction-🙌")).toBeTruthy();
    expect(screen.getByTestId("quick-reaction-picker")).toBeTruthy();
  });

  it("tapping quick reaction calls onReaction and onClose", () => {
    const onReaction = jest.fn();
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        onReaction={onReaction}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("quick-reaction-✅"));

    expect(onReaction).toHaveBeenCalledWith("msg-1", "✅");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows edit/delete for own messages", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage({ userId: asUserId("user-1") })}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByTestId("action-edit-message")).toBeTruthy();
    expect(screen.getByTestId("action-delete-message")).toBeTruthy();
  });

  it("hides edit/delete for other users messages", () => {
    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage({ userId: asUserId("other-user") })}
        currentUserId="user-1"
      />,
    );

    expect(screen.queryByTestId("action-edit-message")).toBeNull();
    expect(screen.queryByTestId("action-delete-message")).toBeNull();
  });

  it("tapping edit calls onEditMessage and onClose", () => {
    const onEditMessage = jest.fn();
    const onClose = jest.fn();
    const msg = makeMessage();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={msg}
        currentUserId="user-1"
        onEditMessage={onEditMessage}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-edit-message"));

    expect(onClose).toHaveBeenCalled();
    expect(onEditMessage).toHaveBeenCalledWith(msg);
  });

  it("tapping delete shows confirmation alert", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-delete-message"));

    expect(onClose).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Delete Message",
      "Are you sure you want to delete this message?",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel" }),
        expect.objectContaining({ text: "Delete" }),
      ]),
    );
  });

  it("backdrop tap calls onClose", () => {
    const onClose = jest.fn();

    render(
      <MessageActionSheet
        {...defaultProps}
        message={makeMessage()}
        currentUserId="user-1"
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("action-sheet-backdrop"));

    expect(onClose).toHaveBeenCalled();
  });

  it("returns null when message is null", () => {
    const { toJSON } = render(
      <MessageActionSheet
        {...defaultProps}
        message={null}
        currentUserId="user-1"
      />,
    );

    expect(toJSON()).toBeNull();
  });
});
