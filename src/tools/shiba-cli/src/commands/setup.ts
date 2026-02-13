import { createInterface, Interface } from "readline";
import { stdin, stdout } from "process";
import { spawnSync } from "child_process";
import {
  successResponse,
  errorResponse,
  getCurrentEnvironment,
  isDataInitialized,
  loadGlobalConfig,
  saveGlobalConfig,
  isCliAvailable,
  getDefaultPreferences,
  type ShibaPreferences,
  type IssueTracker,
} from "@shiba-agent/shared";
import { envInit, envCreate, envUse } from "./env.js";

export interface SetupOpts {
  reset?: boolean;
  defaults?: boolean;
  skipAuth?: boolean;
}

interface CliInfo {
  name: string;
  command: string;
  installHint: string;
  authCommand: string[];
  checkAuthCommand?: string[];
}

const SUPPORTED_CLIS: CliInfo[] = [
  {
    name: "GitLab",
    command: "glab",
    installHint: "brew install glab",
    authCommand: ["auth", "login"],
    checkAuthCommand: ["auth", "status"],
  },
  {
    name: "GitHub",
    command: "gh",
    installHint: "brew install gh",
    authCommand: ["auth", "login"],
    checkAuthCommand: ["auth", "status"],
  },
  // Note: Jira uses direct API now, configured separately
];

