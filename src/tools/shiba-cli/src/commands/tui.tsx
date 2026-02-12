import React from "react";
import { render } from "ink";
import { errorResponse } from "@shiba-agent/shared";
import { ensureGlobalConfigDir, loadGlobalConfig } from "../config/global.js";
import { App } from "../tui/App.js";

export async function tui(): Promise<void> {
  // Ensure config directory exists
  ensureGlobalConfigDir();

  // Load global config
  const config = loadGlobalConfig();

  // Check for required Jira credentials in env vars or config
  const jiraHost = process.env.JIRA_HOST ?? config.jira?.host;
  const jiraEmail = process.env.JIRA_EMAIL ?? config.jira?.email;
  const jiraToken = process.env.JIRA_TOKEN ?? config.jira?.token;

  if (!jiraHost || !jiraEmail || !jiraToken) {
    errorResponse("MISSING_CREDENTIALS", "Jira credentials not configured.", {
      hint: "Set JIRA_HOST, JIRA_EMAIL, JIRA_TOKEN environment variables.",
      missing: [
        !jiraHost && "JIRA_HOST",
        !jiraEmail && "JIRA_EMAIL",
        !jiraToken && "JIRA_TOKEN",
      ].filter(Boolean),
    });
  }

  // Launch TUI
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}
