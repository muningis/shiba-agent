// Auth
export { getGitlabClient } from "./auth/gitlab.js";
export { getJiraClient } from "./auth/jira.js";
export { getFigmaToken } from "./auth/figma.js";

// Config
export {
  loadGlobalConfig,
  saveGlobalConfig,
  getConfigPath,
  getConfigDir,
  getOapiDir,
  getIssuesDir,
  getFigmaDir,
  getRepoRoot,
  ensureConfigDir,
  ensureIssuesDir,
  ensureFigmaDir,
} from "./config/global.js";
export type {
  GlobalConfig,
  OpenAPIAuthConfig,
  OpenAPISpecConfig,
} from "./config/global.js";

// Output
export { successResponse, errorResponse } from "./output/json.js";
export { handleCliError } from "./output/error.js";

// Types
export type * from "./types/index.js";
