import { withRetry } from "../http/retry.js";
import { loadGlobalConfig, type JiraConfig } from "../config/global.js";
import type {
  JiraIssue,
  JiraTransition,
  JiraSearchResult,
  JiraUser,
  CreateIssueData,
  CreateIssueResponse,
  AdfDocument,
} from "./types.js";

export interface JiraClientConfig {
  host: string;
  email: string;
  token: string;
}

export class JiraApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown,
  ) {
    super(`Jira API error: ${status} ${statusText}`);
    this.name = "JiraApiError";
  }
}

/**
 * Get Jira config from global config or environment variables.
 * Environment variables take precedence.
 */
export function getJiraConfig(): JiraClientConfig {
  const config = loadGlobalConfig();

  const host = process.env.JIRA_HOST || config.jira?.host;
  const email = process.env.JIRA_EMAIL || config.jira?.email;
  const token = process.env.JIRA_API_TOKEN || config.jira?.token;

  const fallbackHint = "\n\nAlternatives:\n- 'shiba github issue-*' for GitHub Issues\n- 'shiba gitlab issue-*' for GitLab Issues";

  if (!host) {
    throw new Error(
      `Jira host not configured. Set JIRA_HOST env var or run 'shiba setup'.${fallbackHint}`,
    );
  }
  if (!email) {
    throw new Error(
      `Jira email not configured. Set JIRA_EMAIL env var or run 'shiba setup'.${fallbackHint}`,
    );
  }
  if (!token) {
    throw new Error(
      `Jira API token not configured. Set JIRA_API_TOKEN env var or run 'shiba setup'.${fallbackHint}`,
    );
  }

  return { host, email, token };
}

/**
 * Create a Jira REST API v3 client.
 */
export function createJiraClient(config: JiraClientConfig) {
  // Normalize host URL (remove trailing slash)
  const baseUrl = `${config.host.replace(/\/$/, "")}/rest/api/3`;
  const auth = Buffer.from(`${config.email}:${config.token}`).toString(
    "base64",
  );

  async function request<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${baseUrl}${path}`;

    const response = await withRetry(
      () =>
        fetch(url, {
          ...options,
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...options?.headers,
          },
        }),
      `Jira ${options?.method || "GET"} ${path}`,
    );

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = await response.text();
      }
      throw new JiraApiError(response.status, response.statusText, body);
    }

    // Some endpoints return empty body (204)
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  return {
    /**
     * Get issue details with comments.
     */
    getIssue: (key: string, expand = "comment") =>
      request<JiraIssue>(
        `/issue/${key}?expand=${expand}&fields=*all`,
      ),

    /**
     * Create a new issue.
     */
    createIssue: (data: CreateIssueData) =>
      request<CreateIssueResponse>("/issue", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    /**
     * Get available transitions for an issue.
     */
    getTransitions: (key: string) =>
      request<{ transitions: JiraTransition[] }>(
        `/issue/${key}/transitions`,
      ),

    /**
     * Transition an issue to a new status.
     */
    doTransition: (key: string, transitionId: string) =>
      request<void>(`/issue/${key}/transitions`, {
        method: "POST",
        body: JSON.stringify({ transition: { id: transitionId } }),
      }),

    /**
     * Add a comment to an issue (using ADF format).
     */
    addComment: (key: string, body: string) => {
      const adfBody: AdfDocument = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: body }],
          },
        ],
      };

      return request<{ id: string }>(`/issue/${key}/comment`, {
        method: "POST",
        body: JSON.stringify({ body: adfBody }),
      });
    },

    /**
     * Search issues using JQL.
     */
    searchJql: (jql: string, maxResults = 50, startAt = 0) =>
      request<JiraSearchResult>(
        `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=*all`,
      ),

    /**
     * Assign an issue to a user.
     * Pass null to unassign.
     */
    assignIssue: (key: string, accountId: string | null) =>
      request<void>(`/issue/${key}/assignee`, {
        method: "PUT",
        body: JSON.stringify({ accountId }),
      }),

    /**
     * Get current user info.
     */
    getMyself: () => request<JiraUser>("/myself"),

    /**
     * Search for users (for assignee lookup).
     */
    searchUsers: (query: string) =>
      request<JiraUser[]>(
        `/user/search?query=${encodeURIComponent(query)}&maxResults=10`,
      ),
  };
}

export type JiraClient = ReturnType<typeof createJiraClient>;
