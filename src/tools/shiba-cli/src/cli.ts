#!/usr/bin/env node
import { Command } from "commander";
import { createInterface } from "readline";
import { stdin, stdout } from "process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { handleCliError } from "@shiba-agent/shared";
import { appendIssueSignature } from "./config/resolve.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

function promptInput(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function suggestLabels(title: string): string[] {
  const lower = title.toLowerCase();
  const labels: string[] = [];

  if (/\b(bug|fix|error|crash|broken|issue)\b/.test(lower)) labels.push("bug");
  if (/\b(feat|add|new|implement|support)\b/.test(lower)) labels.push("enhancement");
  if (/\b(doc|readme|comment|docs)\b/.test(lower)) labels.push("documentation");
  if (/\b(test|spec|coverage)\b/.test(lower)) labels.push("test");
  if (/\b(refactor|clean|improve|reorganize)\b/.test(lower)) labels.push("refactor");
  if (/\b(perf|performance|slow|fast|optimize)\b/.test(lower)) labels.push("performance");
  if (/\b(security|vuln|cve|auth)\b/.test(lower)) labels.push("security");
  if (/\b(ci|cd|pipeline|workflow|action)\b/.test(lower)) labels.push("ci/cd");

  return labels;
}
import { init } from "./commands/init.js";
import { tui } from "./commands/tui.js";
import {
  oapiList,
  oapiAdd,
  oapiFetch,
  oapiPath,
  oapiSchema,
  oapiSearch,
  oapiRemove,
} from "./commands/oapi.js";
import {
  mrCreate,
  mrList,
  mrMerge,
  mrComment,
  mrDiscussionList,
  mrDiscussionCreate,
  mrDiscussionReply,
  pipelineStatus,
  pipelineList,
  glIssueGet,
  glIssueCreate,
  glIssueList,
  glIssueComment,
} from "./commands/gitlab.js";
import {
  issueGet,
  issueCreate,
  issueTransition,
  issueComment,
  issueSearch,
  issueAssign,
} from "./commands/jira.js";
import {
  issueList,
  issueShow,
  issueAddNote,
  issueAddMr,
  issueAddApi,
  issueAddContext,
  issueAddFigma,
  issueUpdateProgress,
  issueSetAnalysis,
  issueAddRequirement,
} from "./commands/issue.js";
import { createFigmaCommands } from "./commands/figma.js";
import { configShow, configSet } from "./commands/config.js";
import { branch, branchCreate } from "./commands/branch.js";
import { commitMsg } from "./commands/commit.js";
import {
  prCreate,
  prList,
  prMerge,
  prComment,
  ghIssueGet,
  ghIssueCreate,
  ghIssueList,
  ghIssueComment,
} from "./commands/github.js";
import {
  workflowOnMrCreate,
  workflowOnMerge,
  workflowStatus,
} from "./commands/workflow.js";
import {
  notesAdd,
  notesList,
  notesGet,
  notesQuery,
  notesSummary,
  notesDelete,
  notesClear,
  notesListTickets,
} from "./commands/notes.js";
import {
  envInit,
  envCreate,
  envUse,
  envList,
  envCurrent,
  envDelete,
  envMigrate,
} from "./commands/env.js";
import { setup } from "./commands/setup.js";
import { ask } from "./commands/ask.js";
import { update } from "./commands/update.js";
import {
  worktreeCreate,
  worktreeList,
  worktreePrune,
  worktreeRemove,
} from "./commands/worktree.js";
import {
  teamSetup,
  teamStatus,
  teamList,
  teamShow,
  teamCreate,
  teamEdit,
  teamDelete,
  teamSync,
} from "./commands/team.js";

const program = new Command()
  .name("shiba")
  .description("Shiba Agent CLI - Project setup and task navigation")
  .version(pkg.version);

program
  .command("init")
  .description("Initialize project configuration by detecting repository")
  .option("--force", "Overwrite existing .shiba/config.json", false)
  .option("--skip-claude-md", "Skip CLAUDE.md generation", false)
  .action(async (opts) => {
    try {
      await init({ force: opts.force, skipClaudeMd: opts.skipClaudeMd });
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("setup")
  .description("Interactive setup wizard for environment configuration")
  .option("--reset", "Force reconfigure existing environment")
  .option("--defaults", "Use default values without prompts")
  .option("--skip-auth", "Skip CLI authentication prompts")
  .action(async (opts) => {
    try {
      await setup({ reset: opts.reset, defaults: opts.defaults, skipAuth: opts.skipAuth });
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("tui")
  .description("Launch interactive TUI for navigating issues")
  .action(async () => {
    try {
      await tui();
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("ask <query>")
  .description("Get help on how to use shiba commands")
  .action(async (query) => {
    try {
      await ask({ query });
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("update")
  .description("Pull latest changes and rebuild shiba")
  .action(async () => {
    try {
      await update();
    } catch (err) {
      handleCliError(err);
    }
  });

// OpenAPI commands
const oapi = program
  .command("oapi")
  .description("OpenAPI specification management");

oapi
  .command("list")
  .description("List configured OpenAPI specs")
  .action(async () => {
    try {
      await oapiList();
    } catch (err) {
      handleCliError(err);
    }
  });

oapi
  .command("add")
  .description("Add an OpenAPI spec source")
  .requiredOption("--name <name>", "Spec name")
  .requiredOption("--url <url>", "Spec URL")
  .option("--auth-token <token>", "Authentication token")
  .option("--auth-type <type>", "Auth type: bearer, basic, apikey", "bearer")
  .option("--auth-header <header>", "Header name for apikey auth")
  .action(async (opts) => {
    try {
      await oapiAdd({
        name: opts.name,
        url: opts.url,
        authToken: opts.authToken,
        authType: opts.authType,
        authHeader: opts.authHeader,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

oapi
  .command("fetch")
  .description("Fetch/update OpenAPI specs from their URLs")
  .option("--name <name>", "Spec name to fetch")
  .option("--all", "Fetch all configured specs")
  .action(async (opts) => {
    try {
      await oapiFetch({ name: opts.name, all: opts.all });
    } catch (err) {
      handleCliError(err);
    }
  });

oapi
  .command("path <pattern>")
  .description("Find endpoints by path pattern (supports * glob)")
  .option("--spec <name>", "Spec to search (default: all cached)")
  .action(async (pattern, opts) => {
    try {
      await oapiPath({ pattern, spec: opts.spec });
    } catch (err) {
      handleCliError(err);
    }
  });

oapi
  .command("schema [name]")
  .description("Query schemas/components")
  .option("--list", "List all schema names")
  .option("--spec <name>", "Spec to search (default: all cached)")
  .action(async (name, opts) => {
    try {
      await oapiSchema({ name, list: opts.list, spec: opts.spec });
    } catch (err) {
      handleCliError(err);
    }
  });

oapi
  .command("search <query>")
  .description("Search across paths and schemas")
  .option("--type <type>", "Filter by type: path, schema")
  .option("--spec <name>", "Spec to search (default: all cached)")
  .action(async (query, opts) => {
    try {
      await oapiSearch({ query, type: opts.type, spec: opts.spec });
    } catch (err) {
      handleCliError(err);
    }
  });

oapi
  .command("remove")
  .description("Remove an OpenAPI spec")
  .requiredOption("--name <name>", "Spec name to remove")
  .action(async (opts) => {
    try {
      await oapiRemove({ name: opts.name });
    } catch (err) {
      handleCliError(err);
    }
  });

// GitLab commands
const gitlab = program
  .command("gitlab")
  .description("GitLab operations (merge requests, pipelines)");

gitlab
  .command("mr-create")
  .description("Create a merge request")
  .requiredOption("--project <id>", "Project ID or path (e.g. my-group/my-project)")
  .requiredOption("--source <branch>", "Source branch name")
  .requiredOption("--target <branch>", "Target branch name")
  .requiredOption("--title <title>", "Merge request title")
  .option("--description <text>", "Merge request description")
  .option("--draft", "Create as draft MR", false)
  .option("--assignee-ids <ids>", "Comma-separated assignee user IDs")
  .option("--reviewer-ids <ids>", "Comma-separated reviewer user IDs")
  .option("--labels <labels>", "Comma-separated labels")
  .action(async (opts) => {
    try {
      await mrCreate({
        project: opts.project,
        source: opts.source,
        target: opts.target,
        title: opts.title,
        description: opts.description,
        draft: opts.draft,
        assigneeIds: opts.assigneeIds,
        reviewerIds: opts.reviewerIds,
        labels: opts.labels,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("mr-list")
  .description("List merge requests")
  .requiredOption("--project <id>", "Project ID or path")
  .option("--state <state>", "Filter by state: opened, closed, merged, all", "opened")
  .option("--limit <n>", "Maximum results to return", "20")
  .option("--author <username>", "Filter by author username")
  .option("--assignee <username>", "Filter by assignee username")
  .action(async (opts) => {
    try {
      await mrList({
        project: opts.project,
        state: opts.state,
        limit: opts.limit,
        author: opts.author,
        assignee: opts.assignee,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("mr-merge")
  .description("Merge a merge request")
  .requiredOption("--project <id>", "Project ID or path")
  .requiredOption("--iid <iid>", "Merge request internal ID")
  .option("--squash", "Squash commits when merging", false)
  .option("--delete-branch", "Delete source branch after merge", false)
  .option("--when-pipeline-succeeds", "Merge when pipeline succeeds", false)
  .action(async (opts) => {
    try {
      await mrMerge({
        project: opts.project,
        iid: opts.iid,
        squash: opts.squash,
        deleteBranch: opts.deleteBranch,
        whenPipelineSucceeds: opts.whenPipelineSucceeds,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("mr-comment")
  .description("Add a comment to a merge request (standalone note)")
  .requiredOption("--project <id>", "Project ID or path")
  .requiredOption("--iid <iid>", "Merge request internal ID")
  .requiredOption("--body <text>", "Comment body text")
  .action(async (opts) => {
    try {
      await mrComment({
        project: opts.project,
        iid: opts.iid,
        body: opts.body,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("mr-discussion-list")
  .description("List discussions (threaded comments) on a merge request")
  .requiredOption("--iid <iid>", "Merge request internal ID")
  .option("--project <id>", "Project ID or path")
  .action(async (opts) => {
    try {
      await mrDiscussionList({
        iid: opts.iid,
        project: opts.project,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("mr-discussion-create")
  .description("Start a new discussion thread on a merge request")
  .requiredOption("--iid <iid>", "Merge request internal ID")
  .requiredOption("--body <text>", "Discussion body text")
  .option("--project <id>", "Project ID or path")
  .action(async (opts) => {
    try {
      await mrDiscussionCreate({
        iid: opts.iid,
        body: opts.body,
        project: opts.project,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("mr-discussion-reply")
  .description("Reply to an existing discussion thread")
  .requiredOption("--discussion-id <id>", "Discussion ID to reply to")
  .requiredOption("--body <text>", "Reply body text")
  .option("--project <id>", "Project ID or path")
  .action(async (opts) => {
    try {
      await mrDiscussionReply({
        discussionId: opts.discussionId,
        body: opts.body,
        project: opts.project,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("pipeline-status")
  .description("Get the status of a specific pipeline")
  .requiredOption("--project <id>", "Project ID or path")
  .requiredOption("--pipeline-id <id>", "Pipeline ID")
  .action(async (opts) => {
    try {
      await pipelineStatus({
        project: opts.project,
        pipelineId: opts.pipelineId,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("pipeline-list")
  .description("List recent pipelines")
  .requiredOption("--project <id>", "Project ID or path")
  .option("--ref <branch>", "Filter by branch/tag ref")
  .option("--status <status>", "Filter by status: running, pending, success, failed, canceled")
  .option("--limit <n>", "Maximum results to return", "10")
  .action(async (opts) => {
    try {
      await pipelineList({
        project: opts.project,
        ref: opts.ref,
        status: opts.status,
        limit: opts.limit,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("issue-get")
  .description("Get GitLab issue details")
  .requiredOption("--iid <iid>", "Issue internal ID")
  .option("--project <id>", "Project ID or path")
  .action(async (opts) => {
    try {
      await glIssueGet({
        iid: opts.iid,
        project: opts.project,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("issue-create")
  .description("Create a GitLab issue (interactive if no title provided)")
  .option("--title <title>", "Issue title")
  .option("--description <text>", "Issue description")
  .option("--assignees <users>", "Comma-separated assignee usernames")
  .option("--labels <labels>", "Comma-separated labels")
  .option("--project <id>", "Project ID or path")
  .action(async (opts) => {
    try {
      let title = opts.title;
      let description = opts.description;
      let labels = opts.labels;

      // Interactive prompts if title not provided
      if (!title) {
        title = await promptInput("Issue title: ");
        if (!title.trim()) {
          process.stderr.write("Error: Title is required\n");
          process.exit(1);
        }

        // Suggest labels based on title keywords
        const suggested = suggestLabels(title);

        // Ask for description
        const wantsDesc = await promptInput("Add description? (y/n) [n]: ");
        if (wantsDesc.toLowerCase() === "y" || wantsDesc.toLowerCase() === "yes") {
          description = await promptInput("Description: ");
        }

        // Handle labels with suggestions
        if (suggested.length > 0 && !labels) {
          const useSuggested = await promptInput(
            `Suggested labels: ${suggested.join(", ")}. Use these? (y/n) [y]: `
          );
          if (useSuggested.toLowerCase() !== "n" && useSuggested.toLowerCase() !== "no") {
            labels = suggested.join(",");
          } else {
            labels = await promptInput("Labels (comma-separated, optional): ");
          }
        } else if (!labels) {
          labels = await promptInput("Labels (comma-separated, optional): ");
        }
      }

      await glIssueCreate({
        title,
        description: appendIssueSignature(description ?? ""),
        assignees: opts.assignees,
        labels: labels || undefined,
        project: opts.project,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("issue-list")
  .description("List GitLab issues")
  .option("--state <state>", "Filter by state: open, closed, all", "open")
  .option("--limit <n>", "Maximum results to return", "20")
  .option("--author <username>", "Filter by author")
  .option("--assignee <username>", "Filter by assignee")
  .option("--labels <labels>", "Filter by labels")
  .option("--project <id>", "Project ID or path")
  .action(async (opts) => {
    try {
      await glIssueList({
        state: opts.state,
        limit: opts.limit,
        author: opts.author,
        assignee: opts.assignee,
        labels: opts.labels,
        project: opts.project,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

gitlab
  .command("issue-comment")
  .description("Add a comment to a GitLab issue")
  .requiredOption("--iid <iid>", "Issue internal ID")
  .requiredOption("--body <text>", "Comment body")
  .option("--project <id>", "Project ID or path")
  .action(async (opts) => {
    try {
      await glIssueComment({
        iid: opts.iid,
        body: opts.body,
        project: opts.project,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

// GitHub commands
const github = program
  .command("github")
  .description("GitHub operations (pull requests, issues)");

github
  .command("pr-create")
  .description("Create a pull request")
  .requiredOption("--title <title>", "Pull request title")
  .option("--body <text>", "Pull request body")
  .option("--base <branch>", "Base branch for the PR")
  .option("--head <branch>", "Head branch for the PR")
  .option("--draft", "Create as draft PR", false)
  .option("--assignees <users>", "Comma-separated assignees")
  .option("--reviewers <users>", "Comma-separated reviewers")
  .option("--labels <labels>", "Comma-separated labels")
  .option("--repo <repo>", "Repository in owner/repo format")
  .action(async (opts) => {
    try {
      await prCreate({
        title: opts.title,
        body: opts.body,
        base: opts.base,
        head: opts.head,
        draft: opts.draft,
        assignees: opts.assignees,
        reviewers: opts.reviewers,
        labels: opts.labels,
        repo: opts.repo,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

github
  .command("pr-list")
  .description("List pull requests")
  .option("--state <state>", "Filter by state: open, closed, merged, all", "open")
  .option("--limit <n>", "Maximum results to return", "20")
  .option("--author <username>", "Filter by author")
  .option("--assignee <username>", "Filter by assignee")
  .option("--base <branch>", "Filter by base branch")
  .option("--repo <repo>", "Repository in owner/repo format")
  .action(async (opts) => {
    try {
      await prList({
        state: opts.state,
        limit: opts.limit,
        author: opts.author,
        assignee: opts.assignee,
        base: opts.base,
        repo: opts.repo,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

github
  .command("pr-merge")
  .description("Merge a pull request")
  .requiredOption("--number <n>", "Pull request number")
  .option("--squash", "Squash commits when merging", false)
  .option("--delete-branch", "Delete branch after merge", false)
  .option("--auto", "Enable auto-merge", false)
  .option("--repo <repo>", "Repository in owner/repo format")
  .action(async (opts) => {
    try {
      await prMerge({
        number: opts.number,
        squash: opts.squash,
        deleteBranch: opts.deleteBranch,
        auto: opts.auto,
        repo: opts.repo,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

github
  .command("pr-comment")
  .description("Add a comment to a pull request")
  .requiredOption("--number <n>", "Pull request number")
  .requiredOption("--body <text>", "Comment body")
  .option("--repo <repo>", "Repository in owner/repo format")
  .action(async (opts) => {
    try {
      await prComment({
        number: opts.number,
        body: opts.body,
        repo: opts.repo,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

github
  .command("issue-get")
  .description("Get details of a GitHub issue")
  .requiredOption("--number <n>", "Issue number")
  .option("--repo <repo>", "Repository in owner/repo format")
  .action(async (opts) => {
    try {
      await ghIssueGet({
        number: opts.number,
        repo: opts.repo,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

github
  .command("issue-create")
  .description("Create a GitHub issue (interactive if no title provided)")
  .option("--title <title>", "Issue title")
  .option("--body <text>", "Issue body")
  .option("--assignees <users>", "Comma-separated assignees")
  .option("--labels <labels>", "Comma-separated labels")
  .option("--repo <repo>", "Repository in owner/repo format")
  .action(async (opts) => {
    try {
      let title = opts.title;
      let body = opts.body;
      let labels = opts.labels;

      // Interactive prompts if title not provided
      if (!title) {
        title = await promptInput("Issue title: ");
        if (!title.trim()) {
          process.stderr.write("Error: Title is required\n");
          process.exit(1);
        }

        // Suggest labels based on title keywords
        const suggested = suggestLabels(title);

        // Ask for description
        const wantsBody = await promptInput("Add description? (y/n) [n]: ");
        if (wantsBody.toLowerCase() === "y" || wantsBody.toLowerCase() === "yes") {
          body = await promptInput("Description: ");
        }

        // Handle labels with suggestions
        if (suggested.length > 0 && !labels) {
          const useSuggested = await promptInput(
            `Suggested labels: ${suggested.join(", ")}. Use these? (y/n) [y]: `
          );
          if (useSuggested.toLowerCase() !== "n" && useSuggested.toLowerCase() !== "no") {
            labels = suggested.join(",");
          } else {
            labels = await promptInput("Labels (comma-separated, optional): ");
          }
        } else if (!labels) {
          labels = await promptInput("Labels (comma-separated, optional): ");
        }
      }

      await ghIssueCreate({
        title,
        body: appendIssueSignature(body ?? ""),
        assignees: opts.assignees,
        labels: labels || undefined,
        repo: opts.repo,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

github
  .command("issue-list")
  .description("List GitHub issues")
  .option("--state <state>", "Filter by state: open, closed, all", "open")
  .option("--limit <n>", "Maximum results to return", "20")
  .option("--author <username>", "Filter by author")
  .option("--assignee <username>", "Filter by assignee")
  .option("--labels <labels>", "Filter by labels")
  .option("--repo <repo>", "Repository in owner/repo format")
  .action(async (opts) => {
    try {
      await ghIssueList({
        state: opts.state,
        limit: opts.limit,
        author: opts.author,
        assignee: opts.assignee,
        labels: opts.labels,
        repo: opts.repo,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

github
  .command("issue-comment")
  .description("Add a comment to a GitHub issue")
  .requiredOption("--number <n>", "Issue number")
  .requiredOption("--body <text>", "Comment body")
  .option("--repo <repo>", "Repository in owner/repo format")
  .action(async (opts) => {
    try {
      await ghIssueComment({
        number: opts.number,
        body: opts.body,
        repo: opts.repo,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

// Jira commands
const jira = program
  .command("jira")
  .description("Jira operations (issues, transitions)");

jira
  .command("issue-get")
  .description("Get details of a Jira issue")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .option("--no-track", "Skip creating/updating local issue tracking file")
  .action(async (opts) => {
    try {
      await issueGet({
        key: opts.key,
        noTrack: !opts.track,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

jira
  .command("issue-create")
  .description("Create a new Jira issue")
  .requiredOption("--project <key>", "Project key (e.g. PROJ)")
  .requiredOption("--type <type>", "Issue type: Bug, Story, Task, Epic")
  .requiredOption("--summary <text>", "Issue summary / title")
  .option("--description <text>", "Issue description")
  .option("--assignee <accountId>", "Assignee account ID")
  .option("--priority <name>", "Priority: Highest, High, Medium, Low, Lowest")
  .option("--labels <labels>", "Comma-separated labels")
  .action(async (opts) => {
    try {
      await issueCreate({
        project: opts.project,
        type: opts.type,
        summary: opts.summary,
        description: opts.description,
        assignee: opts.assignee,
        priority: opts.priority,
        labels: opts.labels,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

jira
  .command("issue-transition")
  .description("Transition an issue to a new status")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .requiredOption("--transition <name>", "Transition name (e.g. 'Start Progress', 'Done')")
  .option("--comment <text>", "Optional comment to add during transition")
  .action(async (opts) => {
    try {
      await issueTransition({
        key: opts.key,
        transition: opts.transition,
        comment: opts.comment,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

jira
  .command("issue-comment")
  .description("Add a comment to an issue")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .requiredOption("--body <text>", "Comment body text")
  .action(async (opts) => {
    try {
      await issueComment({
        key: opts.key,
        body: opts.body,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

jira
  .command("issue-search")
  .description("Search issues using JQL")
  .requiredOption("--jql <query>", "JQL query string")
  .option("--max-results <n>", "Maximum results to return", "20")
  .action(async (opts) => {
    try {
      await issueSearch({
        jql: opts.jql,
        maxResults: opts.maxResults,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

jira
  .command("issue-assign")
  .description("Assign an issue to a user")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .requiredOption("--assignee <accountId>", "Assignee account ID (use 'unassigned' to clear)")
  .action(async (opts) => {
    try {
      await issueAssign({
        key: opts.key,
        assignee: opts.assignee,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

// Issue tracking commands (local issue management)
const issue = program
  .command("issue")
  .description("Local issue tracking management");

issue
  .command("list")
  .description("List all tracked issues")
  .action(async () => {
    try {
      await issueList();
    } catch (err) {
      handleCliError(err);
    }
  });

issue
  .command("show")
  .description("Show full tracked issue data")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .action(async (opts) => {
    try {
      await issueShow({ key: opts.key });
    } catch (err) {
      handleCliError(err);
    }
  });

issue
  .command("add-note")
  .description("Add a note to a tracked issue")
  .requiredOption("--key <key>", "Issue key")
  .requiredOption("--content <text>", "Note content")
  .option("--category <cat>", "Note category: decision, todo, warning, info, question", "info")
  .action(async (opts) => {
    try {
      await issueAddNote({
        key: opts.key,
        content: opts.content,
        category: opts.category,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

issue
  .command("add-mr")
  .description("Link a merge request to a tracked issue")
  .requiredOption("--key <key>", "Issue key")
  .requiredOption("--project <path>", "GitLab project path")
  .requiredOption("--iid <iid>", "Merge request IID")
  .option("--primary", "Mark as primary MR for this issue", false)
  .action(async (opts) => {
    try {
      await issueAddMr({
        key: opts.key,
        project: opts.project,
        iid: parseInt(opts.iid, 10),
        primary: opts.primary,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

issue
  .command("add-api")
  .description("Add an API endpoint reference")
  .requiredOption("--key <key>", "Issue key")
  .requiredOption("--method <method>", "HTTP method: GET, POST, PUT, PATCH, DELETE")
  .requiredOption("--path <path>", "API path (e.g. /api/users/{id})")
  .requiredOption("--description <text>", "What this endpoint does")
  .option("--spec <name>", "OpenAPI spec name")
  .action(async (opts) => {
    try {
      await issueAddApi({
        key: opts.key,
        method: opts.method.toUpperCase(),
        path: opts.path,
        description: opts.description,
        spec: opts.spec,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

issue
  .command("add-context")
  .description("Add a required context/file reference")
  .requiredOption("--key <key>", "Issue key")
  .requiredOption("--type <type>", "Context type: file, module, documentation, external, dependency")
  .requiredOption("--path <path>", "File path or URL")
  .requiredOption("--description <text>", "What this context is")
  .requiredOption("--relevance <text>", "Why this context is needed")
  .action(async (opts) => {
    try {
      await issueAddContext({
        key: opts.key,
        type: opts.type,
        path: opts.path,
        description: opts.description,
        relevance: opts.relevance,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

issue
  .command("add-figma")
  .description("Add a Figma design reference")
  .requiredOption("--key <key>", "Issue key")
  .requiredOption("--url <url>", "Figma URL")
  .requiredOption("--name <name>", "Design name")
  .option("--description <text>", "Description of this design")
  .action(async (opts) => {
    try {
      await issueAddFigma({
        key: opts.key,
        url: opts.url,
        name: opts.name,
        description: opts.description,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

issue
  .command("progress")
  .description("Update issue progress")
  .requiredOption("--key <key>", "Issue key")
  .option("--status <status>", "Status: not_started, in_progress, blocked, in_review, completed")
  .option("--percent <n>", "Percent complete (0-100)")
  .option("--blocker <text>", "Add a blocker")
  .option("--clear-blockers", "Clear all blockers", false)
  .action(async (opts) => {
    try {
      await issueUpdateProgress({
        key: opts.key,
        status: opts.status,
        percent: opts.percent ? parseInt(opts.percent, 10) : undefined,
        blocker: opts.blocker,
        clearBlockers: opts.clearBlockers,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

issue
  .command("set-analysis")
  .description("Set or update issue analysis")
  .requiredOption("--key <key>", "Issue key")
  .requiredOption("--summary <text>", "Analysis summary")
  .option("--acceptance-criteria <items>", "Comma-separated acceptance criteria")
  .option("--out-of-scope <items>", "Comma-separated out of scope items")
  .option("--assumptions <items>", "Comma-separated assumptions")
  .action(async (opts) => {
    try {
      await issueSetAnalysis({
        key: opts.key,
        summary: opts.summary,
        acceptanceCriteria: opts.acceptanceCriteria,
        outOfScope: opts.outOfScope,
        assumptions: opts.assumptions,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

issue
  .command("add-requirement")
  .description("Add a requirement to issue analysis")
  .requiredOption("--key <key>", "Issue key")
  .requiredOption("--title <text>", "Requirement title")
  .requiredOption("--description <text>", "Requirement description")
  .option("--type <type>", "Type: functional, non-functional, technical, ui, data", "functional")
  .option("--priority <pri>", "Priority: must, should, could, wont", "should")
  .action(async (opts) => {
    try {
      await issueAddRequirement({
        key: opts.key,
        title: opts.title,
        description: opts.description,
        type: opts.type,
        priority: opts.priority,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

// Figma commands
program.addCommand(createFigmaCommands());

// Config commands
const config = program
  .command("config")
  .description("Configuration management");

config
  .command("show")
  .description("Show current configuration")
  .option("--global", "Show only global config")
  .option("--project", "Show only project config")
  .action(async (opts) => {
    try {
      await configShow({ global: opts.global, project: opts.project });
    } catch (err) {
      handleCliError(err);
    }
  });

config
  .command("set <key> <value>")
  .description("Set a configuration value")
  .option("--global", "Set in global config (default: project)")
  .option("--template <template>", "Template for custom commit style")
  .action(async (key, value, opts) => {
    try {
      await configSet({ key, value, global: opts.global, template: opts.template });
    } catch (err) {
      handleCliError(err);
    }
  });

// Branch commands
const branchCmd = program
  .command("branch")
  .description("Branch management and naming");

branchCmd
  .command("name")
  .description("Generate a branch name from configured pattern (does not create branch)")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .option("--description <text>", "Branch description")
  .option("--type <type>", "Branch type (e.g. feature, fix)")
  .action(async (opts) => {
    try {
      await branch({ key: opts.key, description: opts.description, type: opts.type });
    } catch (err) {
      handleCliError(err);
    }
  });

branchCmd
  .command("create")
  .description("Create a git branch and optionally transition Jira issue")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .option("--description <text>", "Branch description")
  .option("--type <type>", "Branch type (e.g. feature, fix)")
  .option("--no-transition", "Skip Jira transition")
  .action(async (opts) => {
    try {
      await branchCreate({
        key: opts.key,
        description: opts.description,
        type: opts.type,
        noTransition: !opts.transition,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

// Commit message command
program
  .command("commit-msg")
  .description("Generate a commit message from configured style")
  .requiredOption("--type <type>", "Commit type (e.g. feat, fix, docs)")
  .requiredOption("--description <text>", "Commit description")
  .option("--key <key>", "Issue key (used as scope if no --scope)")
  .option("--scope <scope>", "Commit scope")
  .action(async (opts) => {
    try {
      await commitMsg({
        type: opts.type,
        description: opts.description,
        key: opts.key,
        scope: opts.scope,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

// Environment commands
const env = program
  .command("env")
  .description("Environment management for data isolation");

env
  .command("init")
  .description("Initialize the data directory as a git repository")
  .action(async () => {
    try {
      await envInit();
    } catch (err) {
      handleCliError(err);
    }
  });

env
  .command("create <name>")
  .description("Create a new environment")
  .action(async (name) => {
    try {
      await envCreate({ name });
    } catch (err) {
      handleCliError(err);
    }
  });

env
  .command("use <name>")
  .description("Switch to an environment (requires interactive confirmation)")
  .action(async (name) => {
    try {
      await envUse({ name });
    } catch (err) {
      handleCliError(err);
    }
  });

env
  .command("list")
  .description("List all environments")
  .action(async () => {
    try {
      await envList();
    } catch (err) {
      handleCliError(err);
    }
  });

env
  .command("current")
  .description("Show the current environment")
  .action(async () => {
    try {
      await envCurrent();
    } catch (err) {
      handleCliError(err);
    }
  });

env
  .command("delete <name>")
  .description("Delete an environment (requires interactive confirmation)")
  .action(async (name) => {
    try {
      await envDelete({ name });
    } catch (err) {
      handleCliError(err);
    }
  });

env
  .command("migrate")
  .description("Migrate existing data to the new environment structure")
  .action(async () => {
    try {
      await envMigrate();
    } catch (err) {
      handleCliError(err);
    }
  });

// Workflow commands
const workflow = program
  .command("workflow")
  .description("Workflow automation hooks for Jira transitions");

workflow
  .command("on-mr-create")
  .description("Trigger Jira transition when MR/PR is created")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .option("--draft", "MR/PR is a draft", false)
  .action(async (opts) => {
    try {
      await workflowOnMrCreate({ key: opts.key, draft: opts.draft });
    } catch (err) {
      handleCliError(err);
    }
  });

workflow
  .command("on-merge")
  .description("Trigger Jira transition when MR/PR is merged")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .action(async (opts) => {
    try {
      await workflowOnMerge({ key: opts.key });
    } catch (err) {
      handleCliError(err);
    }
  });

workflow
  .command("status")
  .description("Show current workflow configuration")
  .action(async () => {
    try {
      await workflowStatus();
    } catch (err) {
      handleCliError(err);
    }
  });

// Worktree commands
const worktree = program
  .command("worktree")
  .description("Git worktree management for working on multiple issues");

worktree
  .command("create")
  .description("Create a worktree with a new branch for an issue")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .option("--description <text>", "Branch description")
  .option("--type <type>", "Branch type (e.g. feat, fix)")
  .option("--path <path>", "Custom worktree path (default: ../<repo>-worktrees/<branch>)")
  .option("--no-transition", "Skip Jira transition")
  .action(async (opts) => {
    try {
      await worktreeCreate({
        key: opts.key,
        description: opts.description,
        type: opts.type,
        path: opts.path,
        noTransition: !opts.transition,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

worktree
  .command("list")
  .description("List all git worktrees")
  .action(async () => {
    try {
      await worktreeList();
    } catch (err) {
      handleCliError(err);
    }
  });

worktree
  .command("remove")
  .description("Remove a git worktree")
  .requiredOption("--path <path>", "Worktree path to remove")
  .option("--force", "Force removal even with uncommitted changes", false)
  .action(async (opts) => {
    try {
      await worktreeRemove({
        path: opts.path,
        force: opts.force,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

worktree
  .command("prune")
  .description("Remove stale worktree references from git")
  .option("--dry-run", "Show what would be pruned without removing", false)
  .option("--verbose", "Show detailed output", false)
  .action(async (opts) => {
    try {
      await worktreePrune({
        dryRun: opts.dryRun,
        verbose: opts.verbose,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

// Notes commands (per-ticket notes shared across repos)
const notes = program
  .command("notes")
  .description("Per-ticket notes management (shared across repositories)");

notes
  .command("add")
  .description("Add a note to a ticket")
  .requiredOption("--key <key>", "Ticket key (e.g. PROJ-123)")
  .requiredOption("--content <text>", "Note content")
  .option("--category <cat>", "Category: decision, todo, warning, info, question, progress", "info")
  .action(async (opts) => {
    try {
      await notesAdd({ key: opts.key, content: opts.content, category: opts.category });
    } catch (err) {
      handleCliError(err);
    }
  });

notes
  .command("list")
  .description("List notes for a ticket (summary view)")
  .requiredOption("--key <key>", "Ticket key (e.g. PROJ-123)")
  .action(async (opts) => {
    try {
      await notesList({ key: opts.key });
    } catch (err) {
      handleCliError(err);
    }
  });

notes
  .command("get")
  .description("Get a specific note by ID")
  .requiredOption("--key <key>", "Ticket key (e.g. PROJ-123)")
  .requiredOption("--id <id>", "Note ID")
  .action(async (opts) => {
    try {
      await notesGet({ key: opts.key, id: opts.id });
    } catch (err) {
      handleCliError(err);
    }
  });

notes
  .command("query")
  .description("Query notes with filters")
  .requiredOption("--key <key>", "Ticket key (e.g. PROJ-123)")
  .option("--category <cat>", "Filter by category")
  .option("--limit <n>", "Maximum notes to return", "20")
  .action(async (opts) => {
    try {
      await notesQuery({ key: opts.key, category: opts.category, limit: opts.limit });
    } catch (err) {
      handleCliError(err);
    }
  });

notes
  .command("summary")
  .description("Get token-efficient summary of notes")
  .requiredOption("--key <key>", "Ticket key (e.g. PROJ-123)")
  .action(async (opts) => {
    try {
      await notesSummary({ key: opts.key });
    } catch (err) {
      handleCliError(err);
    }
  });

notes
  .command("delete")
  .description("Delete a specific note")
  .requiredOption("--key <key>", "Ticket key (e.g. PROJ-123)")
  .requiredOption("--id <id>", "Note ID to delete")
  .action(async (opts) => {
    try {
      await notesDelete({ key: opts.key, id: opts.id });
    } catch (err) {
      handleCliError(err);
    }
  });

notes
  .command("clear")
  .description("Clear all notes for a ticket")
  .requiredOption("--key <key>", "Ticket key (e.g. PROJ-123)")
  .action(async (opts) => {
    try {
      await notesClear({ key: opts.key });
    } catch (err) {
      handleCliError(err);
    }
  });

notes
  .command("tickets")
  .description("List all tickets with notes")
  .action(async () => {
    try {
      await notesListTickets();
    } catch (err) {
      handleCliError(err);
    }
  });

// Team commands (Claude Code agent teams)
const team = program
  .command("team")
  .description("Claude Code agent teams setup and agent management");

team
  .command("setup")
  .description("Enable agent teams in Claude Code settings")
  .option("--global", "Write to ~/.claude/settings.json (default)")
  .option("--project", "Write to .claude/settings.json in CWD")
  .option("--teammate-mode <mode>", "Set teammate mode: in-process, tmux, auto", "auto")
  .option("--disable", "Remove agent teams config", false)
  .action(async (opts) => {
    try {
      await teamSetup({
        global: opts.global,
        project: opts.project,
        teammateMode: opts.teammateMode,
        disable: opts.disable,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

team
  .command("status")
  .description("Show current teams config and agent inventory")
  .action(async () => {
    try {
      await teamStatus();
    } catch (err) {
      handleCliError(err);
    }
  });

team
  .command("list")
  .description("List all agents (built-in and custom)")
  .action(async () => {
    try {
      await teamList();
    } catch (err) {
      handleCliError(err);
    }
  });

team
  .command("show")
  .description("Show full agent details")
  .requiredOption("--name <name>", "Agent name")
  .action(async (opts) => {
    try {
      await teamShow({ name: opts.name });
    } catch (err) {
      handleCliError(err);
    }
  });

team
  .command("create")
  .description("Create a custom agent definition")
  .requiredOption("--name <name>", "Agent name")
  .requiredOption("--description <desc>", "Agent description")
  .option("--model <model>", "Model: sonnet, opus, haiku", "sonnet")
  .option("--tools <tools>", "Comma-separated tool list", "Bash, Read, Grep, Glob")
  .option("--max-turns <n>", "Max turns", "15")
  .option("--instructions <file>", "Read markdown instructions from file")
  .action(async (opts) => {
    try {
      await teamCreate({
        name: opts.name,
        description: opts.description,
        model: opts.model,
        tools: opts.tools,
        maxTurns: opts.maxTurns,
        instructions: opts.instructions,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

team
  .command("edit")
  .description("Edit a custom agent's metadata")
  .requiredOption("--name <name>", "Agent to edit")
  .option("--description <desc>", "New description")
  .option("--model <model>", "New model: sonnet, opus, haiku")
  .option("--tools <tools>", "New tools (comma-separated)")
  .option("--max-turns <n>", "New max turns")
  .option("--instructions <file>", "Replace instructions from file")
  .action(async (opts) => {
    try {
      await teamEdit({
        name: opts.name,
        description: opts.description,
        model: opts.model,
        tools: opts.tools,
        maxTurns: opts.maxTurns,
        instructions: opts.instructions,
      });
    } catch (err) {
      handleCliError(err);
    }
  });

team
  .command("delete")
  .description("Delete a custom agent")
  .requiredOption("--name <name>", "Agent to delete")
  .action(async (opts) => {
    try {
      await teamDelete({ name: opts.name });
    } catch (err) {
      handleCliError(err);
    }
  });

team
  .command("sync")
  .description("Re-symlink all agents to ~/.claude/agents/")
  .action(async () => {
    try {
      await teamSync();
    } catch (err) {
      handleCliError(err);
    }
  });

program.parse();
