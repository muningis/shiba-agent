import { execSync } from "child_process";
import { existsSync } from "fs";
import { successResponse, errorResponse } from "@shiba-agent/shared";
import { getProjectConfigPath, saveProjectConfig, type ProjectConfig } from "../config/project.js";

interface InitOpts {
  force?: boolean;
}

export async function init(opts: InitOpts): Promise<void> {
  const configPath = getProjectConfigPath();

  // Check if config already exists
  if (existsSync(configPath) && !opts.force) {
    errorResponse("CONFIG_EXISTS", ".shiba.json already exists. Use --force to overwrite.", {
      path: configPath,
    });
  }

  // Detect git remote
  const repository = detectGitlabProject();

  if (!repository) {
    errorResponse("NO_GIT_REMOTE", "Could not detect GitLab project from git remote origin.", {
      hint: "Ensure you have a git remote named 'origin' pointing to GitLab.",
    });
  }

  const config: ProjectConfig = { repository };

  saveProjectConfig(config);

  successResponse({
    message: "Initialized .shiba.json",
    config,
    path: configPath,
  });
}

function detectGitlabProject(): string | null {
  try {
    // Get remote URL
    const remoteUrl = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();

    // Parse GitLab project path from various URL formats:
    // - https://gitlab.example.com/group/subgroup/project.git
    // - git@gitlab.example.com:group/subgroup/project.git
    // - ssh://git@gitlab.example.com/group/project.git

    let projectPath: string | null = null;

    // HTTPS format
    const httpsMatch = remoteUrl.match(/https?:\/\/[^/]+\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      projectPath = httpsMatch[1];
    }

    // SSH format (git@host:path)
    const sshMatch = remoteUrl.match(/git@[^:]+:(.+?)(?:\.git)?$/);
    if (sshMatch) {
      projectPath = sshMatch[1];
    }

    // SSH format (ssh://git@host/path)
    const sshUrlMatch = remoteUrl.match(/ssh:\/\/[^/]+\/(.+?)(?:\.git)?$/);
    if (sshUrlMatch) {
      projectPath = sshUrlMatch[1];
    }

    // Remove trailing .git if present
    if (projectPath?.endsWith(".git")) {
      projectPath = projectPath.slice(0, -4);
    }

    return projectPath;
  } catch {
    return null;
  }
}
