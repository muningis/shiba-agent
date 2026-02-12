#!/usr/bin/env node
import { Command } from "commander";
import { handleCliError } from "@shiba-agent/shared";
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
  pipelineStatus,
  pipelineList,
} from "./commands/gitlab.js";
import {
  issueGet,
  issueCreate,
  issueTransition,
  issueComment,
  issueSearch,
  issueAssign,
} from "./commands/jira.js";

const program = new Command()
  .name("shiba")
  .description("Shiba Agent CLI - Project setup and task navigation")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize project configuration by detecting GitLab repository")
  .option("--force", "Overwrite existing .shiba/config.json", false)
  .action(async (opts) => {
    try {
      await init(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("tui")
  .description("Launch interactive TUI for navigating Jira issues")
  .action(async () => {
    try {
      await tui();
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
  .description("Add a comment to a merge request")
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

// Jira commands
const jira = program
  .command("jira")
  .description("Jira operations (issues, transitions)");

jira
  .command("issue-get")
  .description("Get details of a Jira issue")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .action(async (opts) => {
    try {
      await issueGet({ key: opts.key });
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

program.parse();
