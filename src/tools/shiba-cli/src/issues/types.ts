// ===== Issue Progress Tracking =====

export type IssueProgressStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "completed";

export interface IssueProgress {
  status: IssueProgressStatus;
  percentComplete: number;
  startedAt: string | null;
  completedAt: string | null;
  lastWorkedAt: string | null;
  blockers: string[];
  /** Status before being blocked, restored when blockers are cleared. */
  statusBeforeBlocked?: IssueProgressStatus | null;
}

// ===== Analyzed Requirements =====

export type RequirementType = "functional" | "non-functional" | "technical" | "ui" | "data";
export type RequirementPriority = "must" | "should" | "could" | "wont";

export interface AnalyzedRequirement {
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  completed: boolean;
  notes: string | null;
}

export interface RequirementsAnalysis {
  summary: string;
  requirements: AnalyzedRequirement[];
  acceptanceCriteria: string[];
  outOfScope: string[];
  assumptions: string[];
  analyzedAt: string;
  rawDescription: string | null;
}

// ===== Required Contexts =====

export type ContextType = "file" | "module" | "documentation" | "external" | "dependency";

export interface RequiredContext {
  id: string;
  type: ContextType;
  path: string;
  description: string;
  relevance: string;
  reviewed: boolean;
}

// ===== API References =====

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  specSource: string | null;
  requestSchema: string | null;
  responseSchema: string | null;
  implemented: boolean;
  notes: string | null;
}

// ===== Figma References =====

export interface FigmaReference {
  id: string;
  url: string;
  name: string;
  nodeId: string | null;
  description: string | null;
  implemented: boolean;
  lastSynced: string | null;
}

// ===== Agent Notes =====

export type NoteCategory = "decision" | "todo" | "warning" | "info" | "question";

export interface AgentNote {
  id: string;
  content: string;
  category: NoteCategory;
  createdAt: string;
  resolvedAt: string | null;
}

// ===== Merge Request References =====

export type MergeRequestState = "opened" | "merged" | "closed";

export interface LinkedMergeRequest {
  id: string;
  iid: number;
  projectPath: string;
  title: string;
  webUrl: string;
  state: MergeRequestState;
  sourceBranch: string;
  targetBranch: string;
  linkedAt: string;
  isPrimary: boolean;
}

// ===== Jira Data (synced from API) =====

export interface JiraAssignee {
  name: string;
  email: string;
}

export interface JiraReporter {
  name: string;
}

export interface JiraComment {
  author: string;
  body: string;
  created: string;
}

export interface JiraLinkedIssue {
  type: string;
  key: string;
  summary: string;
  status: string;
}

export interface JiraData {
  id: string;
  summary: string;
  status: string;
  issueType: string;
  priority: string;
  assignee: JiraAssignee | null;
  reporter: JiraReporter | null;
  created: string;
  updated: string;
  description: string | null;
  comments: JiraComment[];
  linkedIssues: JiraLinkedIssue[];
}

// ===== Main Issue Tracking File Schema =====

export interface TrackedIssue {
  version: "1.0";
  issueKey: string;
  projectKey: string;
  jira: JiraData;
  analysis: RequirementsAnalysis | null;
  progress: IssueProgress;
  contexts: RequiredContext[];
  apis: ApiEndpoint[];
  figma: FigmaReference[];
  notes: AgentNote[];
  mergeRequests: LinkedMergeRequest[];
  createdAt: string;
  updatedAt: string;
  jiraSyncedAt: string;
}

// ===== Command Options Types =====

export interface IssueShowOpts {
  key: string;
}

export interface IssueAddNoteOpts {
  key: string;
  content: string;
  category: NoteCategory;
}

export interface IssueAddMrOpts {
  key: string;
  project: string;
  iid: number;
  primary?: boolean;
}

export interface IssueAddApiOpts {
  key: string;
  method: HttpMethod;
  path: string;
  description: string;
  spec?: string;
}

export interface IssueAddContextOpts {
  key: string;
  type: ContextType;
  path: string;
  description: string;
  relevance: string;
}

export interface IssueAddFigmaOpts {
  key: string;
  url: string;
  name: string;
  description?: string;
}

export interface IssueUpdateProgressOpts {
  key: string;
  status?: IssueProgressStatus;
  percent?: number;
  blocker?: string;
  clearBlockers?: boolean;
}

export interface IssueSetAnalysisOpts {
  key: string;
  summary: string;
  acceptanceCriteria?: string;
  outOfScope?: string;
  assumptions?: string;
}

export interface IssueAddRequirementOpts {
  key: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
}
