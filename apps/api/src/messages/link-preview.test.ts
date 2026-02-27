import { describe, test, expect } from "bun:test";
import { extractUrls } from "./link-preview-service";

describe("extractUrls", () => {
  test("single URL", () => {
    expect(extractUrls("Check this out https://example.com")).toEqual(["https://example.com"]);
  });

  test("multiple URLs", () => {
    expect(extractUrls("https://a.com and https://b.com")).toEqual(["https://a.com", "https://b.com"]);
  });

  test("deduplicates identical URLs", () => {
    expect(extractUrls("https://a.com and https://a.com")).toEqual(["https://a.com"]);
  });

  test("limits to 3 URLs", () => {
    const result = extractUrls("https://a.com https://b.com https://c.com https://d.com");
    expect(result).toHaveLength(3);
  });

  test("no URLs returns empty array", () => {
    expect(extractUrls("Hello world, no links here")).toEqual([]);
  });

  test("strips trailing punctuation", () => {
    expect(extractUrls("Visit https://example.com.")).toEqual(["https://example.com"]);
  });
});
