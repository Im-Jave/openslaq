import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MessageInput } from "../MessageInput";
import type { PendingFile } from "@/hooks/useFileUpload";

function makeFile(overrides: Partial<PendingFile> = {}): PendingFile {
  return {
    id: "file-1",
    uri: "file:///photo.jpg",
    name: "photo.jpg",
    mimeType: "image/jpeg",
    isImage: true,
    ...overrides,
  };
}

describe("FileUploadFlow", () => {
  it("attachment button triggers file picker", () => {
    const onAddAttachment = jest.fn();
    render(
      <MessageInput onSend={jest.fn()} onAddAttachment={onAddAttachment} />,
    );

    fireEvent.press(screen.getByTestId("attachment-button"));

    expect(onAddAttachment).toHaveBeenCalled();
  });

  it("selected files appear in FilePreviewStrip", () => {
    const pendingFiles = [
      makeFile({ id: "f1" }),
      makeFile({ id: "f2", name: "doc.pdf", mimeType: "application/pdf", isImage: false }),
    ];
    render(
      <MessageInput
        onSend={jest.fn()}
        pendingFiles={pendingFiles}
        onAddAttachment={jest.fn()}
        onRemoveFile={jest.fn()}
      />,
    );

    expect(screen.getByTestId("file-preview-f1")).toBeTruthy();
    expect(screen.getByTestId("file-preview-f2")).toBeTruthy();
  });

  it("removing file from preview calls onRemoveFile", () => {
    const onRemoveFile = jest.fn();
    const pendingFiles = [makeFile({ id: "f1" })];
    render(
      <MessageInput
        onSend={jest.fn()}
        pendingFiles={pendingFiles}
        onAddAttachment={jest.fn()}
        onRemoveFile={onRemoveFile}
      />,
    );

    fireEvent.press(screen.getByTestId("file-remove-f1"));

    expect(onRemoveFile).toHaveBeenCalledWith("f1");
  });
});
