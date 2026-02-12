import React from "react";
import { render } from "ink";
import {
  errorResponse,
  ensureConfigDir,
  loadGlobalConfig,
  getConfigPath,
} from "@shiba-agent/shared";
import { App } from "../tui/App.js";

export async function tui(): Promise<void> {
  // Ensure config directory exists
  ensureConfigDir();

  // Load global config
  const config = loadGlobalConfig();

  // Check for required Jira credentials
  const jiraHost = config.jira?.host;
  const jiraEmail = config.jira?.email;
  const jiraToken = config.jira?.token;

  if (!jiraHost || !jiraEmail || !jiraToken) {
    errorResponse("MISSING_CONFIG", "Jira credentials not configured.", {
      hint: `Add jira.host, jira.email, and jira.token to ${getConfigPath()}`,
      missing: [
        !jiraHost && "jira.host",
        !jiraEmail && "jira.email",
        !jiraToken && "jira.token",
      ].filter(Boolean),
    });
  }

  // Launch TUI
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}
