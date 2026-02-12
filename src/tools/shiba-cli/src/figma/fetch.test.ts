import { describe, expect, it } from "bun:test";
import { extractDesignTokens } from "./fetch.js";
import type { FigmaFile, FigmaNode, FigmaStyle } from "./types.js";

function makeFile(overrides: {
  styles?: Record<string, FigmaStyle>;
  document?: FigmaNode;
}): FigmaFile {
  return {
    name: "Test File",
    lastModified: "2025-01-01T00:00:00Z",
    thumbnailUrl: "",
    version: "1",
    document: overrides.document ?? {
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      children: [],
    },
    components: {},
    styles: overrides.styles ?? {},
  };
}

describe("extractDesignTokens", () => {
  it("extracts a single color token with style key correlation", () => {
    const file = makeFile({
      styles: {
        "S:abc123": {
          key: "abc123",
          name: "Primary Blue",
          description: "",
          styleType: "FILL",
        },
      },
      document: {
        id: "0:0",
        name: "Document",
        type: "DOCUMENT",
        children: [
          {
            id: "1:1",
            name: "Blue Rectangle",
            type: "RECTANGLE",
            styles: { fill: "S:abc123" },
            fills: [
              {
                type: "SOLID",
                color: { r: 0, g: 0.4, b: 1, a: 1 },
              },
            ],
          },
        ],
      },
    });

    const tokens = extractDesignTokens(file);
    expect(tokens.colors).toHaveLength(1);
    expect(tokens.colors[0].name).toBe("Primary Blue");
    expect(tokens.colors[0].value).toBe("#0066ff");
    expect(tokens.colors[0].opacity).toBe(1);
    expect(tokens.colors[0].styleKey).toBe("S:abc123");
  });

  it("extracts multiple color tokens correctly (no cross-contamination)", () => {
    const file = makeFile({
      styles: {
        "S:red": {
          key: "red",
          name: "Red",
          description: "",
          styleType: "FILL",
        },
        "S:green": {
          key: "green",
          name: "Green",
          description: "",
          styleType: "FILL",
        },
      },
      document: {
        id: "0:0",
        name: "Document",
        type: "DOCUMENT",
        children: [
          {
            id: "1:1",
            name: "Red Node",
            type: "RECTANGLE",
            styles: { fill: "S:red" },
            fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }],
          },
          {
            id: "1:2",
            name: "Green Node",
            type: "RECTANGLE",
            styles: { fill: "S:green" },
            fills: [{ type: "SOLID", color: { r: 0, g: 1, b: 0, a: 1 } }],
          },
        ],
      },
    });

    const tokens = extractDesignTokens(file);
    expect(tokens.colors).toHaveLength(2);

    const red = tokens.colors.find((c) => c.name === "Red");
    const green = tokens.colors.find((c) => c.name === "Green");

    expect(red?.value).toBe("#ff0000");
    expect(green?.value).toBe("#00ff00");
  });

  it("extracts typography token with style key correlation", () => {
    const file = makeFile({
      styles: {
        "S:heading": {
          key: "heading",
          name: "Heading 1",
          description: "",
          styleType: "TEXT",
        },
      },
      document: {
        id: "0:0",
        name: "Document",
        type: "DOCUMENT",
        children: [
          {
            id: "1:1",
            name: "Title Text",
            type: "TEXT",
            styles: { text: "S:heading" },
            characters: "Hello",
            style: {
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: 32,
              lineHeightPx: 40,
              letterSpacing: -0.5,
            },
          },
        ],
      },
    });

    const tokens = extractDesignTokens(file);
    expect(tokens.typography).toHaveLength(1);
    expect(tokens.typography[0].name).toBe("Heading 1");
    expect(tokens.typography[0].fontFamily).toBe("Inter");
    expect(tokens.typography[0].fontWeight).toBe(700);
    expect(tokens.typography[0].fontSize).toBe(32);
    expect(tokens.typography[0].lineHeight).toBe(40);
    expect(tokens.typography[0].letterSpacing).toBe(-0.5);
  });

  it("leaves unresolved tokens with default values when no matching node", () => {
    const file = makeFile({
      styles: {
        "S:orphan": {
          key: "orphan",
          name: "Orphan Color",
          description: "",
          styleType: "FILL",
        },
      },
      document: {
        id: "0:0",
        name: "Document",
        type: "DOCUMENT",
        children: [],
      },
    });

    const tokens = extractDesignTokens(file);
    expect(tokens.colors).toHaveLength(1);
    // Stays at default since no node references this style
    expect(tokens.colors[0].value).toBe("#000000");
  });

  it("handles empty styles", () => {
    const file = makeFile({ styles: {} });
    const tokens = extractDesignTokens(file);
    expect(tokens.colors).toHaveLength(0);
    expect(tokens.typography).toHaveLength(0);
  });

  it("ignores nodes without styles property", () => {
    const file = makeFile({
      styles: {
        "S:fill1": {
          key: "fill1",
          name: "Fill",
          description: "",
          styleType: "FILL",
        },
      },
      document: {
        id: "0:0",
        name: "Document",
        type: "DOCUMENT",
        children: [
          {
            id: "1:1",
            name: "No styles",
            type: "RECTANGLE",
            // no styles property
            fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
          },
        ],
      },
    });

    const tokens = extractDesignTokens(file);
    // Token stays unresolved since node has no styles mapping
    expect(tokens.colors[0].value).toBe("#000000");
  });
});
