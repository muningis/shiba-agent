// Shared preference types used by both global and project config

export interface BranchNamingConfig {
  pattern: string; // e.g., "{key}/{description}" or "feature/{key}"
  // Available placeholders: {key}, {description}, {type}
}

export interface CommitMessageConfig {
  style: "conventional" | "custom";
  // Conventional: "feat(scope): description"
  // Custom uses template below
  template?: string; // e.g., "[{key}] {description}"
  // Available placeholders: {key}, {type}, {scope}, {description}
}

export interface SignatureConfig {
  shibaSignature: boolean; // Default: false
  // When true, adds: "🐕 Shiba Agent" after co-author line
}

export interface WorkflowTransitionsConfig {
  onBranchCreate?: string; // Default: "In Progress"
  onMrCreate?: string; // Default: "Peer Review"
  onMerge?: string; // Default: "Ready for QA"
}

export interface WorkflowConfig {
  enabled: boolean;
  transitions?: WorkflowTransitionsConfig;
}

export interface ShibaPreferences {
  defaultJql?: string;
  branchNaming?: BranchNamingConfig;
  commitMessage?: CommitMessageConfig;
  signatures?: SignatureConfig;
  workflow?: WorkflowConfig;
}

// Defaults
export const DEFAULT_BRANCH_PATTERN = "{key}/{description}";
export const DEFAULT_COMMIT_STYLE: CommitMessageConfig["style"] = "conventional";
export const DEFAULT_SHIBA_SIGNATURE = false;
export const DEFAULT_WORKFLOW_ENABLED = false;
export const DEFAULT_WORKFLOW_TRANSITIONS: Required<WorkflowTransitionsConfig> = {
  onBranchCreate: "In Progress",
  onMrCreate: "Peer Review",
  onMerge: "Ready for QA",
};

// Helper to get default preferences
export function getDefaultPreferences(): Required<ShibaPreferences> {
  return {
    defaultJql: "assignee = currentUser() AND status != Done",
    branchNaming: { pattern: DEFAULT_BRANCH_PATTERN },
    commitMessage: { style: DEFAULT_COMMIT_STYLE },
    signatures: { shibaSignature: DEFAULT_SHIBA_SIGNATURE },
    workflow: { enabled: DEFAULT_WORKFLOW_ENABLED, transitions: DEFAULT_WORKFLOW_TRANSITIONS },
  };
}
