import React from "react";
import { render, screen } from "@testing-library/react-native";
import { MessageContent } from "../MessageContent";
import type { Mention } from "@openslaq/shared";
import { asUserId } from "@openslaq/shared";

// Mock the markdown renderer to render plain text for testability
jest.mock("@ronradtke/react-native-markdown-display", () => {
  const { Text } = require("react-native");
  // Simple mock: render children as Text, apply custom rules for links
  return {
    __esModule: true,
    default: ({ children, rules }: { children: string; rules?: Record<string, Function> }) => {
      // Simple: extract mention links and render via rules
      const mentionRegex = /\[@([^\]]+)\]\(mention:([^)]+)\)/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let key = 0;

      mentionRegex.lastIndex = 0;
      while ((match = mentionRegex.exec(children)) !== null) {
        if (match.index > lastIndex) {
          parts.push(<Text key={key++}>{children.slice(lastIndex, match.index)}</Text>);
        }
        // Simulate calling the link rule
        if (rules?.link) {
          const node = {
            key: `link-${key}`,
            attributes: { href: `mention:${match[2]}` },
            children: [{ content: match[1] }],
          };
          parts.push(rules.link(node, [], null, {}));
        }
        lastIndex = match.index + match[0].length;
        key++;
      }
      if (lastIndex < children.length) {
        parts.push(<Text key={key++}>{children.slice(lastIndex)}</Text>);
      }

      // Also handle code fences
      const fenceRegex = /```(\w+)?\n([\s\S]*?)```/g;
      if (fenceRegex.test(children) && rules?.fence) {
        fenceRegex.lastIndex = 0;
        const fenceMatch = fenceRegex.exec(children);
        if (fenceMatch) {
          const node = {
            key: "fence-0",
            sourceInfo: fenceMatch[1] ?? null,
            content: fenceMatch[2],
          };
          return <>{rules.fence(node)}</>;
        }
      }

      return <>{parts.length > 0 ? parts : <Text>{children}</Text>}</>;
    },
  };
});

// Mock CodeBlock
jest.mock("../CodeBlock", () => {
  const { Text } = require("react-native");
  return {
    CodeBlock: ({ children, language }: { children: string; language?: string }) => (
      <Text testID="code-block">{`[${language ?? "text"}] ${children}`}</Text>
    ),
  };
});

describe("MessageContent", () => {
  it("renders plain text content", () => {
    render(<MessageContent content="Hello world" />);

    expect(screen.getByText("Hello world")).toBeTruthy();
  });

  it("renders user mention as MentionBadge", () => {
    const mentions: Mention[] = [
      { userId: asUserId("user-1"), displayName: "Alice", type: "user" },
    ];

    render(
      <MessageContent content="Hey <@user-1> check this" mentions={mentions} />,
    );

    expect(screen.getByTestId("mention-badge-user-1")).toBeTruthy();
    expect(screen.getByText("@Alice")).toBeTruthy();
  });

  it("renders @here mention as group badge", () => {
    render(<MessageContent content="<@here> alert!" mentions={[]} />);

    expect(screen.getByTestId("mention-badge-here")).toBeTruthy();
    expect(screen.getByText("@here")).toBeTruthy();
  });

  it("renders @channel mention as group badge", () => {
    render(<MessageContent content="<@channel> update" mentions={[]} />);

    expect(screen.getByTestId("mention-badge-channel")).toBeTruthy();
    expect(screen.getByText("@channel")).toBeTruthy();
  });

  it("renders multiple mentions", () => {
    const mentions: Mention[] = [
      { userId: asUserId("user-1"), displayName: "Alice", type: "user" },
      { userId: asUserId("user-2"), displayName: "Bob", type: "user" },
    ];

    render(
      <MessageContent
        content="Hey <@user-1> and <@user-2>"
        mentions={mentions}
      />,
    );

    expect(screen.getByTestId("mention-badge-user-1")).toBeTruthy();
    expect(screen.getByTestId("mention-badge-user-2")).toBeTruthy();
  });

  it("falls back to token when mention not in mentions array", () => {
    render(
      <MessageContent content="Hey <@unknown-user>" mentions={[]} />,
    );

    expect(screen.getByText("@unknown-user")).toBeTruthy();
  });
});
