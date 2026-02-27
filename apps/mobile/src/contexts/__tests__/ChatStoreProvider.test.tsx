import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, screen, act, fireEvent } from "@testing-library/react-native";
import { asWorkspaceId, asChannelId } from "@openslaq/shared";
import { ChatStoreProvider, useChatStore } from "../ChatStoreProvider";

function TestConsumer() {
  const { state, dispatch } = useChatStore();
  return (
    <>
      <Text testID="workspace-slug">{state.workspaceSlug ?? "none"}</Text>
      <Text testID="channel-count">{String(state.channels.length)}</Text>
      <Text testID="active-channel">
        {state.activeChannelId ?? "none"}
      </Text>
      <TouchableOpacity
        testID="bootstrap-start"
        onPress={() =>
          dispatch({ type: "workspace/bootstrapStart", workspaceSlug: "test" })
        }
      />
      <TouchableOpacity
        testID="bootstrap"
        onPress={() =>
          dispatch({
            type: "workspace/bootstrapSuccess",
            workspaces: [
              {
                id: asWorkspaceId("ws-1"),
                name: "Test",
                slug: "test",
                createdAt: "2025-01-01T00:00:00Z",
                role: "owner" as const,
              },
            ],
            channels: [
              {
                id: asChannelId("ch-1"),
                name: "general",
                displayName: null,
                workspaceId: asWorkspaceId("ws-1"),
                type: "public" as const,
                description: null,
                isArchived: false,
                createdAt: "2025-01-01T00:00:00Z",
                createdBy: null,
              },
            ],
            dms: [],
            groupDms: [],
          })
        }
      />
      <TouchableOpacity
        testID="select-channel"
        onPress={() =>
          dispatch({ type: "workspace/selectChannel", channelId: asChannelId("ch-1") })
        }
      />
    </>
  );
}

function getTestIdText(testID: string): string {
  return (screen.getByTestId(testID).children as string[]).join("");
}

describe("ChatStoreProvider", () => {
  it("provides initial state", () => {
    render(
      <ChatStoreProvider>
        <TestConsumer />
      </ChatStoreProvider>,
    );

    expect(getTestIdText("workspace-slug")).toBe("none");
    expect(getTestIdText("channel-count")).toBe("0");
    expect(getTestIdText("active-channel")).toBe("none");
  });

  it("dispatch updates state correctly", async () => {
    render(
      <ChatStoreProvider>
        <TestConsumer />
      </ChatStoreProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("bootstrap-start"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("bootstrap"));
    });

    expect(getTestIdText("workspace-slug")).toBe("test");
    expect(getTestIdText("channel-count")).toBe("1");

    await act(async () => {
      fireEvent.press(screen.getByTestId("select-channel"));
    });

    expect(getTestIdText("active-channel")).toBe("ch-1");
  });

  it("throws when used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useChatStore must be used inside ChatStoreProvider");

    spy.mockRestore();
  });
});
