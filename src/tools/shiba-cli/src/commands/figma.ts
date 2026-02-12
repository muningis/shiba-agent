import { Command } from "commander";
import { successResponse, handleCliError } from "@shiba-agent/shared";
import {
  fetchFile,
  fetchNodes,
  extractDesignTokens,
  listComponents,
  getFileMetadata,
} from "../figma/index.js";

export function createFigmaCommands(): Command {
  const figma = new Command("figma").description("Figma design operations");

  // figma file-get
  figma
    .command("file-get")
    .description("Get Figma file metadata and document")
    .requiredOption("--key <key>", "Figma file key (from URL)")
    .option("--refresh", "Force refresh from API (bypass cache)")
    .option("--metadata-only", "Only return metadata, not full document")
    .action(async (opts) => {
      try {
        if (opts.metadataOnly) {
          const metadata = await getFileMetadata(opts.key);
          successResponse(metadata);
        } else {
          const file = await fetchFile(opts.key, opts.refresh);
          successResponse({
            name: file.name,
            lastModified: file.lastModified,
            version: file.version,
            thumbnailUrl: file.thumbnailUrl,
            componentsCount: Object.keys(file.components).length,
            stylesCount: Object.keys(file.styles).length,
          });
        }
      } catch (err) {
        handleCliError(err);
      }
    });

  // figma node-get
  figma
    .command("node-get")
    .description("Get specific nodes from a Figma file")
    .requiredOption("--key <key>", "Figma file key")
    .requiredOption("--nodes <ids>", "Comma-separated node IDs")
    .action(async (opts) => {
      try {
        const nodeIds = opts.nodes.split(",").map((id: string) => id.trim());
        const nodes = await fetchNodes(opts.key, nodeIds);
        successResponse({ nodes });
      } catch (err) {
        handleCliError(err);
      }
    });

  // figma styles
  figma
    .command("styles")
    .description("Extract design tokens (colors, typography) from a file")
    .requiredOption("--key <key>", "Figma file key")
    .option("--refresh", "Force refresh from API")
    .action(async (opts) => {
      try {
        const file = await fetchFile(opts.key, opts.refresh);
        const tokens = extractDesignTokens(file);
        successResponse(tokens);
      } catch (err) {
        handleCliError(err);
      }
    });

  // figma components
  figma
    .command("components")
    .description("List all components in a Figma file")
    .requiredOption("--key <key>", "Figma file key")
    .option("--refresh", "Force refresh from API")
    .action(async (opts) => {
      try {
        const file = await fetchFile(opts.key, opts.refresh);
        const components = listComponents(file);
        successResponse({
          total: components.length,
          components,
        });
      } catch (err) {
        handleCliError(err);
      }
    });

  return figma;
}
