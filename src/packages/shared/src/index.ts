// Environment
export { getEnv, requireEnv } from "./env.js";

// CLI execution
export { execCli, requireCli, type CliResult } from "./cli/exec.js";

// Auth (only Figma - GitLab/Jira use CLIs)
export { getFigmaToken } from "./auth/figma.js";

// Config
export {
  loadGlobalConfig,
  saveGlobalConfig,
  getConfigPath,
  getConfigDir,
  getDataDir,
  getOapiDir,
  getIssuesDir,
  getFigmaDir,
  getGlabDir,
  getJiraDir,
  getRepoRoot,
  ensureConfigDir,
  ensureDataDir,
  ensureIssuesDir,
  ensureFigmaDir,
  ensureOapiDir,
  ensureGlabDir,
  ensureJiraDir,
  getCurrentEnvironment,
  isDataInitialized,
} from "./config/global.js";
export type {
  GlobalConfig,
  OpenAPIAuthConfig,
  OpenAPISpecConfig,
} from "./config/global.js";

// Preferences
export {
  getDefaultPreferences,
  DEFAULT_BRANCH_PATTERN,
  DEFAULT_COMMIT_STYLE,
  DEFAULT_SHIBA_SIGNATURE,
} from "./config/preferences.js";
export type {
  ShibaPreferences,
  BranchNamingConfig,
  CommitMessageConfig,
  SignatureConfig,
} from "./config/preferences.js";

// Output
export { successResponse, errorResponse } from "./output/json.js";
export { handleCliError } from "./output/error.js";

// Types
export type * from "./types/index.js";
