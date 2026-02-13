import { successResponse } from "@shiba-agent/shared";

export interface AskOpts {
  query: string;
}

interface KnowledgeEntry {
  topic: string;
  keywords: string[];
  answer: string;
  commands: string[];
  examples?: string[];
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    topic: "setup",
    keywords: ["setup", "install", "configure", "first", "start", "getting started"],
    answer:
      "Run `shiba setup` for an interactive configuration wizard. " +
      "It guides you through CLI authentication (glab, gh, jira-cli) and preferences like workflow automation, branch naming, and commit style.",
    commands: ["shiba setup", "shiba setup --reset", "shiba setup --defaults", "shiba setup --skip-auth"],
    examples: ["shiba setup", "shiba setup --skip-auth"],
  },
  {
    topic: "init",
    keywords: ["init", "initialize", "new repo", "new project", "project"],
    answer:
      "Run `shiba init` in your project root to detect the GitLab/GitHub repository and create `.shiba/config.json`. " +
      "This enables project-specific configuration.",
    commands: ["shiba init", "shiba init --force"],
    examples: ["cd my-project && shiba init"],
  },
  {
    topic: "reset",
    keywords: ["reset", "reconfigure", "start over", "clear", "redo"],
    answer:
      "Run `shiba setup --reset` to reconfigure your environment. " +
      "This lets you change CLI auth, workflow settings, and preferences.",
    commands: ["shiba setup --reset"],
    examples: ["shiba setup --reset"],
  },
  {
    topic: "branch",
    keywords: ["branch", "create branch", "from jira", "from ticket", "checkout"],
    answer:
      "Use `shiba branch create --key PROJ-123` to create a git branch from a Jira ticket. " +
      "It generates a branch name from the ticket and optionally transitions Jira to 'In Progress' if workflow automation is enabled.",
    commands: ["shiba branch create --key <KEY>", "shiba branch name --key <KEY>"],
    examples: ["shiba branch create --key PROJ-123", "shiba branch create --key PROJ-123 --description 'add login'"],
  },
  {
    topic: "workflow",
    keywords: ["workflow", "automation", "transitions", "jira status", "auto transition"],
    answer:
      "Workflow automation transitions Jira issues based on git actions. " +
      "Enable via `shiba setup` or config. Commands: `on-branch-create`, `on-mr-create`, `on-merge`.",
    commands: [
      "shiba workflow on-branch-create --key <KEY>",
      "shiba workflow on-mr-create --key <KEY>",
      "shiba workflow on-merge --key <KEY>",
    ],
    examples: ["shiba workflow on-mr-create --key PROJ-123"],
  },
  {
    topic: "jira",
    keywords: ["jira", "issue", "ticket", "atlassian", "jql", "search"],
    answer:
      "Jira commands let you get, create, search, transition, and comment on issues. " +
      "Requires jira-cli (`brew install ankitpokhrel/jira-cli/jira-cli`).",
    commands: [
      "shiba jira issue-get --key <KEY>",
      "shiba jira issue-create --project <PROJ> --type Task --summary 'Title'",
      "shiba jira issue-search --jql 'assignee = currentUser()'",
      "shiba jira issue-transition --key <KEY> --transition 'In Progress'",
      "shiba jira issue-comment --key <KEY> --body 'Comment'",
    ],
    examples: ["shiba jira issue-get --key PROJ-123", "shiba jira issue-search --jql 'status = Open'"],
  },
  {
    topic: "gitlab",
    keywords: ["gitlab", "mr", "merge request", "pipeline", "glab"],
    answer:
      "GitLab commands manage merge requests and pipelines. " +
      "Requires glab CLI (`brew install glab`).",
    commands: [
      "shiba gitlab mr-create --project <PROJ> --source <branch> --target main --title 'Title'",
      "shiba gitlab mr-list --project <PROJ>",
      "shiba gitlab mr-merge --project <PROJ> --iid <IID>",
      "shiba gitlab pipeline-status --project <PROJ> --pipeline-id <ID>",
    ],
    examples: ["shiba gitlab mr-list --project group/repo", "shiba gitlab mr-create --title 'Feature X'"],
  },
  {
    topic: "github",
    keywords: ["github", "pr", "pull request", "gh"],
    answer:
      "GitHub commands manage pull requests and issues. " +
      "Requires gh CLI (`brew install gh`).",
    commands: [
      "shiba github pr-create --title 'Title' --body 'Description'",
      "shiba github pr-list",
      "shiba github pr-merge --number <N>",
      "shiba github issue-get --number <N>",
      "shiba github issue-create --title 'Title'",
    ],
    examples: ["shiba github pr-list", "shiba github pr-create --title 'Add feature'"],
  },
  {
    topic: "notes",
    keywords: ["notes", "ticket notes", "decision", "todo", "context", "remember"],
    answer:
      "Per-ticket notes store context across repos. Categories: decision, todo, warning, info, question, progress.",
    commands: [
      "shiba notes add --key <KEY> --category info --content 'Note text'",
      "shiba notes list --key <KEY>",
      "shiba notes query --key <KEY> --category todo",
      "shiba notes summary --key <KEY>",
      "shiba notes clear --key <KEY>",
    ],
    examples: [
      "shiba notes add --key PROJ-123 --category decision --content 'Use React Query'",
      "shiba notes summary --key PROJ-123",
    ],
  },
  {
    topic: "env",
    keywords: ["environment", "switch env", "env", "multiple", "branch", "data"],
    answer:
      "Environments isolate data via git branches in ~/.shiba-agent/data/. " +
      "Switch environments to work with different configurations.",
    commands: [
      "shiba env list",
      "shiba env current",
      "shiba env create --name <NAME>",
      "shiba env use --name <NAME>",
      "shiba env delete --name <NAME>",
    ],
    examples: ["shiba env list", "shiba env use --name production"],
  },
  {
    topic: "openapi",
    keywords: ["openapi", "oapi", "api", "spec", "swagger", "schema", "endpoint"],
    answer:
      "OpenAPI commands manage API specs. Add specs, fetch them, search paths and schemas.",
    commands: [
      "shiba oapi add --name <NAME> --url <URL>",
      "shiba oapi fetch --name <NAME>",
      "shiba oapi list",
      "shiba oapi path <PATTERN>",
      "shiba oapi schema --list",
      "shiba oapi search <QUERY>",
    ],
    examples: ["shiba oapi add --name petstore --url https://petstore.swagger.io/v2/swagger.json"],
  },
  {
    topic: "figma",
    keywords: ["figma", "design", "styles", "components", "tokens"],
    answer:
      "Figma commands fetch design data. Requires a Figma token in config.",
    commands: [
      "shiba figma file-get --file-key <KEY>",
      "shiba figma node-get --file-key <KEY> --node-ids <IDS>",
      "shiba figma styles --file-key <KEY>",
      "shiba figma components --file-key <KEY>",
    ],
    examples: ["shiba figma styles --file-key abc123"],
  },
  {
    topic: "config",
    keywords: ["config", "configuration", "settings", "preferences", "show config"],
    answer:
      "View and manage configuration. Global config at ~/.shiba-agent/data/config.json, project config at .shiba/config.json.",
    commands: ["shiba config show", "shiba config show --global"],
    examples: ["shiba config show"],
  },
  {
    topic: "tui",
    keywords: ["tui", "interactive", "terminal ui", "navigate", "browse"],
    answer:
      "Launch the interactive TUI to browse and select Jira issues with keyboard navigation.",
    commands: ["shiba tui"],
    examples: ["shiba tui"],
  },
];

export async function ask(opts: AskOpts): Promise<void> {
  const query = opts.query.toLowerCase();

  // Score each knowledge entry by keyword matches
  const matches = KNOWLEDGE_BASE.map((entry) => ({
    entry,
    score: entry.keywords.filter((kw) => query.includes(kw)).length,
  }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    successResponse({
      query: opts.query,
      answer: "I don't have specific guidance for that query. Try `shiba --help` for available commands, or `shiba <command> --help` for details on a specific command.",
      suggestions: ["shiba --help", "shiba <command> --help"],
    });
    return;
  }

  const best = matches[0].entry;
  const related = matches.slice(1, 3).map((m) => m.entry.topic);

  successResponse({
    query: opts.query,
    topic: best.topic,
    answer: best.answer,
    commands: best.commands,
    examples: best.examples,
    relatedTopics: related.length > 0 ? related : undefined,
  });
}
