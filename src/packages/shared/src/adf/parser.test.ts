import { describe, test, expect } from "bun:test";
import { parseAdfToText } from "./parser.js";

describe("parseAdfToText", () => {
  test("returns null for falsy input", () => {
    expect(parseAdfToText(null)).toBeNull();
    expect(parseAdfToText(undefined)).toBeNull();
    expect(parseAdfToText("")).toBeNull();
    expect(parseAdfToText(0)).toBeNull();
  });

  test("returns string input as-is", () => {
    expect(parseAdfToText("hello world")).toBe("hello world");
  });

  test("handles simple paragraph", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    expect(parseAdfToText(adf)).toBe("Hello world");
  });

  test("handles multiple paragraphs", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Line 1" }] },
        { type: "paragraph", content: [{ type: "text", text: "Line 2" }] },
      ],
    };
    expect(parseAdfToText(adf)).toBe("Line 1\n\nLine 2");
  });

  test("handles headings with levels", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title" }],
        },
      ],
    };
    expect(parseAdfToText(adf)).toBe("## Title");
  });

  test("handles heading defaults to level 1", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "heading",
          content: [{ type: "text", text: "Main" }],
        },
      ],
    };
    expect(parseAdfToText(adf)).toBe("# Main");
  });

  test("handles bullet lists", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item A" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item B" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = parseAdfToText(adf)!;
    expect(result).toContain("- Item A");
    expect(result).toContain("- Item B");
  });

  test("handles ordered lists", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = parseAdfToText(adf)!;
    expect(result).toContain("1. First");
    expect(result).toContain("2. Second");
  });

  test("handles codeBlock with language", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    };
    const result = parseAdfToText(adf)!;
    expect(result).toContain("```ts");
    expect(result).toContain("const x = 1;");
    expect(result).toContain("```");
  });

  test("handles codeBlock without language", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "codeBlock",
          content: [{ type: "text", text: "plain code" }],
        },
      ],
    };
    const result = parseAdfToText(adf)!;
    expect(result).toContain("```\n");
    expect(result).toContain("plain code");
  });

  test("handles blockquote", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quoted text" }],
            },
          ],
        },
      ],
    };
    expect(parseAdfToText(adf)).toContain("> Quoted text");
  });

  test("handles hardBreak", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Before" },
            { type: "hardBreak" },
            { type: "text", text: "After" },
          ],
        },
      ],
    };
    expect(parseAdfToText(adf)).toBe("Before\nAfter");
  });

  test("handles mention with text attr", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "mention", attrs: { text: "@alice" } },
          ],
        },
      ],
    };
    expect(parseAdfToText(adf)).toBe("Hello @alice");
  });

  test("handles mention with displayName attr", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "mention", attrs: { displayName: "@bob" } },
          ],
        },
      ],
    };
    expect(parseAdfToText(adf)).toBe("@bob");
  });

  test("handles table", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Name" }],
                    },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Value" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "foo" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "bar" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = parseAdfToText(adf)!;
    expect(result).toContain("| Name | Value |");
    expect(result).toContain("| --- | --- |");
    expect(result).toContain("| foo | bar |");
  });

  test("handles rule (horizontal line)", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Above" }] },
        { type: "rule" },
        { type: "paragraph", content: [{ type: "text", text: "Below" }] },
      ],
    };
    const result = parseAdfToText(adf)!;
    expect(result).toContain("---");
  });

  test("returns null for non-ADF object without content", () => {
    expect(parseAdfToText({ someKey: "value" })).toBeNull();
  });

  test("handles nested structures", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Overview" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Description here." }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Point one" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = parseAdfToText(adf)!;
    expect(result).toContain("# Overview");
    expect(result).toContain("Description here.");
    expect(result).toContain("- Point one");
  });

  test("handles unknown node types gracefully via fallback", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "panel",
          attrs: { panelType: "info" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Panel content" }],
            },
          ],
        },
      ],
    };
    expect(parseAdfToText(adf)).toContain("Panel content");
  });
});
