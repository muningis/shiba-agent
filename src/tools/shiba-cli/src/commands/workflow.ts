import { successResponse, errorResponse, isCliAvailable } from "@shiba-agent/shared";
import { getEffectivePreferences } from "../config/resolve.js";
import { issueTransition } from "./jira.js";

const JIRA_CLI = "jira";

// On MR/PR Create - Transition to Peer Review
export interface OnMrCreateOpts {
  key: string;
  draft?: boolean;
}

export async function workflowOnMrCreate(opts: OnMrCreateOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Issue key is required (--key)");
  }

  // Don't transition for draft MRs
  if (opts.draft) {
    successResponse({
      key: opts.key,
      transitioned: false,
      reason: "Draft MR - skipping transition",
    });
    return;
  }

  const prefs = getEffectivePreferences();

  if (!prefs.workflow.enabled) {
    successResponse({
      key: opts.key,
      transitioned: false,
      reason: "Workflow automation disabled",
    });
    return;
  }

  if (!isCliAvailable(JIRA_CLI)) {
    successResponse({
      key: opts.key,
      transitioned: false,
      reason: "Jira CLI not available",
    });
    return;
  }

  const transition = prefs.workflow.transitions?.onMrCreate ?? "Peer Review";

  try {
    await issueTransition({ key: opts.key, transition });
    successResponse({
      key: opts.key,
      transitioned: true,
      newStatus: transition,
    });
  } catch (err) {
    const error = err as Error;
    errorResponse("TRANSITION_FAILED", error.message || `Failed to transition to "${transition}"`);
  }
}

// On Merge - Transition to Ready for QA
export interface OnMergeOpts {
  key: string;
}

export async function workflowOnMerge(opts: OnMergeOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Issue key is required (--key)");
  }

  const prefs = getEffectivePreferences();

  if (!prefs.workflow.enabled) {
    successResponse({
      key: opts.key,
      transitioned: false,
      reason: "Workflow automation disabled",
    });
    return;
  }

  if (!isCliAvailable(JIRA_CLI)) {
    successResponse({
      key: opts.key,
      transitioned: false,
      reason: "Jira CLI not available",
    });
    return;
  }

  const transition = prefs.workflow.transitions?.onMerge ?? "Ready for QA";

  try {
    await issueTransition({ key: opts.key, transition });
    successResponse({
      key: opts.key,
      transitioned: true,
      newStatus: transition,
    });
  } catch (err) {
    const error = err as Error;
    errorResponse("TRANSITION_FAILED", error.message || `Failed to transition to "${transition}"`);
  }
}

// Status - Show current workflow configuration
export async function workflowStatus(): Promise<void> {
  const prefs = getEffectivePreferences();
  const jiraAvailable = isCliAvailable(JIRA_CLI);

  successResponse({
    enabled: prefs.workflow.enabled,
    jiraCliAvailable: jiraAvailable,
    transitions: prefs.workflow.transitions,
    ready: prefs.workflow.enabled && jiraAvailable,
  });
}
