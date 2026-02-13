import { spawnSync } from "child_process";
import { successResponse, errorResponse } from "@shiba-agent/shared";
import { resolve } from "path";

export async function update(): Promise<void> {
  // Shiba is installed at ~/.shiba-agent
  const shibaDir = resolve(process.env.HOME || "~", ".shiba-agent");

  // Step 1: Fetch latest
  console.error("Fetching latest from origin/main...");
  const fetch = spawnSync("git", ["fetch", "origin", "main"], {
    cwd: shibaDir,
    stdio: ["inherit", "pipe", "pipe"],
  });

  if (fetch.status !== 0) {
    errorResponse("FETCH_FAILED", fetch.stderr?.toString() || "Failed to fetch");
  }

  // Step 2: Rebase
  console.error("Rebasing onto origin/main...");
  const rebase = spawnSync("git", ["rebase", "origin/main"], {
    cwd: shibaDir,
    stdio: ["inherit", "pipe", "pipe"],
  });

  if (rebase.status !== 0) {
    errorResponse(
      "REBASE_FAILED",
      rebase.stderr?.toString() || "Rebase failed - resolve conflicts manually"
    );
  }

  // Step 3: Run setup.sh
  console.error("Rebuilding...");
  const setup = spawnSync("./setup.sh", [], {
    cwd: shibaDir,
    stdio: "inherit",
    shell: true,
  });

  if (setup.status !== 0) {
    errorResponse("SETUP_FAILED", "setup.sh failed");
  }

  successResponse({
    updated: true,
    message: "Shiba updated successfully",
  });
}
