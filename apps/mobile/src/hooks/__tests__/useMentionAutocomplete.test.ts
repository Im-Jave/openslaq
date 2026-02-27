import { renderHook, act } from "@testing-library/react-native";
import { useMentionAutocomplete, type MentionSuggestionItem } from "../useMentionAutocomplete";

const mockMembers: MentionSuggestionItem[] = [
  { id: "user-1", displayName: "Alice Johnson" },
  { id: "user-2", displayName: "Bob Smith" },
  { id: "user-3", displayName: "Charlie Brown" },
];

function renderAutocomplete(text: string, members = mockMembers) {
  return renderHook(() =>
    useMentionAutocomplete({ text, members }),
  );
}

describe("useMentionAutocomplete", () => {
  it("is not active when no @ trigger", () => {
    const { result } = renderAutocomplete("hello world");

    expect(result.current.isActive).toBe(false);
    expect(result.current.suggestions).toEqual([]);
  });

  it("activates on @ at start of text", () => {
    const { result } = renderAutocomplete("@");

    // Simulate cursor at end of text
    act(() => {
      result.current.onSelectionChange({
        nativeEvent: { selection: { start: 1, end: 1 } },
      } as never);
    });

    expect(result.current.isActive).toBe(true);
  });

  it("activates on @ after whitespace", () => {
    const { result } = renderAutocomplete("hello @al");

    act(() => {
      result.current.onSelectionChange({
        nativeEvent: { selection: { start: 9, end: 9 } },
      } as never);
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.query).toBe("al");
  });

  it("does not activate on @ in middle of word", () => {
    const { result } = renderAutocomplete("email@test");

    act(() => {
      result.current.onSelectionChange({
        nativeEvent: { selection: { start: 10, end: 10 } },
      } as never);
    });

    expect(result.current.isActive).toBe(false);
  });

  it("filters members by query", () => {
    const { result } = renderAutocomplete("@ali");

    act(() => {
      result.current.onSelectionChange({
        nativeEvent: { selection: { start: 4, end: 4 } },
      } as never);
    });

    const userSuggestions = result.current.suggestions.filter((s) => !s.isGroup);
    expect(userSuggestions).toHaveLength(1);
    expect(userSuggestions[0]!.displayName).toBe("Alice Johnson");
  });

  it("includes group mentions when query matches", () => {
    const { result } = renderAutocomplete("@her");

    act(() => {
      result.current.onSelectionChange({
        nativeEvent: { selection: { start: 4, end: 4 } },
      } as never);
    });

    const groupSuggestions = result.current.suggestions.filter((s) => s.isGroup);
    expect(groupSuggestions.length).toBeGreaterThanOrEqual(1);
    expect(groupSuggestions[0]!.id).toBe("here");
  });

  it("limits results to 10", () => {
    const manyMembers = Array.from({ length: 20 }, (_, i) => ({
      id: `user-${i}`,
      displayName: `User ${i}`,
    }));

    const { result } = renderAutocomplete("@", manyMembers);

    act(() => {
      result.current.onSelectionChange({
        nativeEvent: { selection: { start: 1, end: 1 } },
      } as never);
    });

    expect(result.current.suggestions.length).toBeLessThanOrEqual(10);
  });

  it("insertMention replaces @query with <@id>", () => {
    const { result } = renderAutocomplete("hello @ali");

    act(() => {
      result.current.onSelectionChange({
        nativeEvent: { selection: { start: 10, end: 10 } },
      } as never);
    });

    const insertResult = result.current.insertMention(mockMembers[0]!);

    expect(insertResult.text).toBe("hello <@user-1> ");
    expect(insertResult.cursorPosition).toBe(16);
  });

  it("insertMention works at start of text", () => {
    const { result } = renderAutocomplete("@ch");

    act(() => {
      result.current.onSelectionChange({
        nativeEvent: { selection: { start: 3, end: 3 } },
      } as never);
    });

    const insertResult = result.current.insertMention({
      id: "channel",
      displayName: "@channel",
      isGroup: true,
    });

    expect(insertResult.text).toBe("<@channel> ");
    expect(insertResult.cursorPosition).toBe(11);
  });
});
