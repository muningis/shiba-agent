import { Gitlab } from "@gitbeaker/rest";
import { errorResponse } from "../output/json.js";

let _client: InstanceType<typeof Gitlab> | null = null;

/**
 * Returns an authenticated Gitbeaker client.
 * Reads GITLAB_HOST and GITLAB_TOKEN from environment.
 * Caches the client for reuse within a single CLI invocation.
 */
export function getGitlabClient(): InstanceType<typeof Gitlab> {
  if (_client) return _client;

  const host = process.env.GITLAB_HOST;
  const token = process.env.GITLAB_TOKEN;

  if (!host) {
    errorResponse("MISSING_ENV", "GITLAB_HOST environment variable is not set.", {
      hint: "Export it: export GITLAB_HOST=https://gitlab.example.com",
    });
  }

  if (!token) {
    errorResponse("MISSING_ENV", "GITLAB_TOKEN environment variable is not set.", {
      hint: "Create a personal access token at $GITLAB_HOST/-/user_settings/personal_access_tokens with 'api' scope.",
    });
  }

  _client = new Gitlab({ host, token });
  return _client;
}
