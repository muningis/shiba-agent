import { Version3Client } from "jira.js";
import { errorResponse } from "../output/json.js";
import { loadGlobalConfig, getConfigPath } from "../config/global.js";

let _client: Version3Client | null = null;

/**
 * Returns an authenticated Jira Cloud REST v3 client.
 * Reads jira.host, jira.email, and jira.token from ~/.shiba-agent/config.json.
 * Caches the client for reuse within a single CLI invocation.
 */
export function getJiraClient(): Version3Client {
  if (_client) return _client;

  const config = loadGlobalConfig();
  const host = config.jira?.host;
  const email = config.jira?.email;
  const token = config.jira?.token;

  if (!host) {
    errorResponse("MISSING_CONFIG", "Jira host not configured.", {
      hint: `Add jira.host to ${getConfigPath()}`,
    });
  }

  if (!email) {
    errorResponse("MISSING_CONFIG", "Jira email not configured.", {
      hint: `Add jira.email to ${getConfigPath()}`,
    });
  }

  if (!token) {
    errorResponse("MISSING_CONFIG", "Jira token not configured.", {
      hint: `Add jira.token to ${getConfigPath()}`,
    });
  }

  _client = new Version3Client({
    host,
    authentication: {
      basic: { email, apiToken: token },
    },
  });

  return _client;
}
