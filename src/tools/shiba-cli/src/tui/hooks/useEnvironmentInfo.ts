import { useState, useEffect } from "react";
import {
  getCurrentEnvironment,
  isDataInitialized,
  loadGlobalConfig,
  isCliAvailable,
} from "@shiba-agent/shared";
import type { GlobalConfig } from "../types.js";

export interface EnvironmentInfo {
  environment: string | null;
  dataInitialized: boolean;
  config: GlobalConfig;
  cliStatus: {
    gh: boolean;
    glab: boolean;
  };
  jiraConfigured: boolean;
  figmaConfigured: boolean;
}

export function useEnvironmentInfo() {
  const [info, setInfo] = useState<EnvironmentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const config = loadGlobalConfig();
      const environment = getCurrentEnvironment();
      const dataInitialized = isDataInitialized();

      const jiraConfigured = !!(
        (process.env.JIRA_HOST || config.jira?.host) &&
        (process.env.JIRA_EMAIL || config.jira?.email) &&
        (process.env.JIRA_API_TOKEN || config.jira?.token)
      );

      const figmaConfigured = !!(config.figma?.token);

      setInfo({
        environment,
        dataInitialized,
        config,
        cliStatus: {
          gh: isCliAvailable("gh"),
          glab: isCliAvailable("glab"),
        },
        jiraConfigured,
        figmaConfigured,
      });
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { info, loading };
}
