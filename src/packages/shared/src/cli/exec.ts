import { execSync, spawnSync } from "child_process";

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a CLI command and return the result
 */
export function execCli(cmd: string, args: string[]): CliResult {
  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

/**
 * Check if a CLI is installed, throw if not
 */
export function requireCli(name: string, installHint?: string): void {
  try {
    execSync(`which ${name}`, { encoding: "utf-8", stdio: "pipe" });
  } catch {
    const hint = installHint ?? `brew install ${name}`;
    throw new Error(`${name} CLI not found. Install with: ${hint}`);
  }
}
