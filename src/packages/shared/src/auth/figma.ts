import { errorResponse } from "../output/json.js";
import { loadGlobalConfig, getConfigPath } from "../config/global.js";

/**
 * Returns the Figma personal access token.
 * Reads figma.token from ~/.shiba-agent/config.json.
 */
export function getFigmaToken(): string {
  const config = loadGlobalConfig();
  const token = config.figma?.token;

  if (!token) {
    errorResponse("MISSING_CONFIG", "Figma token not configured.", {
      hint: `Add figma.token to ${getConfigPath()}`,
      docs: "Get token from https://www.figma.com/developers/api#access-tokens",
    });
  }

  return token;
}
