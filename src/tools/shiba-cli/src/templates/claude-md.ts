export const SHIBA_SECTION_START = "<!-- shiba-agent:start -->";
export const SHIBA_SECTION_END = "<!-- shiba-agent:end -->";

export type Platform = "github" | "gitlab" | "both";

export interface ClaudeMdOptions {
  platform: Platform;
  issueTracker: "jira" | "github" | "gitlab";
  repository: string;
}

export function generateShibaSection(opts: ClaudeMdOptions): string {
  const lines: string[] = [
    SHIBA_SECTION_START,
    "",
    "# Shiba Agent",
    "",
    "This project uses **shiba-agent** for VCS and issue tracking operations.",
    "",
    "## Important",
    "",
  ];

  if (opts.platform === "github" || opts.platform === "both") {
    lines.push(
      "- **Do NOT use `gh` directly** — use `shiba github` commands instead"
    );
  }
  if (opts.platform === "gitlab" || opts.platform === "both") {
    lines.push(
      "- **Do NOT use `glab` directly** — use `shiba gitlab` commands instead"
    );
  }
  lines.push(
    "- Use the shiba specialist agents (listed below) for complex operations"
  );

  lines.push("", "## Available Agents", "");

  const agents: { name: string; description: string }[] = [];

  if (opts.platform === "github" || opts.platform === "both") {
    agents.push({
      name: "github-agent",
      description: "Pull requests, issues, code review",
    });
  }
  if (opts.platform === "gitlab" || opts.platform === "both") {
    agents.push({
      name: "gitlab-agent",
      description: "Merge requests, pipelines, code review",
    });
  }
  if (opts.issueTracker === "jira") {
    agents.push({
      name: "jira-agent",
      description: "Jira issues, transitions, JQL search",
    });
  }
  agents.push(
    {
      name: "oapi-agent",
      description: "OpenAPI endpoint discovery and schema analysis",
    },
    {
      name: "project-manager",
      description: "Orchestrates cross-system workflows",
    },
    {
      name: "task-agent",
      description: "Full task implementation from Jira tickets",
    }
  );

  for (const agent of agents) {
    lines.push(`- **${agent.name}** — ${agent.description}`);
  }

  lines.push("", "## Quick Reference", "");
  lines.push("```bash");
  lines.push("# Project setup");
  lines.push("shiba init              # Detect repo and create .shiba/config.json");
  lines.push("");

  if (opts.platform === "github" || opts.platform === "both") {
    lines.push("# GitHub");
    lines.push("shiba github pr-create  --title \"...\" --body \"...\"");
    lines.push("shiba github pr-list");
    lines.push("shiba github pr-merge   --number 123");
    lines.push("shiba github issue-list");
    lines.push("");
  }

  if (opts.platform === "gitlab" || opts.platform === "both") {
    lines.push("# GitLab");
    lines.push(
      `shiba gitlab mr-create  --project ${opts.repository} --source feat --target main --title "..."`
    );
    lines.push(`shiba gitlab mr-list    --project ${opts.repository}`);
    lines.push(
      `shiba gitlab mr-merge   --project ${opts.repository} --iid 123`
    );
    lines.push(`shiba gitlab issue-list --project ${opts.repository}`);
    lines.push("");
  }

  if (opts.issueTracker === "jira") {
    lines.push("# Jira");
    lines.push("shiba jira issue-get    --key PROJ-123");
    lines.push('shiba jira issue-search --jql "assignee = currentUser()"');
    lines.push("shiba jira issue-transition --key PROJ-123 --transition \"In Progress\"");
    lines.push("");
  }

  lines.push("# Branching & commits");
  lines.push("shiba branch create     --key PROJ-123 --description \"short-desc\"");
  lines.push('shiba commit-msg        --type feat --description "add feature"');
  lines.push("```");

  lines.push("", SHIBA_SECTION_END, "");

  return lines.join("\n");
}
