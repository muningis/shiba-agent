#!/usr/bin/env node
import { Command } from "commander";
import { handleCliError } from "@shiba-agent/shared";
import { init } from "./commands/init.js";
import { tui } from "./commands/tui.js";

const program = new Command()
  .name("shiba")
  .description("Shiba Agent CLI - Project setup and task navigation")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize project configuration by detecting GitLab repository")
  .option("--force", "Overwrite existing .shiba.json", false)
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

program.parse();
