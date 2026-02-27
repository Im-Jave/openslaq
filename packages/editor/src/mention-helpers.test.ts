import { describe, expect, it } from "bun:test";
import { filterMentionItems } from "./mention-helpers";
import type { MentionSuggestionItem } from "./MentionSuggestion";

const members: MentionSuggestionItem[] = [
  { id: "u1", displayName: "Alice Cooper" },
  { id: "u2", displayName: "Bob Marley" },
  { id: "u3", displayName: "Alicia Keys" },
];

describe("filterMentionItems", () => {
  it("includes matching group mentions and users", () => {
    const items = filterMentionItems("ali", members);
    expect(items.map((i) => i.id)).toEqual(["u1", "u3"]);

    const groupItems = filterMentionItems("here", members);
    expect(groupItems[0]?.id).toBe("here");
  });

  it("limits results to 10", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `u${i}`, displayName: `user${i}` }));
    const items = filterMentionItems("u", many);
    expect(items.length).toBe(10);
  });
});
