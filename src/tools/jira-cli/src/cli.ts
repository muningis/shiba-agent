#!/usr/bin/env node
import { Command } from "commander";
import { handleCliError } from "@agent-tools/shared";
import { issueGet } from "./commands/issue-get.js";
import { issueCreate } from "./commands/issue-create.js";
import { issueTransition } from "./commands/issue-transition.js";
import { issueComment } from "./commands/issue-comment.js";
import { issueSearch } from "./commands/issue-search.js";
import { issueAssign } from "./commands/issue-assign.js";

const program = new Command()
  .name("jira-cli")
  .description("Jira operations for Claude Code agents. Returns JSON to stdout.")
  .version("1.0.0");

program
  .command("issue-get")
  .description("Get details of a Jira issue")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .action(async (opts) => {
    try {
      await issueGet(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
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
      await issueCreate(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("issue-transition")
  .description("Transition an issue to a new status")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .requiredOption("--transition <name>", "Transition name (e.g. 'Start Progress', 'Done')")
  .option("--comment <text>", "Optional comment to add during transition")
  .action(async (opts) => {
    try {
      await issueTransition(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("issue-comment")
  .description("Add a comment to an issue")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .requiredOption("--body <text>", "Comment body text")
  .action(async (opts) => {
    try {
      await issueComment(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("issue-search")
  .description("Search issues using JQL")
  .requiredOption("--jql <query>", "JQL query string")
  .option("--max-results <n>", "Maximum results to return", "20")
  .action(async (opts) => {
    try {
      await issueSearch(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("issue-assign")
  .description("Assign an issue to a user")
  .requiredOption("--key <key>", "Issue key (e.g. PROJ-123)")
  .requiredOption("--assignee <accountId>", "Assignee account ID (use 'unassigned' to clear)")
  .action(async (opts) => {
    try {
      await issueAssign(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program.parse();
