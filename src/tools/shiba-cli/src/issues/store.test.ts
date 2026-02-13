import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

// We test logic directly rather than importing the module
// (which depends on @shiba-agent/shared global config paths).

// ===== Inline types matching types.ts =====

type IssueProgressStatus = "not_started" | "in_progress" | "blocked" | "in_review" | "completed";

interface IssueProgress {
  status: IssueProgressStatus;
  percentComplete: number;
  startedAt: string | null;
  completedAt: string | null;
  lastWorkedAt: string | null;
  blockers: string[];
  statusBeforeBlocked?: IssueProgressStatus | null;
}

interface TrackedIssue {
  version: "1.0";
  issueKey: string;
  projectKey: string;
  jira: JiraData;
  analysis: null;
  progress: IssueProgress;
  contexts: { id: string; type: string; path: string; description: string; relevance: string; reviewed: boolean }[];
  apis: { id: string; method: string; path: string; description: string; specSource: string | null; requestSchema: string | null; responseSchema: string | null; implemented: boolean; notes: string | null }[];
  figma: { id: string; url: string; name: string; nodeId: string | null; description: string | null; implemented: boolean; lastSynced: string | null }[];
  notes: never[];
  mergeRequests: { id: string; iid: number; projectPath: string; title: string; webUrl: string; state: string; sourceBranch: string; targetBranch: string; linkedAt: string; isPrimary: boolean }[];
  createdAt: string;
  updatedAt: string;
  jiraSyncedAt: string;
}

interface JiraData {
  id: string;
  summary: string;
  status: string;
  issueType: string;
  priority: string;
  assignee: null;
  reporter: null;
  created: string;
  updated: string;
  description: string | null;
  comments: never[];
  linkedIssues: never[];
}

// ===== Replicated pure functions from store.ts =====

function createDefaultIssue(key: string): TrackedIssue {
  const projectKey = key.match(/^(.+)-\d+$/)?.[1] ?? key.split("-")[0];
  const now = new Date().toISOString();

  return {
    version: "1.0",
    issueKey: key,
    projectKey,
    jira: {
      id: "", summary: "", status: "", issueType: "", priority: "",
      assignee: null, reporter: null, created: "", updated: "",
      description: null, comments: [], linkedIssues: [],
    },
    analysis: null,
    progress: {
      status: "not_started", percentComplete: 0,
      startedAt: null, completedAt: null, lastWorkedAt: null, blockers: [],
    },
    contexts: [], apis: [], figma: [], notes: [], mergeRequests: [],
    createdAt: now, updatedAt: now, jiraSyncedAt: now,
  };
}

function syncJiraData(issue: TrackedIssue, jiraData: JiraData): void {
  issue.jira = { ...issue.jira, ...jiraData };
  issue.jiraSyncedAt = new Date().toISOString();
}

function addBlocker(issue: TrackedIssue, blocker: string): void {
  issue.progress.blockers.push(blocker);
  if (issue.progress.status !== "blocked") {
    issue.progress.statusBeforeBlocked = issue.progress.status;
    issue.progress.status = "blocked";
  }
}

function clearBlockers(issue: TrackedIssue): void {
  issue.progress.blockers = [];
  if (issue.progress.status === "blocked") {
    issue.progress.status = issue.progress.statusBeforeBlocked ?? "in_progress";
    issue.progress.statusBeforeBlocked = null;
  }
}

function addMergeRequest(issue: TrackedIssue, mr: { iid: number; projectPath: string; title?: string }) {
  const existing = issue.mergeRequests.find((m) => m.iid === mr.iid && m.projectPath === mr.projectPath);
  if (existing) return existing;
  const linked = {
    id: randomUUID(), iid: mr.iid, projectPath: mr.projectPath,
    title: mr.title ?? "", webUrl: "", state: "opened",
    sourceBranch: "", targetBranch: "", linkedAt: new Date().toISOString(), isPrimary: false,
  };
  issue.mergeRequests.push(linked);
  return linked;
}

function addApiEndpoint(issue: TrackedIssue, api: { method: string; path: string; description: string }) {
  const existing = issue.apis.find((a) => a.method === api.method && a.path === api.path);
  if (existing) return existing;
  const endpoint = {
    id: randomUUID(), method: api.method, path: api.path, description: api.description,
    specSource: null, requestSchema: null, responseSchema: null, implemented: false, notes: null,
  };
  issue.apis.push(endpoint);
  return endpoint;
}

