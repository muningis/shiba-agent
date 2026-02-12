import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { successResponse, errorResponse } from "@shiba-agent/shared";
import {
  getProjectConfigPath,
  getConfigDir,
  saveProjectConfig,
  ensureProjectDirs,
  type ProjectConfig,
} from "../config/project.js";

interface InitOpts {
  force?: boolean;
}

export async function init(opts: InitOpts): Promise<void> {
  const configPath = getProjectConfigPath();

  // Check if config already exists
  if (existsSync(configPath) && !opts.force) {
    errorResponse("CONFIG_EXISTS", ".shiba/config.json already exists. Use --force to overwrite.", {
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

  // Create .shiba/ directory structure
  ensureProjectDirs();

  // Save config
  saveProjectConfig(config);

  // Add .shiba/tasks/ to .gitignore if not present
  updateGitignore();

  successResponse({
    message: "Initialized .shiba/config.json",
    config,
    path: configPath,
    configDir: getConfigDir(),
  });
}

function updateGitignore(): void {
  const gitignorePath = ".gitignore";
  const tasksPattern = ".shiba/tasks/";

  let content = "";
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, "utf-8");
  }

  // Check if already present
  if (content.includes(tasksPattern)) {
    return;
  }

  // Append to gitignore
  const newContent = content.endsWith("\n") || content === ""
    ? content + tasksPattern + "\n"
    : content + "\n" + tasksPattern + "\n";

  writeFileSync(gitignorePath, newContent);
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
