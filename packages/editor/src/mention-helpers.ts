import type { MentionSuggestionItem } from "./MentionSuggestion";

export const GROUP_MENTIONS: MentionSuggestionItem[] = [
  { id: "here", displayName: "@here — notify online members", isGroup: true },
  { id: "channel", displayName: "@channel — notify all members", isGroup: true },
];

export function filterMentionItems(query: string, members: MentionSuggestionItem[]): MentionSuggestionItem[] {
  const q = query.toLowerCase();

  const groups = GROUP_MENTIONS.filter((g) =>
    g.id.toLowerCase().startsWith(q) || g.displayName.toLowerCase().includes(q),
  );

  const users = members.filter((m) => m.displayName.toLowerCase().includes(q));

  return [...groups, ...users].slice(0, 10);
}
