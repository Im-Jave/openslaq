import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { MessageAttachments } from "../MessageAttachments";
import type { Attachment } from "@openslaq/shared";

jest.mock("@/lib/env", () => ({
  env: { EXPO_PUBLIC_API_URL: "http://api.test" },
}));

function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: "att-1" as Attachment["id"],
    messageId: "msg-1" as Attachment["messageId"],
    filename: "test.txt",
    mimeType: "text/plain",
    size: 1024,
    uploadedBy: "user-1" as Attachment["uploadedBy"],
    createdAt: "2025-01-01T00:00:00Z",
    downloadUrl: "http://api.test/api/uploads/att-1/download",
    ...overrides,
  };
}

describe("MessageAttachments", () => {
  it("returns null when attachments array is empty", () => {
    const { toJSON } = render(<MessageAttachments attachments={[]} />);
    expect(toJSON()).toBeNull();
  });

  it("renders image attachment", () => {
    const att = makeAttachment({
      id: "att-img" as Attachment["id"],
      filename: "photo.jpg",
      mimeType: "image/jpeg",
    });
    render(<MessageAttachments attachments={[att]} />);

    expect(screen.getByTestId("attachment-image-att-img")).toBeTruthy();
  });

  it("renders video attachment", () => {
    const att = makeAttachment({
      id: "att-vid" as Attachment["id"],
      filename: "video.mp4",
      mimeType: "video/mp4",
      size: 5242880,
    });
    render(<MessageAttachments attachments={[att]} />);

    expect(screen.getByTestId("attachment-video-att-vid")).toBeTruthy();
    expect(screen.getByText("video.mp4")).toBeTruthy();
    expect(screen.getByText("5.0 MB")).toBeTruthy();
  });

  it("renders file attachment", () => {
    const att = makeAttachment({
      id: "att-file" as Attachment["id"],
      filename: "document.pdf",
      mimeType: "application/pdf",
      size: 2048,
    });
    render(<MessageAttachments attachments={[att]} />);

    expect(screen.getByTestId("attachment-file-att-file")).toBeTruthy();
    expect(screen.getByText("document.pdf")).toBeTruthy();
    expect(screen.getByText("2.0 KB")).toBeTruthy();
  });

  it("opens video URL via Linking", () => {
    const spy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const att = makeAttachment({
      id: "att-vid" as Attachment["id"],
      filename: "video.mp4",
      mimeType: "video/mp4",
    });
    render(<MessageAttachments attachments={[att]} />);

    fireEvent.press(screen.getByTestId("attachment-video-att-vid"));

    expect(spy).toHaveBeenCalledWith("http://api.test/api/uploads/att-vid/download");
    spy.mockRestore();
  });

  it("opens file URL via Linking", () => {
    const spy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const att = makeAttachment({
      id: "att-file" as Attachment["id"],
      filename: "doc.pdf",
      mimeType: "application/pdf",
    });
    render(<MessageAttachments attachments={[att]} />);

    fireEvent.press(screen.getByTestId("attachment-file-att-file"));

    expect(spy).toHaveBeenCalledWith("http://api.test/api/uploads/att-file/download");
    spy.mockRestore();
  });

  it("renders multiple attachments of different types", () => {
    const attachments = [
      makeAttachment({ id: "a1" as Attachment["id"], mimeType: "image/png", filename: "pic.png" }),
      makeAttachment({ id: "a2" as Attachment["id"], mimeType: "video/mp4", filename: "vid.mp4" }),
      makeAttachment({ id: "a3" as Attachment["id"], mimeType: "application/pdf", filename: "doc.pdf" }),
    ];
    render(<MessageAttachments attachments={attachments} />);

    expect(screen.getByTestId("attachment-image-a1")).toBeTruthy();
    expect(screen.getByTestId("attachment-video-a2")).toBeTruthy();
    expect(screen.getByTestId("attachment-file-a3")).toBeTruthy();
  });

  it("formats sizes correctly", () => {
    const attachments = [
      makeAttachment({ id: "a1" as Attachment["id"], mimeType: "application/pdf", filename: "tiny.pdf", size: 500 }),
      makeAttachment({ id: "a2" as Attachment["id"], mimeType: "application/pdf", filename: "medium.pdf", size: 512000 }),
      makeAttachment({ id: "a3" as Attachment["id"], mimeType: "application/pdf", filename: "big.pdf", size: 2621440 }),
    ];
    render(<MessageAttachments attachments={attachments} />);

    expect(screen.getByText("500 B")).toBeTruthy();
    expect(screen.getByText("500.0 KB")).toBeTruthy();
    expect(screen.getByText("2.5 MB")).toBeTruthy();
  });
});
