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

program.parse();
