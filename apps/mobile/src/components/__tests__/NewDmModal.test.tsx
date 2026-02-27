import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { NewDmModal } from "../NewDmModal";
import * as clientCore from "@openslaq/client-core";

jest.mock("@openslaq/client-core", () => ({
  listWorkspaceMembers: jest.fn(),
  createDm: jest.fn(),
  getErrorMessage: jest.fn((err, fallback) =>
    err instanceof Error ? err.message : fallback,
  ),
}));

const mockListMembers = clientCore.listWorkspaceMembers as jest.MockedFunction<
  typeof clientCore.listWorkspaceMembers
>;
const mockCreateDm = clientCore.createDm as jest.MockedFunction<
  typeof clientCore.createDm
>;

const mockDeps = {
  api: {} as any,
  auth: { onAuthRequired: jest.fn() } as any,
  dispatch: jest.fn(),
  getState: jest.fn(),
};

const members: clientCore.WorkspaceMember[] = [
  { id: "user-1", displayName: "Alice", email: "alice@test.com", avatarUrl: null, role: "member" },
  { id: "user-2", displayName: "Bob", email: "bob@test.com", avatarUrl: null, role: "member" },
  { id: "current", displayName: "Me", email: "me@test.com", avatarUrl: null, role: "admin" },
];

function renderModal(overrides = {}) {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
    workspaceSlug: "test-ws",
    currentUserId: "current",
    deps: mockDeps,
    ...overrides,
  };
  return { ...render(<NewDmModal {...defaultProps} />), props: defaultProps };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListMembers.mockResolvedValue(members);
});

describe("NewDmModal", () => {
  it("renders member list when visible", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("filters out current user from member list", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    expect(screen.queryByText("Me")).toBeNull();
  });

  it("filters members by search text", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId("new-dm-filter"), "alice");

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("filters members by email", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId("new-dm-filter"), "bob@");

    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.queryByText("Alice")).toBeNull();
  });

  it("shows loading state while fetching members", async () => {
    let resolveMembers!: (value: clientCore.WorkspaceMember[]) => void;
    mockListMembers.mockReturnValue(
      new Promise((resolve) => { resolveMembers = resolve; }),
    );

    renderModal();

    expect(screen.getByTestId("new-dm-loading")).toBeTruthy();

    await act(async () => resolveMembers(members));

    expect(screen.queryByTestId("new-dm-loading")).toBeNull();
  });

  it("shows error state on fetch failure", async () => {
    mockListMembers.mockRejectedValue(new Error("Network error"));

    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-error")).toBeTruthy();
    });

    expect(screen.getByText("Network error")).toBeTruthy();
  });

  it("calls createDm on member tap", async () => {
    mockCreateDm.mockResolvedValue({
      channel: { id: "dm-ch-1" },
      otherUser: { id: "user-1", displayName: "Alice" },
    } as any);

    const { props } = renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("new-dm-member-user-1"));
    });

    expect(mockCreateDm).toHaveBeenCalledWith(mockDeps, {
      workspaceSlug: "test-ws",
      targetUserId: "user-1",
    });
    expect(props.onCreated).toHaveBeenCalledWith("dm-ch-1");
  });

  it("shows creating state during DM creation", async () => {
    let resolveCreate!: (value: any) => void;
    mockCreateDm.mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("new-dm-member-user-1"));
    });

    expect(screen.getByTestId("new-dm-creating")).toBeTruthy();

    await act(async () =>
      resolveCreate({
        channel: { id: "dm-ch-1" },
        otherUser: { id: "user-1", displayName: "Alice" },
      }),
    );

    expect(screen.queryByTestId("new-dm-creating")).toBeNull();
  });

  it("calls onClose on backdrop tap", async () => {
    const { props } = renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("new-dm-backdrop"));

    expect(props.onClose).toHaveBeenCalled();
  });

  it("shows error when createDm returns null", async () => {
    mockCreateDm.mockResolvedValue(null);

    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-member-list")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("new-dm-member-user-1"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("new-dm-error")).toBeTruthy();
    });
  });
});
