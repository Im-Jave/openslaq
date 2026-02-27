import { useState, useMemo, useCallback } from "react";
import type { NativeSyntheticEvent, TextInputSelectionChangeEventData } from "react-native";

export interface MentionSuggestionItem {
  id: string;
  displayName: string;
  isGroup?: boolean;
}

const GROUP_MENTIONS: MentionSuggestionItem[] = [
  { id: "here", displayName: "@here — notify online members", isGroup: true },
  { id: "channel", displayName: "@channel — notify all members", isGroup: true },
];

interface UseMentionAutocompleteOptions {
  text: string;
  members: MentionSuggestionItem[];
}

interface UseMentionAutocompleteResult {
  suggestions: MentionSuggestionItem[];
  query: string;
  isActive: boolean;
  onSelectionChange: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
  insertMention: (item: MentionSuggestionItem) => { text: string; cursorPosition: number };
}

/**
 * Detects `@` trigger in text input and provides filtered member suggestions.
 * Returns a function to insert a mention into the text.
 */
export function useMentionAutocomplete({
  text,
  members,
}: UseMentionAutocompleteOptions): UseMentionAutocompleteResult {
  const [cursorPosition, setCursorPosition] = useState(0);

  const onSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setCursorPosition(e.nativeEvent.selection.start);
    },
    [],
  );

  // Find the @ trigger position and query text
  const { query, triggerIndex } = useMemo(() => {
    // Look backwards from cursor for an @ that is preceded by whitespace or start-of-string
    const textBeforeCursor = text.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex < 0) return { query: "", triggerIndex: -1 };

    // @ must be at start of string or preceded by whitespace
    if (atIndex > 0 && !/\s/.test(textBeforeCursor[atIndex - 1]!)) {
      return { query: "", triggerIndex: -1 };
    }

    const queryText = textBeforeCursor.slice(atIndex + 1);

    // If query contains whitespace after first word, cancel (allow one-word partial matches)
    // But actually we want multi-word matching for display names like "John Doe"
    // So just check there's no newline
    if (queryText.includes("\n")) {
      return { query: "", triggerIndex: -1 };
    }

    return { query: queryText, triggerIndex: atIndex };
  }, [text, cursorPosition]);

  const isActive = triggerIndex >= 0;

  const suggestions = useMemo(() => {
    if (!isActive) return [];

    const q = query.toLowerCase();

    const groups = GROUP_MENTIONS.filter(
      (g) => g.id.toLowerCase().startsWith(q) || g.displayName.toLowerCase().includes(q),
    );

    const users = members.filter((m) =>
      m.displayName.toLowerCase().includes(q),
    );

    return [...groups, ...users].slice(0, 10);
  }, [isActive, query, members]);

  const insertMention = useCallback(
    (item: MentionSuggestionItem) => {
      // Replace @query with <@id> followed by a space
      const before = text.slice(0, triggerIndex);
      const after = text.slice(cursorPosition);
      const mentionText = `<@${item.id}> `;
      const newText = before + mentionText + after;
      const newCursor = before.length + mentionText.length;

      return { text: newText, cursorPosition: newCursor };
    },
    [text, triggerIndex, cursorPosition],
  );

  return {
    suggestions,
    query,
    isActive,
    onSelectionChange,
    insertMention,
  };
}
