import { loadGlobalConfig, type ShibaPreferences, getDefaultPreferences } from "@shiba-agent/shared";
import { loadProjectConfig } from "./project.js";

/**
 * Get effective preferences by merging:
 * 1. Built-in defaults (lowest priority)
 * 2. Global config (~/.shiba-agent/config/config.json)
 * 3. Project config (.shiba/config.json) (highest priority)
 */
export function getEffectivePreferences(cwd: string = process.cwd()): Required<ShibaPreferences> {
  const defaults = getDefaultPreferences();
  const globalConfig = loadGlobalConfig();
  const projectConfig = loadProjectConfig(cwd);

  // Deep merge preferences
  return {
    defaultJql: projectConfig?.preferences?.defaultJql ?? globalConfig.preferences?.defaultJql ?? defaults.defaultJql,
    branchNaming: {
      pattern:
        projectConfig?.preferences?.branchNaming?.pattern ??
        globalConfig.preferences?.branchNaming?.pattern ??
        defaults.branchNaming.pattern,
    },
    commitMessage: {
      style:
        projectConfig?.preferences?.commitMessage?.style ??
        globalConfig.preferences?.commitMessage?.style ??
        defaults.commitMessage.style,
      template:
        projectConfig?.preferences?.commitMessage?.template ?? globalConfig.preferences?.commitMessage?.template,
    },
    signatures: {
      shibaSignature:
        projectConfig?.preferences?.signatures?.shibaSignature ??
        globalConfig.preferences?.signatures?.shibaSignature ??
        defaults.signatures.shibaSignature,
    },
    workflow: {
      enabled:
        projectConfig?.preferences?.workflow?.enabled ??
        globalConfig.preferences?.workflow?.enabled ??
        defaults.workflow.enabled,
      transitions: {
        onBranchCreate:
          projectConfig?.preferences?.workflow?.transitions?.onBranchCreate ??
          globalConfig.preferences?.workflow?.transitions?.onBranchCreate ??
          defaults.workflow.transitions?.onBranchCreate ?? "In Progress",
        onMrCreate:
          projectConfig?.preferences?.workflow?.transitions?.onMrCreate ??
          globalConfig.preferences?.workflow?.transitions?.onMrCreate ??
          defaults.workflow.transitions?.onMrCreate ?? "Peer Review",
        onMerge:
          projectConfig?.preferences?.workflow?.transitions?.onMerge ??
          globalConfig.preferences?.workflow?.transitions?.onMerge ??
          defaults.workflow.transitions?.onMerge ?? "Ready for QA",
      },
    },
  };
}

/**
 * Slugify a string for use in branch names
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Trim hyphens from start/end
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Interpolate placeholders in a template string
 * Available placeholders: {key}, {description}, {type}, {scope}
 */
export function interpolateTemplate(
  template: string,
  values: { key?: string; description?: string; type?: string; scope?: string }
): string {
  let result = template;

  if (values.key) {
    result = result.replace(/{key}/g, values.key);
  }
  if (values.description) {
    result = result.replace(/{description}/g, slugify(values.description));
  }
  if (values.type) {
    result = result.replace(/{type}/g, values.type);
  }
  if (values.scope) {
    result = result.replace(/{scope}/g, values.scope);
  }

  return result;
}

/**
 * Generate a branch name from the configured pattern
 */
export function generateBranchName(opts: { key: string; description?: string; type?: string }): string {
  const prefs = getEffectivePreferences();
  return interpolateTemplate(prefs.branchNaming.pattern, opts);
}

/**
 * Generate a commit message based on style (conventional or custom)
 */
export function generateCommitMessage(opts: {
  type: string;
  description: string;
  key?: string;
  scope?: string;
}): string {
  const prefs = getEffectivePreferences();

  if (prefs.commitMessage.style === "conventional") {
    // Conventional: type(scope): description
    const scopePart = opts.scope ? `(${opts.scope})` : opts.key ? `(${opts.key})` : "";
    return `${opts.type}${scopePart}: ${opts.description}`;
  }

  // Custom template
  if (prefs.commitMessage.template) {
    return interpolateTemplate(prefs.commitMessage.template, opts);
  }

  // Fallback to conventional if no template
  const scopePart = opts.scope ? `(${opts.scope})` : opts.key ? `(${opts.key})` : "";
  return `${opts.type}${scopePart}: ${opts.description}`;
}

/**
 * Append signature to comment body
 */
export function appendCommentSignature(body: string): string {
  const prefs = getEffectivePreferences();
  const lines = [body, "", "---", "Co-Authored-By: Shiba Agent"];

  if (prefs.signatures.shibaSignature) {
    lines.push("🐕 Shiba Agent");
  }

  return lines.join("\n");
}
