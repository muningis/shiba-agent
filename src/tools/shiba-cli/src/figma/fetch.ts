import { getFigmaToken, getFigmaDir, ensureFigmaDir } from "@shiba-agent/shared";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  FigmaFile,
  FigmaNode,
  CachedFigmaFile,
  DesignTokens,
  ColorToken,
  TypographyToken,
  ComponentSummary,
} from "./types.js";

const FIGMA_API = "https://api.figma.com/v1";

// Cache staleness threshold (1 hour)
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

async function figmaFetch<T>(endpoint: string): Promise<T> {
  const token = getFigmaToken();

  const response = await fetch(`${FIGMA_API}${endpoint}`, {
    headers: {
      "X-Figma-Token": token,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Figma API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}

function getCachePath(fileKey: string): string {
  return join(getFigmaDir(), `${fileKey}.json`);
}

function loadFromCache(fileKey: string): CachedFigmaFile | null {
  const cachePath = getCachePath(fileKey);
  if (!existsSync(cachePath)) return null;

  try {
    const content = readFileSync(cachePath, "utf-8");
    const cached = JSON.parse(content) as CachedFigmaFile;

    // Check if cache is stale
    const fetchedAt = new Date(cached.fetchedAt).getTime();
    if (Date.now() - fetchedAt > CACHE_MAX_AGE_MS) {
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

function saveToCache(fileKey: string, file: FigmaFile): void {
  ensureFigmaDir();
  const cachePath = getCachePath(fileKey);
  const cached: CachedFigmaFile = {
    file,
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(cachePath, JSON.stringify(cached, null, 2));
}

/**
 * Fetch a Figma file (with caching)
 */
export async function fetchFile(fileKey: string, forceRefresh = false): Promise<FigmaFile> {
  if (!forceRefresh) {
    const cached = loadFromCache(fileKey);
    if (cached) return cached.file;
  }

  const file = await figmaFetch<FigmaFile>(`/files/${fileKey}`);
  saveToCache(fileKey, file);
  return file;
}

/**
 * Fetch specific nodes from a Figma file
 */
export async function fetchNodes(
  fileKey: string,
  nodeIds: string[]
): Promise<Record<string, FigmaNode>> {
  const ids = nodeIds.join(",");
  const response = await figmaFetch<{ nodes: Record<string, { document: FigmaNode }> }>(
    `/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`
  );

  const result: Record<string, FigmaNode> = {};
  for (const [id, data] of Object.entries(response.nodes)) {
    if (data?.document) {
      result[id] = data.document;
    }
  }
  return result;
}

/**
 * Extract design tokens (colors, typography) from a file
 */
export function extractDesignTokens(file: FigmaFile): DesignTokens {
  const colors: ColorToken[] = [];
  const typography: TypographyToken[] = [];

  // Extract from styles
  for (const [key, style] of Object.entries(file.styles)) {
    if (style.styleType === "FILL") {
      // Color style - we need to find the actual color from the document
      colors.push({
        name: style.name,
        value: "#000000", // Will be resolved from document traversal
        styleKey: key,
      });
    } else if (style.styleType === "TEXT") {
      typography.push({
        name: style.name,
        fontFamily: "Unknown",
        fontWeight: 400,
        fontSize: 16,
        styleKey: key,
      });
    }
  }

  // Traverse document to find actual values
  traverseForTokens(file.document, colors, typography);

  return { colors, typography };
}

function traverseForTokens(
  node: FigmaNode,
  colors: ColorToken[],
  typography: TypographyToken[]
): void {
  // Extract fill colors
  if (node.fills) {
    for (const fill of node.fills) {
      if (fill.type === "SOLID" && fill.color && fill.visible !== false) {
        const hex = rgbaToHex(fill.color.r, fill.color.g, fill.color.b);
        // Check if this matches a style we're looking for
        const existing = colors.find((c) => c.value === "#000000");
        if (existing) {
          existing.value = hex;
          existing.opacity = fill.color.a;
        }
      }
    }
  }

  // Extract text styles
  if (node.style && node.type === "TEXT") {
    const textStyle = node.style;
    const existing = typography.find((t) => t.fontFamily === "Unknown");
    if (existing) {
      existing.fontFamily = textStyle.fontFamily;
      existing.fontWeight = textStyle.fontWeight;
      existing.fontSize = textStyle.fontSize;
      existing.lineHeight = textStyle.lineHeightPx;
      existing.letterSpacing = textStyle.letterSpacing;
    }
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      traverseForTokens(child, colors, typography);
    }
  }
}

function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * List all components in a file
 */
export function listComponents(file: FigmaFile): ComponentSummary[] {
  const components: ComponentSummary[] = [];

  for (const [key, component] of Object.entries(file.components)) {
    components.push({
      key,
      name: component.name,
      description: component.description,
      nodeId: findNodeIdByComponentKey(file.document, key) ?? key,
    });
  }

  return components;
}

function findNodeIdByComponentKey(node: FigmaNode, componentKey: string): string | null {
  // Component nodes have the same ID as their key
  if (node.id === componentKey) {
    return node.id;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeIdByComponentKey(child, componentKey);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Get file metadata (without full document)
 */
export async function getFileMetadata(
  fileKey: string
): Promise<{ name: string; lastModified: string; version: string; thumbnailUrl: string }> {
  const file = await fetchFile(fileKey);
  return {
    name: file.name,
    lastModified: file.lastModified,
    version: file.version,
    thumbnailUrl: file.thumbnailUrl,
  };
}
