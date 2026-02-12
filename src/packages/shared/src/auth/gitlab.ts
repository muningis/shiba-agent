import { Gitlab } from "@gitbeaker/rest";
import { errorResponse } from "../output/json.js";
import { loadGlobalConfig, getConfigPath } from "../config/global.js";

let _client: InstanceType<typeof Gitlab> | null = null;

/**
 * Returns an authenticated Gitbeaker client.
 * Reads gitlab.host and gitlab.token from ~/.shiba-agent/config.json.
 * Caches the client for reuse within a single CLI invocation.
 */
export function getGitlabClient(): InstanceType<typeof Gitlab> {
  if (_client) return _client;

  const config = loadGlobalConfig();
  const host = config.gitlab?.host;
  const token = config.gitlab?.token;

  if (!host) {
    errorResponse("MISSING_CONFIG", "GitLab host not configured.", {
      hint: `Add gitlab.host to ${getConfigPath()}`,
    });
  }

  if (!token) {
    errorResponse("MISSING_CONFIG", "GitLab token not configured.", {
      hint: `Add gitlab.token to ${getConfigPath()}`,
    });
  }

  _client = new Gitlab({ host, token });
  return _client;
}
