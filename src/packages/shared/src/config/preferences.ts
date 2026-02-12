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

export interface ShibaPreferences {
  defaultJql?: string;
  branchNaming?: BranchNamingConfig;
  commitMessage?: CommitMessageConfig;
  signatures?: SignatureConfig;
}

// Defaults
export const DEFAULT_BRANCH_PATTERN = "{key}/{description}";
export const DEFAULT_COMMIT_STYLE: CommitMessageConfig["style"] = "conventional";
export const DEFAULT_SHIBA_SIGNATURE = false;

// Helper to get default preferences
export function getDefaultPreferences(): Required<ShibaPreferences> {
  return {
    defaultJql: "assignee = currentUser() AND status != Done",
    branchNaming: { pattern: DEFAULT_BRANCH_PATTERN },
    commitMessage: { style: DEFAULT_COMMIT_STYLE },
    signatures: { shibaSignature: DEFAULT_SHIBA_SIGNATURE },
  };
}
