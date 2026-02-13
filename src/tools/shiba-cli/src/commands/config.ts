import { loadGlobalConfig, saveGlobalConfig, successResponse, errorResponse, getCurrentEnvironment, isDataInitialized, type ShibaPreferences } from "@shiba-agent/shared";
import { loadProjectConfig, saveProjectConfig } from "../config/project.js";
import { getEffectivePreferences } from "../config/resolve.js";

// Config Show
export interface ConfigShowOpts {
  global?: boolean;
  project?: boolean;
}

export async function configShow(opts: ConfigShowOpts): Promise<void> {
  if (opts.global) {
    const config = loadGlobalConfig();
    successResponse({ scope: "global", config });
    return;
  }

  if (opts.project) {
    const config = loadProjectConfig();
    if (!config) {
      errorResponse("NOT_FOUND", "No project config found. Run 'shiba init' first.");
    }
    successResponse({ scope: "project", config });
    return;
  }

  // Show effective (merged) preferences
  const effective = getEffectivePreferences();
  const environment = isDataInitialized() ? getCurrentEnvironment() : null;
  successResponse({
    scope: "effective",
    environment,
    preferences: effective,
  });
}

// Config Set
export interface ConfigSetOpts {
  key: string;
  value: string;
  global?: boolean;
  template?: string;
}

export async function configSet(opts: ConfigSetOpts): Promise<void> {
  const isGlobal = opts.global ?? false;

  if (isGlobal) {
    const config = loadGlobalConfig();
    config.preferences = config.preferences ?? {};
    applyConfigValue(config.preferences, opts.key, opts.value, opts.template);
    saveGlobalConfig(config);
    successResponse({ scope: "global", key: opts.key, value: opts.value });
  } else {
    const config = loadProjectConfig();
    if (!config) {
      errorResponse("NOT_FOUND", "No project config found. Run 'shiba init' first, or use --global.");
    }
    config.preferences = config.preferences ?? {};
    applyConfigValue(config.preferences, opts.key, opts.value, opts.template);
    saveProjectConfig(config);
    successResponse({ scope: "project", key: opts.key, value: opts.value });
  }
}

function applyConfigValue(
  preferences: ShibaPreferences,
  key: string,
  value: string,
  template?: string
): void {
  switch (key) {
    case "branch-pattern":
      preferences.branchNaming = { pattern: value };
      break;

    case "commit-style":
      if (value !== "conventional" && value !== "custom") {
        errorResponse("INVALID_VALUE", "commit-style must be 'conventional' or 'custom'");
      }
      if (value === "custom" && !template) {
        errorResponse("MISSING_TEMPLATE", "Custom commit style requires --template (e.g., --template '[{key}] {description}')");
      }
      preferences.commitMessage = {
        style: value as "conventional" | "custom",
        ...(template && { template }),
      };
      break;

    case "shiba-signature":
      if (value !== "on" && value !== "off") {
        errorResponse("INVALID_VALUE", "shiba-signature must be 'on' or 'off'");
      }
      preferences.signatures = { shibaSignature: value === "on" };
      break;

    case "default-jql":
      preferences.defaultJql = value;
      break;

    default:
      errorResponse("INVALID_KEY", `Unknown config key: ${key}. Valid keys: branch-pattern, commit-style, shiba-signature, default-jql`);
  }
}
