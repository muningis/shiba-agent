// ADF
export { parseAdfToText } from "./adf/index.js";
export type { AdfNode, AdfMark } from "./adf/index.js";

// Environment
export { getEnv, requireEnv } from "./env.js";

// CLI execution
export { execCli, requireCli, isCliAvailable, type CliResult } from "./cli/exec.js";

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
  getTicketsDir,
  getRepoRoot,
  ensureConfigDir,
  ensureDataDir,
  ensureIssuesDir,
  ensureFigmaDir,
  ensureOapiDir,
  ensureGlabDir,
  ensureJiraDir,
  ensureTicketsDir,
  getCustomAgentsDir,
  ensureCustomAgentsDir,
  getCurrentEnvironment,
  isDataInitialized,
} from "./config/global.js";
export type {
  GlobalConfig,
  JiraConfig,
  OpenAPIAuthConfig,
  OpenAPISpecConfig,
} from "./config/global.js";

// Preferences
export {
  getDefaultPreferences,
  DEFAULT_BRANCH_PATTERN,
  DEFAULT_COMMIT_STYLE,
  DEFAULT_SHIBA_SIGNATURE,
  DEFAULT_WORKFLOW_ENABLED,
  DEFAULT_WORKFLOW_TRANSITIONS,
  DEFAULT_ISSUE_TRACKER,
} from "./config/preferences.js";
export type {
  ShibaPreferences,
  BranchNamingConfig,
  CommitMessageConfig,
  SignatureConfig,
  WorkflowConfig,
  WorkflowTransitionsConfig,
  IssueTracker,
} from "./config/preferences.js";

// HTTP
export { withRetry, isTransientError } from "./http/index.js";

// Jira
export {
  createJiraClient,
  getJiraConfig,
  JiraApiError,
} from "./jira/index.js";
export type {
  JiraClient,
  JiraClientConfig,
  JiraUser,
  JiraStatus,
  JiraIssueType,
  JiraPriority,
  JiraProject,
  JiraComment,
  JiraIssueLink,
  JiraIssueFields,
  JiraIssue,
  JiraTransition,
  JiraSearchResult,
  AdfDocument,
  CreateIssueData,
  CreateIssueResponse,
} from "./jira/index.js";

// Output
export { successResponse, errorResponse } from "./output/json.js";
export { handleCliError } from "./output/error.js";

// Types
export type * from "./types/index.js";
