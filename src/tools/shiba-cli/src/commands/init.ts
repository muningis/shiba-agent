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
import {
  SHIBA_SECTION_START,
  SHIBA_SECTION_END,
  generateShibaSection,
  type Platform,
  type ClaudeMdOptions,
} from "../templates/claude-md.js";

interface InitOpts {
  force?: boolean;
  skipClaudeMd?: boolean;
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
  const remoteUrl = getRemoteUrl();

  if (!remoteUrl) {
    errorResponse("NO_GIT_REMOTE", "Could not detect project from git remote origin.", {
      hint: "Ensure you have a git remote named 'origin'.",
    });
  }

  const repository = parseProjectPath(remoteUrl!);

  if (!repository) {
    errorResponse("NO_GIT_REMOTE", "Could not parse project path from git remote origin.", {
      hint: "Ensure you have a git remote named 'origin' pointing to GitHub or GitLab.",
    });
  }

  const config: ProjectConfig = { repository };

  // Create .shiba/ directory structure
  ensureProjectDirs();

  // Save config
  saveProjectConfig(config);

  // Add .shiba/tasks/ to .gitignore if not present
  updateGitignore();

  // Generate CLAUDE.md
  let claudeMdResult: string = "skipped";
  if (!opts.skipClaudeMd) {
    const platform = detectPlatform(remoteUrl!);
    claudeMdResult = generateAndWriteClaudeMd({
      platform,
      issueTracker: "jira",
      repository: repository!,
    });
  }

  successResponse({
    message: "Initialized .shiba/config.json",
    config,
    path: configPath,
    configDir: getConfigDir(),
    claudeMd: claudeMdResult,
  });
}

function updateGitignore(): void {
  const gitignorePath = ".gitignore";
  const patterns = [".shiba/tasks/"];

  let content = "";
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, "utf-8");
  }

  // Filter to patterns not already in gitignore
  const toAdd = patterns.filter((p) => !content.includes(p));

  if (toAdd.length === 0) {
    return;
  }

  // Append to gitignore
  const newContent =
    content.endsWith("\n") || content === ""
      ? content + toAdd.join("\n") + "\n"
      : content + "\n" + toAdd.join("\n") + "\n";

  writeFileSync(gitignorePath, newContent);
}

function getRemoteUrl(): string | null {
  try {
    return execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

export function detectPlatform(remoteUrl: string): Platform {
  const lower = remoteUrl.toLowerCase();
  if (lower.includes("github")) return "github";
  if (lower.includes("gitlab")) return "gitlab";
  return "both";
}

function parseProjectPath(remoteUrl: string): string | null {
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
}

function generateAndWriteClaudeMd(opts: ClaudeMdOptions): string {
  const claudeMdPath = "CLAUDE.md";
  const section = generateShibaSection(opts);

  if (!existsSync(claudeMdPath)) {
    writeFileSync(claudeMdPath, section);
    return "created";
  }

  const existing = readFileSync(claudeMdPath, "utf-8");
  const startIdx = existing.indexOf(SHIBA_SECTION_START);
  const endIdx = existing.indexOf(SHIBA_SECTION_END);

  // Both markers found — replace section between them
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + SHIBA_SECTION_END.length);
    // Trim trailing newline from after to avoid double newlines
    const trimmedAfter = after.startsWith("\n") ? after.slice(1) : after;
    writeFileSync(claudeMdPath, before + section + trimmedAfter);
    return "updated";
  }

  // No markers (or corrupted — only one marker) — append
  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  writeFileSync(claudeMdPath, existing + separator + section);
  return "appended";
}