function prompt(rl: Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function print(message: string): void {
  stdout.write(message + "\n");
}

function printHeader(title: string): void {
  print("");
  print(`--- ${title} ---`);
}

function isCliAuthenticated(cli: CliInfo): boolean {
  if (!cli.checkAuthCommand) return false;

  try {
    const result = spawnSync(cli.command, cli.checkAuthCommand, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

async function runCliAuth(cli: CliInfo): Promise<boolean> {
  print(`Running: ${cli.command} ${cli.authCommand.join(" ")}`);

  const result = spawnSync(cli.command, cli.authCommand, {
    stdio: "inherit", // Pass through to terminal for interactive auth
  });

  if (result.status === 0) {
    print(`\u2713 ${cli.name} configured`);
    return true;
  } else {
    print(`\u2717 ${cli.name} configuration failed or cancelled`);
    return false;
  }
}

export async function setup(opts: SetupOpts): Promise<void> {
  const hasExistingEnv = isDataInitialized() && getCurrentEnvironment();

  print("");
  print("Shiba Agent Setup");
  print("=================");

  // Safety check for existing environments
  if (hasExistingEnv && !opts.reset) {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await prompt(
      rl,
      `Environment '${getCurrentEnvironment()}' already configured. Reconfigure? (yes/no): `
    );
    rl.close();
    if (answer.toLowerCase() !== "yes") {
      errorResponse("CANCELLED", "Setup cancelled.");
      return;
    }
  }

  // Initialize data directory if needed
  if (!isDataInitialized()) {
    print("");
    print("Initializing data directory...");
    await envInit();
  }

  // Create default environment if none exists
  if (!getCurrentEnvironment() || getCurrentEnvironment() === "main" || getCurrentEnvironment() === "master") {
    const rl = createInterface({ input: stdin, output: stdout });
    const envName = await prompt(rl, "Environment name [default]: ") || "default";
    rl.close();

    await envCreate({ name: envName });
    // Note: envUse requires interactive confirmation, so we inform the user
    print(`Environment '${envName}' created. You'll need to run 'shiba env use ${envName}' to switch to it.`);
  }

  if (opts.defaults) {
    // Apply defaults without prompts
    const defaults = getDefaultPreferences();
    const config = loadGlobalConfig();
    config.preferences = defaults;
    saveGlobalConfig(config);

    successResponse({
      configured: true,
      defaults: true,
      preferences: defaults,
    });
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });

  // --- CLI Authentication ---
  if (!opts.skipAuth) {
    printHeader("CLI Authentication");

    const installedClis = SUPPORTED_CLIS.filter((cli) => isCliAvailable(cli.command));
    const notInstalledClis = SUPPORTED_CLIS.filter((cli) => !isCliAvailable(cli.command));

    if (notInstalledClis.length > 0) {
      print("");
      print("Not installed (optional):");
      for (const cli of notInstalledClis) {
        print(`  - ${cli.name}: ${cli.installHint}`);
      }
    }

    if (installedClis.length > 0) {
      print("");
      print("Installed CLIs:");
      for (const cli of installedClis) {
        const authenticated = isCliAuthenticated(cli);
        print(`  - ${cli.name}: ${authenticated ? "authenticated" : "not authenticated"}`);
      }

      print("");
      const setupAuth = await prompt(rl, "Configure CLI authentication? (yes/no) [yes]: ") || "yes";

      if (setupAuth.toLowerCase() === "yes") {
        for (const cli of installedClis) {
          const authenticated = isCliAuthenticated(cli);
          if (authenticated) {
            const reconfigure = await prompt(rl, `${cli.name} is already authenticated. Reconfigure? (yes/no) [no]: `);
            if (reconfigure.toLowerCase() !== "yes") {
              continue;
            }
          }

          printHeader(`${cli.name} Authentication`);
          await runCliAuth(cli);
        }
      }
    }
  }

  // --- Jira Configuration ---
  printHeader("Jira Configuration");

  const config = loadGlobalConfig();
  const currentJira = config.jira || {};

  print("");
  print("Configure Jira API access (get token at https://id.atlassian.com/manage-profile/security/api-tokens)");
  print("");

  const jiraHost = await prompt(
    rl,
    `Jira host URL [${currentJira.host || "https://company.atlassian.net"}]: `
  );
  const jiraEmail = await prompt(
    rl,
    `Jira email [${currentJira.email || ""}]: `
  );
  const jiraToken = await prompt(
    rl,
    `Jira API token [${currentJira.token ? "****" : ""}]: `
  );

  // Save Jira config
  config.jira = {
    host: jiraHost || currentJira.host,
    email: jiraEmail || currentJira.email,
    token: jiraToken || currentJira.token,
  };

  // Check if Jira is configured
  const hasJira = !!(config.jira?.host && config.jira?.email && config.jira?.token);

  // --- Preferences ---
  printHeader("Preferences");
  const currentPrefs = config.preferences || {};

  // If Jira not configured, offer alternative issue trackers
  let issueTracker: IssueTracker | undefined = currentPrefs.issueTracker;
  if (!hasJira) {
    print("");
    print("Jira not fully configured. You can use GitHub or GitLab issues instead.");
    const hasGh = isCliAvailable("gh");
    const hasGlab = isCliAvailable("glab");

    if (hasGh || hasGlab) {
      const options: string[] = [];
      if (hasGh) options.push("github");
      if (hasGlab) options.push("gitlab");

      const trackerChoice = await prompt(
        rl,
        `Default issue tracker (${options.join("/")}${options.length > 0 ? "/" : ""}skip) [${currentPrefs.issueTracker || "skip"}]: `
      );

      if (trackerChoice && (trackerChoice === "github" || trackerChoice === "gitlab")) {
        issueTracker = trackerChoice;
      }
    }
  } else {
    issueTracker = "jira";
  }
  const defaults = getDefaultPreferences();

  // Workflow automation
  print("");
  const enableWorkflow = await prompt(
    rl,
    `Enable automatic Jira transitions? (yes/no) [${currentPrefs.workflow?.enabled ? "yes" : "no"}]: `
  );

  const workflowEnabled = enableWorkflow.toLowerCase() === "yes" ||
    (enableWorkflow === "" && currentPrefs.workflow?.enabled === true);

  const defaultTransitions = defaults.workflow.transitions!;
  let workflowTransitions = defaultTransitions;

  if (workflowEnabled) {
    const onBranch = await prompt(
      rl,
      `  Jira status when branch is created [${currentPrefs.workflow?.transitions?.onBranchCreate || defaultTransitions.onBranchCreate}]: `
    );
    const onMr = await prompt(
      rl,
      `  Jira status when MR/PR is created [${currentPrefs.workflow?.transitions?.onMrCreate || defaultTransitions.onMrCreate}]: `
    );
    const onMerge = await prompt(
      rl,
      `  Jira status when merged [${currentPrefs.workflow?.transitions?.onMerge || defaultTransitions.onMerge}]: `
    );

    workflowTransitions = {
      onBranchCreate: onBranch || currentPrefs.workflow?.transitions?.onBranchCreate || defaultTransitions.onBranchCreate,
      onMrCreate: onMr || currentPrefs.workflow?.transitions?.onMrCreate || defaultTransitions.onMrCreate,
      onMerge: onMerge || currentPrefs.workflow?.transitions?.onMerge || defaultTransitions.onMerge,
    };
  }

  // Branch naming
  print("");
  const branchPattern = await prompt(
    rl,
    `Branch naming pattern [${currentPrefs.branchNaming?.pattern || defaults.branchNaming.pattern}]: `
  );

  // Commit style
  const commitStyle = await prompt(
    rl,
    `Commit message style (conventional/custom) [${currentPrefs.commitMessage?.style || defaults.commitMessage.style}]: `
  );

  // Shiba signature
  const addSignature = await prompt(
    rl,
    `Add Shiba signature to comments? (yes/no) [${currentPrefs.signatures?.shibaSignature ? "yes" : "no"}]: `
  );

  rl.close();

  // Build preferences
  const newPrefs: ShibaPreferences = {
    branchNaming: {
      pattern: branchPattern || currentPrefs.branchNaming?.pattern || defaults.branchNaming.pattern,
    },
    commitMessage: {
      style: (commitStyle as "conventional" | "custom") || currentPrefs.commitMessage?.style || defaults.commitMessage.style,
      template: currentPrefs.commitMessage?.template,
    },
    signatures: {
      shibaSignature: addSignature.toLowerCase() === "yes" ||
        (addSignature === "" && currentPrefs.signatures?.shibaSignature === true),
    },
    workflow: {
      enabled: workflowEnabled === true,
      transitions: workflowTransitions,
    },
    issueTracker,
  };

  // Save
  config.preferences = newPrefs;
  saveGlobalConfig(config);

  print("");
  print("Configuration saved!");
  print("");
  print("Summary:");
  if (config.jira?.host) {
    print(`  jira.host: ${config.jira.host}`);
    print(`  jira.email: ${config.jira.email}`);
    print(`  jira.token: ${config.jira.token ? "****" : "(not set)"}`);
  }
  if (newPrefs.issueTracker) {
    print(`  issueTracker: ${newPrefs.issueTracker}`);
  }
  print(`  workflow.enabled: ${newPrefs.workflow?.enabled}`);
  if (newPrefs.workflow?.enabled) {
    print(`  workflow.transitions.onBranchCreate: ${newPrefs.workflow.transitions?.onBranchCreate}`);
    print(`  workflow.transitions.onMrCreate: ${newPrefs.workflow.transitions?.onMrCreate}`);
    print(`  workflow.transitions.onMerge: ${newPrefs.workflow.transitions?.onMerge}`);
  }
  print(`  branchNaming.pattern: ${newPrefs.branchNaming?.pattern}`);
  print(`  commitMessage.style: ${newPrefs.commitMessage?.style}`);
  print(`  signatures.shibaSignature: ${newPrefs.signatures?.shibaSignature}`);

  successResponse({
    configured: true,
    environment: getCurrentEnvironment(),
    jira: config.jira ? { host: config.jira.host, email: config.jira.email } : undefined,
    preferences: newPrefs,
  });
}
