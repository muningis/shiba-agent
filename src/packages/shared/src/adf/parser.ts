/**
 * Atlassian Document Format (ADF) to plain text parser.
 *
 * Converts ADF JSON (used in Jira descriptions, comments, etc.) to
 * human-readable plain text with markdown-like formatting.
 */

export interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
}

export interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/**
 * Parse an ADF document (or plain string) into plain text.
 * Returns null if the input is falsy.
 */
export function parseAdfToText(input: unknown): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;

  if (typeof input === "object" && input !== null && "content" in input) {
    return renderNode(input as AdfNode).trim();
  }

  return null;
}

function renderNode(node: AdfNode): string {
  switch (node.type) {
    case "doc":
      return renderChildren(node, "\n\n");

    case "paragraph":
      return renderChildren(node, "");

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = "#".repeat(level) + " ";
      return prefix + renderChildren(node, "");
    }

    case "bulletList":
      return renderListItems(node, "- ");

    case "orderedList":
      return renderOrderedListItems(node);

    case "listItem":
      return renderChildren(node, "\n");

    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      const code = renderChildren(node, "\n");
      return "```" + lang + "\n" + code + "\n```";
    }

    case "blockquote":
      return renderChildren(node, "\n")
        .split("\n")
        .map((line) => "> " + line)
        .join("\n");

    case "table":
      return renderTable(node);

    case "tableRow":
      return renderChildren(node, " | ");

    case "tableHeader":
    case "tableCell":
      return renderChildren(node, "");

    case "text":
      return node.text ?? "";

    case "hardBreak":
      return "\n";

    case "mention": {
      const mentionText =
        (node.attrs?.text as string) ??
        (node.attrs?.displayName as string) ??
        "@unknown";
      return mentionText;
    }

    case "rule":
      return "---";

    case "emoji":
      return (node.attrs?.shortName as string) ?? (node.attrs?.text as string) ?? "";

    // Fallback: recurse into children or return text
    default:
      if (node.content) {
        return renderChildren(node, "");
      }
      return node.text ?? "";
  }
}

function renderChildren(node: AdfNode, separator: string): string {
  if (!node.content) return node.text ?? "";
  return node.content.map(renderNode).join(separator);
}

function renderListItems(node: AdfNode, prefix: string): string {
  if (!node.content) return "";
  return node.content.map((item) => prefix + renderNode(item)).join("\n");
}

function renderOrderedListItems(node: AdfNode): string {
  if (!node.content) return "";
  return node.content
    .map((item, i) => `${i + 1}. ${renderNode(item)}`)
    .join("\n");
}

function renderTable(node: AdfNode): string {
  if (!node.content) return "";

  const rows = node.content.map((row) => {
    if (!row.content) return "";
    const cells = row.content.map((cell) => renderNode(cell));
    return "| " + cells.join(" | ") + " |";
  });

  // Insert header separator after first row
  if (rows.length > 0) {
    const headerRow = node.content[0];
    const colCount = headerRow?.content?.length ?? 0;
    const separator =
      "| " + Array(colCount).fill("---").join(" | ") + " |";
    rows.splice(1, 0, separator);
  }

  return rows.join("\n");
}
