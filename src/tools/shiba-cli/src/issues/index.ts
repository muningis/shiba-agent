// Types
export type {
  // Progress
  IssueProgressStatus,
  IssueProgress,
  // Requirements
  RequirementType,
  RequirementPriority,
  AnalyzedRequirement,
  RequirementsAnalysis,
  // Contexts
  ContextType,
  RequiredContext,
  // APIs
  HttpMethod,
  ApiEndpoint,
  // Figma
  FigmaReference,
  // Notes
  NoteCategory,
  AgentNote,
  // Merge Requests
  MergeRequestState,
  LinkedMergeRequest,
  // Jira
  JiraAssignee,
  JiraReporter,
  JiraComment,
  JiraLinkedIssue,
  JiraData,
  // Main
  TrackedIssue,
  // Command Options
  IssueShowOpts,
  IssueAddNoteOpts,
  IssueAddMrOpts,
  IssueAddApiOpts,
  IssueAddContextOpts,
  IssueAddFigmaOpts,
  IssueUpdateProgressOpts,
  IssueSetAnalysisOpts,
  IssueAddRequirementOpts,
} from "./types.js";

// Store functions
export {
  // Core CRUD
  getIssuePath,
  loadIssue,
  saveIssue,
  listIssues,
  createDefaultIssue,
  // Jira sync
  syncJiraData,
  // Notes
  addNote,
  resolveNote,
  // Merge Requests
  addMergeRequest,
  updateMergeRequest,
  // APIs
  addApiEndpoint,
  markApiImplemented,
  // Contexts
  addContext,
  markContextReviewed,
  // Figma
  addFigma,
  markFigmaImplemented,
  // Progress
  updateProgress,
  addBlocker,
  clearBlockers,
  // Analysis
  createEmptyAnalysis,
  setAnalysis,
  addRequirement,
  markRequirementCompleted,
} from "./store.js";

export type {
  AddMergeRequestInput,
  AddApiEndpointInput,
  AddContextInput,
  AddFigmaInput,
  AddRequirementInput,
} from "./store.js";
