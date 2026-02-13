import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { successResponse, errorResponse, getRepoRoot } from "@shiba-agent/shared";
import { join } from "path";

export async function update(): Promise<void> {
  const shibaDir = getRepoRoot();

  // Capture current version before update
  const beforeResult = spawnSync("shiba", ["--version"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const versionBefore = beforeResult.stdout?.toString().trim() || "unknown";

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

  // Step 3: Run setup.sh (builds + re-links)
  console.error("Rebuilding...");
  const setup = spawnSync("./setup.sh", [], {
    cwd: shibaDir,
    stdio: "inherit",
    shell: true,
  });

  if (setup.status !== 0) {
    errorResponse("SETUP_FAILED", "setup.sh failed");
  }

  // Read version from source package.json (post-pull)
  const pkgPath = join(shibaDir, "src/tools/shiba-cli/package.json");
  let versionAfter: string;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    versionAfter = pkg.version;
  } catch {
    versionAfter = "unknown";
  }

  successResponse({
    updated: true,
    versionBefore,
    versionAfter,
    message:
      versionBefore === versionAfter
        ? `Shiba is up to date (v${versionAfter})`
        : `Shiba updated from v${versionBefore} to v${versionAfter}`,
  });
}
