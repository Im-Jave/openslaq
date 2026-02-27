import { describe, test, expect } from "bun:test";
import { parseMentions } from "./mentions";

describe("parseMentions", () => {
  test("single user mention", () => {
    const result = parseMentions("Hello <@user-123>!");
    expect(result).toEqual([{ userId: "user-123", type: "user" }]);
  });

  test("<@here> special token", () => {
    const result = parseMentions("Hey <@here> check this out");
    expect(result).toEqual([{ userId: "here", type: "here" }]);
  });

  test("<@channel> special token", () => {
    const result = parseMentions("Attention <@channel>");
    expect(result).toEqual([{ userId: "channel", type: "channel" }]);
  });

  test("deduplication: same user mentioned twice → 1 entry", () => {
    const result = parseMentions("<@user-1> and <@user-1> again");
    expect(result).toEqual([{ userId: "user-1", type: "user" }]);
  });

  test("mixed mentions: user + here + channel", () => {
    const result = parseMentions("<@user-abc> <@here> <@channel>");
    expect(result).toEqual([
      { userId: "user-abc", type: "user" },
      { userId: "here", type: "here" },
      { userId: "channel", type: "channel" },
    ]);
  });

  test("multiple distinct user mentions", () => {
    const result = parseMentions("<@user-1> and <@user-2>");
    expect(result).toEqual([
      { userId: "user-1", type: "user" },
      { userId: "user-2", type: "user" },
    ]);
  });

  test("no mentions: plain text → empty array", () => {
    const result = parseMentions("Hello world, no mentions here");
    expect(result).toEqual([]);
  });

  test("empty string → empty array", () => {
    const result = parseMentions("");
    expect(result).toEqual([]);
  });

  test("empty mention token <@> → not matched (regex requires 1+ chars)", () => {
    const result = parseMentions("<@>");
    expect(result).toEqual([]);
  });

  test("nested brackets <<@user>> → extracts inner mention", () => {
    const result = parseMentions("<<@user-nested>>");
    expect(result).toEqual([{ userId: "user-nested", type: "user" }]);
  });

  test("mention-like text without angle brackets is ignored", () => {
    const result = parseMentions("@user-123 is not a mention");
    expect(result).toEqual([]);
  });

  test("mention with spaces in token", () => {
    // The regex captures everything between <@ and >, so spaces are included
    const result = parseMentions("<@user with spaces>");
    expect(result).toEqual([{ userId: "user with spaces", type: "user" }]);
  });
});
