import { existsSync, readFileSync, writeFileSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { getIssuesDir, ensureIssuesDir } from "@shiba-agent/shared";
import type {
  TrackedIssue,
  IssueProgress,
  IssueProgressStatus,
  AgentNote,
  NoteCategory,
  LinkedMergeRequest,
  MergeRequestState,
  ApiEndpoint,
  HttpMethod,
  RequiredContext,
  ContextType,
  FigmaReference,
  RequirementsAnalysis,
  AnalyzedRequirement,
  RequirementType,
  RequirementPriority,
  JiraData,
} from "./types.js";

// ===== Core CRUD =====

export function getIssuePath(key: string): string {
  return join(getIssuesDir(), `${key}.json`);
}

export function loadIssue(key: string): TrackedIssue | null {
  const issuePath = getIssuePath(key);
  if (!existsSync(issuePath)) return null;

  try {
    const content = readFileSync(issuePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function saveIssue(issue: TrackedIssue): void {
  ensureIssuesDir();
  const issuePath = getIssuePath(issue.issueKey);
  issue.updatedAt = new Date().toISOString();
  // Atomic write: write to temp file then rename (same filesystem = atomic)
  const tmpPath = issuePath + `.tmp.${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(issue, null, 2) + "\n");
  renameSync(tmpPath, issuePath);
}

export function listIssues(): string[] {
  const issuesDir = getIssuesDir();
  if (!existsSync(issuesDir)) return [];

  return readdirSync(issuesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

export function createDefaultIssue(key: string): TrackedIssue {
  const projectKey = key.match(/^(.+)-\d+$/)?.[1] ?? key.split("-")[0];
  const now = new Date().toISOString();

  return {
    version: "1.0",
    issueKey: key,
    projectKey,
    jira: {
      id: "",
      summary: "",
      status: "",
      issueType: "",
      priority: "",
      assignee: null,
      reporter: null,
      created: "",
      updated: "",
      description: null,
      comments: [],
      linkedIssues: [],
    },
    analysis: null,
    progress: {
      status: "not_started",
      percentComplete: 0,
      startedAt: null,
      completedAt: null,
      lastWorkedAt: null,
      blockers: [],
    },
    contexts: [],
    apis: [],
    figma: [],
    notes: [],
    mergeRequests: [],
    createdAt: now,
    updatedAt: now,
    jiraSyncedAt: now,
  };
}

// ===== Jira Data Sync =====

export function syncJiraData(issue: TrackedIssue, jiraData: JiraData): void {
  issue.jira = { ...issue.jira, ...jiraData };
  issue.jiraSyncedAt = new Date().toISOString();
}

// ===== Note Helpers =====

export function addNote(issue: TrackedIssue, content: string, category: NoteCategory): AgentNote {
  const note: AgentNote = {
    id: randomUUID(),
    content,
    category,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  issue.notes.push(note);
  return note;
}

export function resolveNote(issue: TrackedIssue, noteId: string): boolean {
  const note = issue.notes.find((n) => n.id === noteId);
  if (!note) return false;
  note.resolvedAt = new Date().toISOString();
  return true;
}

// ===== Merge Request Helpers =====

export interface AddMergeRequestInput {
  iid: number;
  projectPath: string;
  title?: string;
  webUrl?: string;
  state?: MergeRequestState;
  sourceBranch?: string;
  targetBranch?: string;
  isPrimary?: boolean;
}

export function addMergeRequest(issue: TrackedIssue, mr: AddMergeRequestInput): LinkedMergeRequest {
  const existing = issue.mergeRequests.find(
    (m) => m.iid === mr.iid && m.projectPath === mr.projectPath
  );
  if (existing) return existing;

  const linked: LinkedMergeRequest = {
    id: randomUUID(),
    iid: mr.iid,
    projectPath: mr.projectPath,
    title: mr.title ?? "",
    webUrl: mr.webUrl ?? "",
    state: mr.state ?? "opened",
    sourceBranch: mr.sourceBranch ?? "",
    targetBranch: mr.targetBranch ?? "",
    linkedAt: new Date().toISOString(),
    isPrimary: mr.isPrimary ?? false,
  };
  issue.mergeRequests.push(linked);
  return linked;
}

export function updateMergeRequest(
  issue: TrackedIssue,
  mrId: string,
  updates: Partial<Omit<LinkedMergeRequest, "id" | "linkedAt">>
): boolean {
  const mr = issue.mergeRequests.find((m) => m.id === mrId);
  if (!mr) return false;
  Object.assign(mr, updates);
  return true;
}

// ===== API Endpoint Helpers =====

export interface AddApiEndpointInput {
  method: HttpMethod;
  path: string;
  description: string;
  specSource?: string;
  requestSchema?: string;
  responseSchema?: string;
  notes?: string;
}

export function addApiEndpoint(issue: TrackedIssue, api: AddApiEndpointInput): ApiEndpoint {
  const existing = issue.apis.find(
    (a) => a.method === api.method && a.path === api.path
  );
  if (existing) return existing;

  const endpoint: ApiEndpoint = {
    id: randomUUID(),
    method: api.method,
    path: api.path,
    description: api.description,
    specSource: api.specSource ?? null,
    requestSchema: api.requestSchema ?? null,
    responseSchema: api.responseSchema ?? null,
    implemented: false,
    notes: api.notes ?? null,
  };
  issue.apis.push(endpoint);
  return endpoint;
}

export function markApiImplemented(issue: TrackedIssue, apiId: string): boolean {
  const api = issue.apis.find((a) => a.id === apiId);
  if (!api) return false;
  api.implemented = true;
  return true;
}

// ===== Context Helpers =====

export interface AddContextInput {
  type: ContextType;
  path: string;
  description: string;
  relevance: string;
}

export function addContext(issue: TrackedIssue, ctx: AddContextInput): RequiredContext {
  const existing = issue.contexts.find(
    (c) => c.type === ctx.type && c.path === ctx.path
  );
  if (existing) return existing;

  const context: RequiredContext = {
    id: randomUUID(),
    type: ctx.type,
    path: ctx.path,
    description: ctx.description,
    relevance: ctx.relevance,
    reviewed: false,
  };
  issue.contexts.push(context);
  return context;
}

export function markContextReviewed(issue: TrackedIssue, contextId: string): boolean {
  const ctx = issue.contexts.find((c) => c.id === contextId);
  if (!ctx) return false;
  ctx.reviewed = true;
  return true;
}

// ===== Figma Helpers =====

export interface AddFigmaInput {
  url: string;
  name: string;
  nodeId?: string;
  description?: string;
}

export function addFigma(issue: TrackedIssue, figma: AddFigmaInput): FigmaReference {
  const existing = issue.figma.find((f) => f.url === figma.url);
  if (existing) return existing;

  const ref: FigmaReference = {
    id: randomUUID(),
    url: figma.url,
    name: figma.name,
    nodeId: figma.nodeId ?? null,
    description: figma.description ?? null,
    implemented: false,
    lastSynced: null,
  };
  issue.figma.push(ref);
  return ref;
}

export function markFigmaImplemented(issue: TrackedIssue, figmaId: string): boolean {
  const fig = issue.figma.find((f) => f.id === figmaId);
  if (!fig) return false;
  fig.implemented = true;
  return true;
}

// ===== Progress Helpers =====

export function updateProgress(
  issue: TrackedIssue,
  updates: Pick<Partial<IssueProgress>, "status" | "percentComplete" | "blockers">
): void {
  const now = new Date().toISOString();

  if (updates.status === "in_progress" && issue.progress.status === "not_started") {
    issue.progress.startedAt = now;
  }
  if (updates.status === "completed") {
    issue.progress.completedAt = now;
    issue.progress.percentComplete = 100;
  }
  if (updates.status && updates.status !== "not_started") {
    issue.progress.lastWorkedAt = now;
  }

  if (updates.status !== undefined) issue.progress.status = updates.status;
  if (updates.percentComplete !== undefined) issue.progress.percentComplete = updates.percentComplete;
  if (updates.blockers !== undefined) issue.progress.blockers = updates.blockers;
}

/**
 * Adds a blocker string and sets status to "blocked".
 * The previous status is stored so it can be restored when blockers are cleared.
 */
export function addBlocker(issue: TrackedIssue, blocker: string): void {
  issue.progress.blockers.push(blocker);
  if (issue.progress.status !== "blocked") {
    issue.progress.statusBeforeBlocked = issue.progress.status;
    issue.progress.status = "blocked";
  }
}

/**
 * Clears all blockers and restores the status that was active before blocking.
 * Falls back to "in_progress" if no previous status was stored.
 */
export function clearBlockers(issue: TrackedIssue): void {
  issue.progress.blockers = [];
  if (issue.progress.status === "blocked") {
    issue.progress.status = issue.progress.statusBeforeBlocked ?? "in_progress";
    issue.progress.statusBeforeBlocked = null;
  }
}

// ===== Analysis Helpers =====

export function createEmptyAnalysis(rawDescription: string | null): RequirementsAnalysis {
  return {
    summary: "",
    requirements: [],
    acceptanceCriteria: [],
    outOfScope: [],
    assumptions: [],
    analyzedAt: new Date().toISOString(),
    rawDescription,
  };
}

export function setAnalysis(
  issue: TrackedIssue,
  summary: string,
  options?: {
    acceptanceCriteria?: string[];
    outOfScope?: string[];
    assumptions?: string[];
  }
): void {
  if (!issue.analysis) {
    issue.analysis = createEmptyAnalysis(issue.jira.description);
  }
  issue.analysis.summary = summary;
  issue.analysis.analyzedAt = new Date().toISOString();

  if (options?.acceptanceCriteria) {
    issue.analysis.acceptanceCriteria = options.acceptanceCriteria;
  }
  if (options?.outOfScope) {
    issue.analysis.outOfScope = options.outOfScope;
  }
  if (options?.assumptions) {
    issue.analysis.assumptions = options.assumptions;
  }
}

export interface AddRequirementInput {
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
}

export function addRequirement(issue: TrackedIssue, req: AddRequirementInput): AnalyzedRequirement {
  if (!issue.analysis) {
    issue.analysis = createEmptyAnalysis(issue.jira.description);
  }

  const requirement: AnalyzedRequirement = {
    id: randomUUID(),
    title: req.title,
    description: req.description,
    type: req.type,
    priority: req.priority,
    completed: false,
    notes: null,
  };
  issue.analysis.requirements.push(requirement);
  return requirement;
}

export function markRequirementCompleted(issue: TrackedIssue, requirementId: string): boolean {
  if (!issue.analysis) return false;
  const req = issue.analysis.requirements.find((r) => r.id === requirementId);
  if (!req) return false;
  req.completed = true;
  return true;
}
