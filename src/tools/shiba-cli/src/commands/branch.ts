import { successResponse, errorResponse } from "@shiba-agent/shared";
import { generateBranchName } from "../config/resolve.js";

export interface BranchOpts {
  key: string;
  description?: string;
  type?: string;
}

export async function branch(opts: BranchOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Issue key is required (--key)");
  }

  const branchName = generateBranchName({
    key: opts.key,
    description: opts.description,
    type: opts.type,
  });

  successResponse({ branch: branchName });
}
