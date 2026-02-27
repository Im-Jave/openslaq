import { describe, expect, it } from "bun:test";
import {
  extractPastedFiles,
  parseVsCodePaste,
  shouldSendOnEnter,
  VSCODE_LANG_MAP,
} from "./editor-helpers";

describe("editor-helpers", () => {
  it("returns send=true only for plain Enter outside blocked blocks", () => {
    expect(
      shouldSendOnEnter({
        key: "Enter",
        shiftKey: false,
        isCodeBlock: false,
        isBulletList: false,
        isOrderedList: false,
      }),
    ).toBe(true);

    expect(
      shouldSendOnEnter({
        key: "Enter",
        shiftKey: true,
        isCodeBlock: false,
        isBulletList: false,
        isOrderedList: false,
      }),
    ).toBe(false);

    expect(
      shouldSendOnEnter({
        key: "Enter",
        shiftKey: false,
        isCodeBlock: true,
        isBulletList: false,
        isOrderedList: false,
      }),
    ).toBe(false);
  });

  it("extracts only file clipboard items", () => {
    const textItem = { kind: "string", getAsFile: () => null } as unknown as DataTransferItem;
    const file = new File(["x"], "a.txt", { type: "text/plain" });
    const fileItem = { kind: "file", getAsFile: () => file } as unknown as DataTransferItem;

    const files = extractPastedFiles([textItem, fileItem] as unknown as DataTransferItemList);
    expect(files).toEqual([file]);
  });

  it("parses vscode payload and normalizes language ids", () => {
    expect(
      parseVsCodePaste({
        text: "const x = 1;\r\nconsole.log(x);",
        vscodeEditorData: JSON.stringify({ mode: "typescriptreact" }),
      }),
    ).toEqual({
      language: VSCODE_LANG_MAP.typescriptreact ?? "tsx",
      content: "const x = 1;\nconsole.log(x);",
    });
  });

  it("returns null for invalid vscode payload", () => {
    expect(parseVsCodePaste({ text: "x", vscodeEditorData: "not-json" })).toBeNull();
    expect(parseVsCodePaste({ text: "", vscodeEditorData: JSON.stringify({ mode: "ts" }) })).toBeNull();
    expect(parseVsCodePaste({ text: "x", vscodeEditorData: JSON.stringify({}) })).toBeNull();
  });
});
