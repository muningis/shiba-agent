import React from "react";
import { render } from "ink";
import { ensureConfigDir } from "@shiba-agent/shared";
import { App } from "../tui/App.js";

export async function tui(): Promise<void> {
  // Ensure config directory exists
  ensureConfigDir();

  // Launch TUI - jira-cli handles authentication
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}
