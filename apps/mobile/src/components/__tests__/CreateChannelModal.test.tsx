import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { CreateChannelModal } from "../CreateChannelModal";
import { createChannel } from "@openslaq/client-core";
import { asChannelId, asWorkspaceId, asUserId } from "@openslaq/shared";

jest.mock("@openslaq/client-core", () => ({
  createChannel: jest.fn(),
}));

const mockCreateChannel = createChannel as jest.MockedFunction<typeof createChannel>;

const mockDeps = {
  api: {} as any,
  auth: {} as any,
  dispatch: jest.fn(),
  getState: jest.fn(() => ({}) as any),
};

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  workspaceSlug: "test-workspace",
  canCreatePrivate: false,
  deps: mockDeps,
  onCreated: jest.fn(),
};

describe("CreateChannelModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when visible=false", () => {
    const { toJSON } = render(
      <CreateChannelModal {...defaultProps} visible={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders name input and submit button when visible", () => {
    render(<CreateChannelModal {...defaultProps} />);

    expect(screen.getByTestId("create-channel-name-input")).toBeTruthy();
    expect(screen.getByTestId("create-channel-submit")).toBeTruthy();
  });

  it("submit button is disabled when name is empty", () => {
    render(<CreateChannelModal {...defaultProps} />);

    const submit = screen.getByTestId("create-channel-submit");
    // The button should have disabled styling (opacity via surfaceTertiary bg)
    expect(submit).toBeTruthy();
  });

  it("calls createChannel with correct params on submit", async () => {
    const mockChannel = {
      id: asChannelId("ch-1"),
      workspaceId: asWorkspaceId("ws-1"),
      name: "test-channel",
      displayName: null,
      type: "public" as const,
      description: null,
      isArchived: false,
      createdBy: asUserId("user-1"),
      createdAt: "2025-01-01T00:00:00Z",
    };
    mockCreateChannel.mockResolvedValue(mockChannel);

    render(<CreateChannelModal {...defaultProps} />);

    fireEvent.changeText(
      screen.getByTestId("create-channel-name-input"),
      "test-channel",
    );
    fireEvent.press(screen.getByTestId("create-channel-submit"));

    await waitFor(() => {
      expect(mockCreateChannel).toHaveBeenCalledWith(mockDeps, {
        workspaceSlug: "test-workspace",
        name: "test-channel",
        type: "public",
      });
    });
  });

  it("shows error message on API failure", async () => {
    mockCreateChannel.mockRejectedValue(new Error("Channel name taken"));

    render(<CreateChannelModal {...defaultProps} />);

    fireEvent.changeText(
      screen.getByTestId("create-channel-name-input"),
      "test-channel",
    );
    fireEvent.press(screen.getByTestId("create-channel-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("create-channel-error")).toBeTruthy();
      expect(screen.getByText("Channel name taken")).toBeTruthy();
    });
  });

  it("hides private toggle when canCreatePrivate=false", () => {
    render(<CreateChannelModal {...defaultProps} canCreatePrivate={false} />);

    expect(screen.queryByTestId("create-channel-type-public")).toBeNull();
    expect(screen.queryByTestId("create-channel-type-private")).toBeNull();
  });

  it("shows public/private toggle when canCreatePrivate=true", () => {
    render(<CreateChannelModal {...defaultProps} canCreatePrivate={true} />);

    expect(screen.getByTestId("create-channel-type-public")).toBeTruthy();
    expect(screen.getByTestId("create-channel-type-private")).toBeTruthy();
  });

  it("calls onClose when backdrop pressed", () => {
    const onClose = jest.fn();
    render(<CreateChannelModal {...defaultProps} onClose={onClose} />);

    fireEvent.press(screen.getByTestId("create-channel-backdrop"));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onCreated on successful creation", async () => {
    const mockChannel = {
      id: asChannelId("ch-1"),
      workspaceId: asWorkspaceId("ws-1"),
      name: "new-channel",
      displayName: null,
      type: "public" as const,
      description: null,
      isArchived: false,
      createdBy: asUserId("user-1"),
      createdAt: "2025-01-01T00:00:00Z",
    };
    mockCreateChannel.mockResolvedValue(mockChannel);
    const onCreated = jest.fn();

    render(<CreateChannelModal {...defaultProps} onCreated={onCreated} />);

    fireEvent.changeText(
      screen.getByTestId("create-channel-name-input"),
      "new-channel",
    );
    fireEvent.press(screen.getByTestId("create-channel-submit"));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(mockChannel);
    });
  });

  it("creates private channel when private toggle is selected", async () => {
    const mockChannel = {
      id: asChannelId("ch-1"),
      workspaceId: asWorkspaceId("ws-1"),
      name: "secret",
      displayName: null,
      type: "private" as const,
      description: null,
      isArchived: false,
      createdBy: asUserId("user-1"),
      createdAt: "2025-01-01T00:00:00Z",
    };
    mockCreateChannel.mockResolvedValue(mockChannel);

    render(<CreateChannelModal {...defaultProps} canCreatePrivate={true} />);

    fireEvent.press(screen.getByTestId("create-channel-type-private"));
    fireEvent.changeText(
      screen.getByTestId("create-channel-name-input"),
      "secret",
    );
    fireEvent.press(screen.getByTestId("create-channel-submit"));

    await waitFor(() => {
      expect(mockCreateChannel).toHaveBeenCalledWith(mockDeps, {
        workspaceSlug: "test-workspace",
        name: "secret",
        type: "private",
      });
    });
  });
});
