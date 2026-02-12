import { getJiraClient, successResponse, errorResponse } from "@shiba-agent/shared";
import type { JiraTransitionResult } from "@shiba-agent/shared";

interface IssueTransitionOpts {
  key: string;
  transition: string;
  comment?: string;
}

export async function issueTransition(opts: IssueTransitionOpts): Promise<void> {
  const jira = getJiraClient();

  // Fetch available transitions
  const { transitions } = await jira.issues.getTransitions({ issueIdOrKey: opts.key });

  if (!transitions || transitions.length === 0) {
    errorResponse("NO_TRANSITIONS", `No transitions available for issue ${opts.key}.`, { issueKey: opts.key });
  }

  // Match transition by name (case-insensitive)
  const match = transitions!.find(
    (t) => t.name?.toLowerCase() === opts.transition.toLowerCase()
  );

  if (!match) {
    const available = transitions!.map((t) => t.name).join(", ");
    errorResponse("INVALID_TRANSITION", `Transition "${opts.transition}" not found. Available: ${available}`, {
      issueKey: opts.key,
      available,
    });
  }

  // Execute transition
  const transitionPayload: Record<string, unknown> = {
    transition: { id: match!.id },
  };

  if (opts.comment) {
    transitionPayload.update = {
      comment: [
        {
          add: {
            body: {
              type: "doc",
              version: 1,
              content: [{ type: "paragraph", content: [{ type: "text", text: opts.comment }] }],
            },
          },
        },
      ],
    };
  }

  await jira.issues.doTransition({
    issueIdOrKey: opts.key,
    ...transitionPayload,
  });

  const result: JiraTransitionResult = {
    issueKey: opts.key,
    newStatus: match!.name ?? opts.transition,
  };

  successResponse(result);
}