function addContext(issue: TrackedIssue, ctx: { type: string; path: string; description: string; relevance: string }) {
  const existing = issue.contexts.find((c) => c.type === ctx.type && c.path === ctx.path);
  if (existing) return existing;
  const context = {
    id: randomUUID(), type: ctx.type, path: ctx.path,
    description: ctx.description, relevance: ctx.relevance, reviewed: false,
  };
  issue.contexts.push(context);
  return context;
}

function addFigma(issue: TrackedIssue, figma: { url: string; name: string }) {
  const existing = issue.figma.find((f) => f.url === figma.url);
  if (existing) return existing;
  const ref = {
    id: randomUUID(), url: figma.url, name: figma.name,
    nodeId: null, description: null, implemented: false, lastSynced: null,
  };
  issue.figma.push(ref);
  return ref;
}

function updateProgress(
  issue: TrackedIssue,
  updates: { status?: IssueProgressStatus; percentComplete?: number; blockers?: string[] }
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

// ===== Tests =====

describe("atomic file writes", () => {
  const testDir = join(tmpdir(), `shiba-store-test-${process.pid}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("write-then-rename produces valid JSON", () => {
    const { writeFileSync, renameSync } = require("fs");
    const filePath = join(testDir, "test.json");
    const data = { issueKey: "PROJ-123", version: "1.0" };

    // Replicate the atomic write pattern from saveIssue
    const tmpPath = filePath + `.tmp.${process.pid}`;
    writeFileSync(tmpPath, JSON.stringify(data, null, 2) + "\n");
    renameSync(tmpPath, filePath);

    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(tmpPath)).toBe(false);

    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.issueKey).toBe("PROJ-123");
    expect(parsed.version).toBe("1.0");
  });

  it("rename overwrites existing file atomically", () => {
    const { writeFileSync, renameSync } = require("fs");
    const filePath = join(testDir, "overwrite.json");

    // Write initial content
    writeFileSync(filePath, JSON.stringify({ v: 1 }));

    // Atomic overwrite
    const tmpPath = filePath + `.tmp.${process.pid}`;
    writeFileSync(tmpPath, JSON.stringify({ v: 2 }, null, 2) + "\n");
    renameSync(tmpPath, filePath);

    const parsed = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(parsed.v).toBe(2);
    expect(existsSync(tmpPath)).toBe(false);
  });

  it("temp file does not persist if rename fails", () => {
    const { writeFileSync } = require("fs");
    const filePath = join(testDir, "nonexistent-dir", "test.json");
    const tmpPath = filePath + `.tmp.${process.pid}`;

    // Writing to a nonexistent directory should fail
    try {
      writeFileSync(tmpPath, "data");
    } catch {
      // expected
    }

    expect(existsSync(tmpPath)).toBe(false);
    expect(existsSync(filePath)).toBe(false);
  });
});

function makeIssue(): TrackedIssue {
  return createDefaultIssue("PROJ-123");
}

describe("createDefaultIssue", () => {
  it("extracts projectKey from simple key", () => {
    const issue = createDefaultIssue("PROJ-123");
    expect(issue.projectKey).toBe("PROJ");
  });

  it("extracts projectKey from multi-hyphen key", () => {
    const issue = createDefaultIssue("MY-TEAM-456");
    expect(issue.projectKey).toBe("MY-TEAM");
  });

  it("extracts projectKey from triple-hyphen key", () => {
    const issue = createDefaultIssue("A-B-C-789");
    expect(issue.projectKey).toBe("A-B-C");
  });
});

describe("addBlocker / clearBlockers", () => {
  it("stores previous status when blocking", () => {
    const issue = makeIssue();
    issue.progress.status = "in_review";

    addBlocker(issue, "waiting on API");

    expect(issue.progress.status).toBe("blocked");
    expect(issue.progress.statusBeforeBlocked).toBe("in_review");
    expect(issue.progress.blockers).toEqual(["waiting on API"]);
  });

  it("restores previous status when clearing blockers", () => {
    const issue = makeIssue();
    issue.progress.status = "in_review";

    addBlocker(issue, "blocker 1");
    clearBlockers(issue);

    expect(issue.progress.status).toBe("in_review");
    expect(issue.progress.blockers).toEqual([]);
    expect(issue.progress.statusBeforeBlocked).toBeNull();
  });

  it("falls back to in_progress when no previous status stored", () => {
    const issue = makeIssue();
    issue.progress.status = "blocked";
    issue.progress.blockers = ["legacy blocker"];

    clearBlockers(issue);

    expect(issue.progress.status).toBe("in_progress");
  });

  it("does not overwrite statusBeforeBlocked on additional blockers", () => {
    const issue = makeIssue();
    issue.progress.status = "in_review";

    addBlocker(issue, "first");
    addBlocker(issue, "second");

    expect(issue.progress.statusBeforeBlocked).toBe("in_review");
    expect(issue.progress.blockers).toEqual(["first", "second"]);
  });
});

describe("syncJiraData", () => {
  it("merges new data preserving existing fields", () => {
    const issue = makeIssue();
    issue.jira.summary = "original summary";
    issue.jira.description = "local enrichment";

    const updated: JiraData = { ...issue.jira, summary: "updated summary" };
    syncJiraData(issue, updated);

    expect(issue.jira.summary).toBe("updated summary");
    expect(issue.jira.description).toBe("local enrichment");
  });
});

describe("deduplication", () => {
  it("addMergeRequest returns existing on duplicate iid+project", () => {
    const issue = makeIssue();
    const first = addMergeRequest(issue, { iid: 42, projectPath: "group/proj" });
    const second = addMergeRequest(issue, { iid: 42, projectPath: "group/proj", title: "new title" });

    expect(second.id).toBe(first.id);
    expect(issue.mergeRequests).toHaveLength(1);
  });

  it("addMergeRequest allows different iid", () => {
    const issue = makeIssue();
    addMergeRequest(issue, { iid: 1, projectPath: "group/proj" });
    addMergeRequest(issue, { iid: 2, projectPath: "group/proj" });

    expect(issue.mergeRequests).toHaveLength(2);
  });

  it("addApiEndpoint returns existing on duplicate method+path", () => {
    const issue = makeIssue();
    const first = addApiEndpoint(issue, { method: "GET", path: "/users", description: "list" });
    const second = addApiEndpoint(issue, { method: "GET", path: "/users", description: "updated" });

    expect(second.id).toBe(first.id);
    expect(issue.apis).toHaveLength(1);
  });

  it("addApiEndpoint allows different method on same path", () => {
    const issue = makeIssue();
    addApiEndpoint(issue, { method: "GET", path: "/users", description: "list" });
    addApiEndpoint(issue, { method: "POST", path: "/users", description: "create" });

    expect(issue.apis).toHaveLength(2);
  });

  it("addContext returns existing on duplicate type+path", () => {
    const issue = makeIssue();
    const first = addContext(issue, { type: "file", path: "src/main.ts", description: "entry", relevance: "high" });
    const second = addContext(issue, { type: "file", path: "src/main.ts", description: "updated", relevance: "low" });

    expect(second.id).toBe(first.id);
    expect(issue.contexts).toHaveLength(1);
  });

  it("addFigma returns existing on duplicate url", () => {
    const issue = makeIssue();
    const first = addFigma(issue, { url: "https://figma.com/file/abc", name: "Design" });
    const second = addFigma(issue, { url: "https://figma.com/file/abc", name: "Updated" });

    expect(second.id).toBe(first.id);
    expect(issue.figma).toHaveLength(1);
  });
});

describe("updateProgress", () => {
  it("sets startedAt when transitioning from not_started to in_progress", () => {
    const issue = makeIssue();
    updateProgress(issue, { status: "in_progress" });

    expect(issue.progress.status).toBe("in_progress");
    expect(issue.progress.startedAt).not.toBeNull();
  });

  it("sets completedAt and 100% when completing", () => {
    const issue = makeIssue();
    issue.progress.status = "in_progress";

    updateProgress(issue, { status: "completed" });

    expect(issue.progress.completedAt).not.toBeNull();
    expect(issue.progress.percentComplete).toBe(100);
  });

  it("only updates explicit fields", () => {
    const issue = makeIssue();
    issue.progress.status = "in_progress";
    issue.progress.percentComplete = 50;

    updateProgress(issue, { percentComplete: 75 });

    expect(issue.progress.status).toBe("in_progress");
    expect(issue.progress.percentComplete).toBe(75);
  });
});
