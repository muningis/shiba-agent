import { getGitlabClient, successResponse } from "@agent-tools/shared";

interface MRCommentOpts {
  project: string;
  iid: string;
  body: string;
}

export async function mrComment(opts: MRCommentOpts): Promise<void> {
  const gl = getGitlabClient();
  const iid = parseInt(opts.iid, 10);

  const note = await gl.MergeRequestNotes.create(opts.project, iid, opts.body);

  successResponse({
    noteId: note.id,
    body: note.body,
    author: { name: note.author?.name ?? "unknown", username: note.author?.username ?? "unknown" },
    createdAt: note.created_at,
  });
}
