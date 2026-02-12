import { successResponse, errorResponse } from "@shiba-agent/shared";
import { generateCommitMessage } from "../config/resolve.js";

export interface CommitMsgOpts {
  type: string;
  description: string;
  key?: string;
  scope?: string;
}

export async function commitMsg(opts: CommitMsgOpts): Promise<void> {
  if (!opts.type) {
    errorResponse("MISSING_TYPE", "Commit type is required (--type)");
  }

  if (!opts.description) {
    errorResponse("MISSING_DESCRIPTION", "Description is required (--description)");
  }

  const message = generateCommitMessage({
    type: opts.type,
    description: opts.description,
    key: opts.key,
    scope: opts.scope,
  });

  successResponse({ message });
}
