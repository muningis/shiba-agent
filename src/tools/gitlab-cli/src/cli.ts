#!/usr/bin/env node
import { Command } from "commander";
import { handleCliError } from "@shiba-agent/shared";
import { mrCreate } from "./commands/mr-create.js";
import { mrList } from "./commands/mr-list.js";
import { mrMerge } from "./commands/mr-merge.js";
import { mrComment } from "./commands/mr-comment.js";
import { pipelineStatus } from "./commands/pipeline-status.js";
import { pipelineList } from "./commands/pipeline-list.js";

const program = new Command()
  .name("gitlab-cli")
  .description("GitLab operations for Claude Code agents. Returns JSON to stdout.")
  .version("1.0.0");

program
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
      await mrCreate(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("mr-list")
  .description("List merge requests")
  .requiredOption("--project <id>", "Project ID or path")
  .option("--state <state>", "Filter by state: opened, closed, merged, all", "opened")
  .option("--limit <n>", "Maximum results to return", "20")
  .option("--author <username>", "Filter by author username")
  .option("--assignee <username>", "Filter by assignee username")
  .action(async (opts) => {
    try {
      await mrList(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("mr-merge")
  .description("Merge a merge request")
  .requiredOption("--project <id>", "Project ID or path")
  .requiredOption("--iid <iid>", "Merge request internal ID")
  .option("--squash", "Squash commits when merging", false)
  .option("--delete-branch", "Delete source branch after merge", false)
  .option("--when-pipeline-succeeds", "Merge when pipeline succeeds", false)
  .action(async (opts) => {
    try {
      await mrMerge(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("mr-comment")
  .description("Add a comment to a merge request")
  .requiredOption("--project <id>", "Project ID or path")
  .requiredOption("--iid <iid>", "Merge request internal ID")
  .requiredOption("--body <text>", "Comment body text")
  .action(async (opts) => {
    try {
      await mrComment(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("pipeline-status")
  .description("Get the status of a specific pipeline")
  .requiredOption("--project <id>", "Project ID or path")
  .requiredOption("--pipeline-id <id>", "Pipeline ID")
  .action(async (opts) => {
    try {
      await pipelineStatus(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program
  .command("pipeline-list")
  .description("List recent pipelines")
  .requiredOption("--project <id>", "Project ID or path")
  .option("--ref <branch>", "Filter by branch/tag ref")
  .option("--status <status>", "Filter by status: running, pending, success, failed, canceled")
  .option("--limit <n>", "Maximum results to return", "10")
  .action(async (opts) => {
    try {
      await pipelineList(opts);
    } catch (err) {
      handleCliError(err);
    }
  });

program.parse();
