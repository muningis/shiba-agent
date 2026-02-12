import { Version3Client } from "jira.js";
import { errorResponse } from "../output/json.js";

let _client: Version3Client | null = null;

/**
 * Returns an authenticated Jira Cloud REST v3 client.
 * Reads JIRA_HOST, JIRA_EMAIL, and JIRA_TOKEN from environment.
 * Caches the client for reuse within a single CLI invocation.
 */
export function getJiraClient(): Version3Client {
  if (_client) return _client;

  const host = process.env.JIRA_HOST;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_TOKEN;

  if (!host) {
    errorResponse("MISSING_ENV", "JIRA_HOST environment variable is not set.", {
      hint: "Export it: export JIRA_HOST=https://your-domain.atlassian.net",
    });
  }

  if (!email) {
    errorResponse("MISSING_ENV", "JIRA_EMAIL environment variable is not set.", {
      hint: "Use your Atlassian account email.",
    });
  }

  if (!token) {
    errorResponse("MISSING_ENV", "JIRA_TOKEN environment variable is not set.", {
      hint: "Create an API token at https://id.atlassian.com/manage/api-tokens",
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
