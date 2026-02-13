# Shiba Agent — GitLab, GitHub & Jira CLI for Claude Code

This repository provides the `shiba` CLI tool designed to be invoked by Claude Code agents from any project.

## Prerequisites

Shiba wraps official CLIs for GitLab/GitHub. Install only what you need:

```bash
# GitLab CLI (optional)
brew install glab

# GitHub CLI (optional)
brew install gh
```

Then configure the CLIs you installed:

```bash
# GitLab: authenticate with your instance
glab auth login

# GitHub: authenticate
gh auth login
```

**Jira:** Uses direct REST API - no CLI required. Get an API token from https://id.atlassian.com/manage-profile/security/api-tokens

## Installation

```bash
git clone https://github.com/muningis/shiba-agent.git ~/.shiba-agent
cd ~/.shiba-agent
./setup.sh
```

This will:
1. Install bun if not present
2. Build and link the CLI tool globally
3. Symlink agent definitions to `~/.claude/agents/`

## Updating

```bash
cd ~/.shiba-agent
git pull
./setup.sh
```

## Environment Isolation

Shiba uses git branches to isolate data between environments (work, home, client projects). Each environment has its own:
- Config and preferences (including Jira credentials)
- Cached OpenAPI specs
- Tracked Jira issues
- Ticket notes (shared across repos)
- Figma cache
- GitLab CLI (`glab`) authentication

### Quick Start

```bash
# Create and switch to an environment
shiba env create work
shiba env use work      # Interactive confirmation required

# Configure CLIs and services for this environment
glab auth login         # Authenticates in work environment
shiba setup             # Configure Jira API credentials

# Create another environment
shiba env create home
shiba env use home
glab auth login         # Different GitLab account
shiba setup             # Different Jira instance
```

### Environment Commands

| Command | Purpose | Notes |
|---------|---------|-------|
| `shiba env init` | Initialize data directory | Run automatically by setup.sh |
| `shiba env create <name>` | Create new environment | |
| `shiba env use <name>` | Switch environment | **Interactive** - requires typing 'yes' |
| `shiba env list` | List all environments | |
| `shiba env current` | Show current environment | |
| `shiba env delete <name>` | Delete environment | **Interactive** - requires confirmation |
| `shiba env migrate` | Migrate legacy data | For upgrades from older versions |

**Security:** `shiba env use` requires interactive confirmation that Claude Code cannot provide. This prevents accidental data leakage between environments.

## Configuration

### Jira Authentication

Jira uses direct REST API with Basic Auth. Configure via `shiba setup` or environment variables:

```json
{
  "jira": {
    "host": "https://company.atlassian.net",
    "email": "user@company.com",
    "token": "YOUR_API_TOKEN"
  }
}
```

Environment variable fallbacks:
- `JIRA_HOST` - Jira instance URL
- `JIRA_EMAIL` - Your Jira email
- `JIRA_API_TOKEN` - API token from https://id.atlassian.com/manage-profile/security/api-tokens

GitLab/GitHub authentication is handled by their respective CLIs (`glab` and `gh`), isolated per environment.

### Preferences

Preferences are stored per-environment in `~/.shiba-agent/data/config.json`, with per-project overrides in `.shiba/config.json`.

```json
{
  "preferences": {
    "defaultJql": "assignee = currentUser() AND status != Done",
    "branchNaming": {
      "pattern": "{key}/{description}"
    },
    "commitMessage": {
      "style": "conventional"
    },
    "signatures": {
      "shibaSignature": false
    }
  }
}
```

| Setting | Description | Default |
|---------|-------------|---------|
| `branchNaming.pattern` | Branch name template. Placeholders: `{key}`, `{description}`, `{type}` | `{key}/{description}` |
| `commitMessage.style` | `conventional` or `custom` | `conventional` |
| `commitMessage.template` | Custom template (when style=custom). Placeholders: `{key}`, `{type}`, `{scope}`, `{description}` | — |
| `signatures.shibaSignature` | Add 🐕 Shiba Agent signature to comments | `false` |
| `workflow.enabled` | Enable automatic Jira transitions | `false` |
| `workflow.transitions.onBranchCreate` | Jira status when branch is created | `In Progress` |
| `workflow.transitions.onMrCreate` | Jira status when MR/PR is created | `Peer Review` |
| `workflow.transitions.onMerge` | Jira status when MR/PR is merged | `Ready for QA` |

Use `shiba config` commands to manage settings:

```bash
shiba config show                    # Show effective config
shiba config show --global           # Show global config only
shiba config set branch-pattern "feature/{key}" --global
shiba config set commit-style conventional
shiba config set shiba-signature on
```

## Project Structure

```
~/.shiba-agent/
├── data/                 # Git repo for environment data
│   ├── .git/             # Local git (branch = environment)
│   ├── config.json       # Per-environment config (preferences + Jira credentials)
│   ├── oapi/             # Cached OpenAPI specs
│   ├── issues/           # Tracked Jira issues
│   ├── tickets/          # Per-ticket notes (shared across repos)
│   ├── figma/            # Cached Figma files
│   └── glab/             # GitLab CLI config (symlinked from ~/.config/glab-cli)
├── src/
│   ├── agents/           # Agent definitions (symlinked to ~/.claude/agents/)
│   ├── packages/shared/  # Shared library
│   └── tools/shiba-cli/  # Unified CLI
├── setup.sh              # Post-clone setup script
└── ...
```

## CLI Reference

All output is JSON to stdout.

### Core Commands

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba setup` | Interactive setup wizard (auth + preferences) | `--reset`, `--defaults`, `--skip-auth` |
| `shiba init` | Initialize project config + generate CLAUDE.md | `--force`, `--skip-claude-md` |
| `shiba tui` | Interactive task navigator | — |
| `shiba ask <query>` | Get help on shiba usage | — |
| `shiba branch name` | Generate branch name (no git operation) | `--key`, `--description`, `--type` |
| `shiba branch create` | Create git branch + Jira transition | `--key`, `--description`, `--type`, `--no-transition` |
| `shiba worktree create` | Create worktree + branch for an issue | `--key`, `--description`, `--path` |
| `shiba worktree list` | List all git worktrees | — |
| `shiba worktree remove` | Remove a git worktree | `--path`, `--force` |
| `shiba commit-msg` | Generate commit message | `--type`, `--description`, `--key`, `--scope` |
| `shiba config show` | Show configuration | `--global`, `--project` |
| `shiba config set` | Set configuration value | `--key`, `--value`, `--global` |

**shiba setup** guides the user through CLI authentication and preference configuration. Use `--reset` to reconfigure an existing environment, `--defaults` to skip prompts and apply defaults, or `--skip-auth` to skip CLI authentication.

**shiba init** detects the repository from git remote, creates `.shiba/config.json`, and generates a project-level `CLAUDE.md` with shiba agent instructions:
```json
{ "repository": "group/project-name" }
```
The generated `CLAUDE.md` section is wrapped in `<!-- shiba-agent:start -->` / `<!-- shiba-agent:end -->` markers. Running `shiba init` again updates only the managed section, preserving any custom content. Use `--skip-claude-md` to skip `CLAUDE.md` generation.

**shiba tui** launches an interactive terminal UI to navigate your Jira issues.

### OpenAPI Commands (`shiba oapi`)

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba oapi list` | List configured specs | — |
| `shiba oapi add` | Add spec source | `--name`, `--url`, `--auth-token`, `--auth-type`, `--auth-header` |
| `shiba oapi fetch` | Fetch/update specs | `--name` or `--all` |
| `shiba oapi path <pattern>` | Find endpoints by path | `--spec` |
| `shiba oapi schema [name]` | Query schemas | `--list`, `--spec` |
| `shiba oapi search <query>` | Search paths & schemas | `--type`, `--spec` |
| `shiba oapi remove` | Remove a spec | `--name` |

**Authentication for protected specs:**

```bash
# Bearer token (default)
shiba oapi add --name api --url https://api.example.com/openapi.json --auth-token "TOKEN"

# API key with custom header
shiba oapi add --name api --url https://api.example.com/openapi.json \
  --auth-type apikey --auth-token "KEY" --auth-header "X-API-Key"

# Basic auth (token = base64 of username:password)
shiba oapi add --name api --url https://api.example.com/openapi.json \
  --auth-type basic --auth-token "dXNlcjpwYXNz"
```

### GitLab Commands (`shiba gitlab`)

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba gitlab mr-create` | Create merge request | `--project`, `--source`, `--target`, `--title` |
| `shiba gitlab mr-list` | List merge requests | `--project`, `--state`, `--limit` |
| `shiba gitlab mr-merge` | Merge an MR | `--project`, `--iid`, `--squash` |
| `shiba gitlab mr-comment` | Comment on MR (standalone note) | `--project`, `--iid`, `--body` |
| `shiba gitlab mr-discussion-list` | List discussion threads | `--iid`, `--project` |
| `shiba gitlab mr-discussion-create` | Start new discussion thread | `--iid`, `--body`, `--project` |
| `shiba gitlab mr-discussion-reply` | Reply in existing thread | `--discussion-id`, `--body`, `--project` |
| `shiba gitlab pipeline-status` | Get pipeline + jobs | `--project`, `--pipeline-id` |
| `shiba gitlab pipeline-list` | List pipelines | `--project`, `--ref`, `--limit` |
| `shiba gitlab issue-get` | Get issue details | `--iid`, `--project` |
| `shiba gitlab issue-create` | Create issue | `--title`, `--description`, `--labels` |
| `shiba gitlab issue-list` | List issues | `--state`, `--limit`, `--assignee` |
| `shiba gitlab issue-comment` | Comment on issue | `--iid`, `--body`, `--project` |

### GitHub Commands (`shiba github`)

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba github pr-create` | Create pull request | `--title`, `--body`, `--base`, `--draft` |
| `shiba github pr-list` | List pull requests | `--state`, `--limit`, `--author` |
| `shiba github pr-merge` | Merge a PR | `--number`, `--squash`, `--delete-branch` |
| `shiba github pr-comment` | Comment on PR | `--number`, `--body` |
| `shiba github issue-get` | Get issue details | `--number`, `--repo` |
| `shiba github issue-create` | Create issue | `--title`, `--body`, `--labels` |
| `shiba github issue-list` | List issues | `--state`, `--limit`, `--assignee` |
| `shiba github issue-comment` | Comment on issue | `--number`, `--body` |

### Jira Commands (`shiba jira`)

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba jira issue-get` | Get issue details | `--key`, `--no-track` |
| `shiba jira issue-create` | Create issue | `--project`, `--type`, `--summary` |
| `shiba jira issue-transition` | Change status | `--key`, `--transition` |
| `shiba jira issue-comment` | Add comment | `--key`, `--body` |
| `shiba jira issue-search` | JQL search | `--jql`, `--max-results` |
| `shiba jira issue-assign` | Assign issue | `--key`, `--assignee` |

### Issue Tracking Commands (`shiba issue`)

Local issue tracking for agent workflow. Issue files are stored in `~/.shiba-agent/data/issues/<KEY>.json` (per-environment).

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba issue list` | List tracked issues | — |
| `shiba issue show` | Show full issue data | `--key` |
| `shiba issue add-note` | Add agent note | `--key`, `--content`, `--category` |
| `shiba issue add-mr` | Link merge request | `--key`, `--project`, `--iid`, `--primary` |
| `shiba issue add-api` | Add API endpoint | `--key`, `--method`, `--path`, `--description` |
| `shiba issue add-context` | Add context reference | `--key`, `--type`, `--path`, `--description`, `--relevance` |
| `shiba issue add-figma` | Add Figma reference | `--key`, `--url`, `--name` |
| `shiba issue progress` | Update progress | `--key`, `--status`, `--percent`, `--blocker` |
| `shiba issue set-analysis` | Set analysis data | `--key`, `--summary`, `--acceptance-criteria` |
| `shiba issue add-requirement` | Add requirement | `--key`, `--title`, `--description`, `--type`, `--priority` |

**Note:** `shiba jira issue-get` automatically creates/updates the local issue tracking file. Use `--no-track` to disable this behavior.

### Worktree Commands (`shiba worktree`)

Work on multiple issues simultaneously using git worktrees.

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba worktree create` | Create worktree + branch for issue | `--key`, `--description`, `--type`, `--path` |
| `shiba worktree list` | List all worktrees | — |
| `shiba worktree remove` | Remove a worktree | `--path`, `--force` |

**Worktree workflow:**
```bash
# Create worktree for an issue (creates branch + working directory)
shiba worktree create --key PROJ-123 --description "add-login"
# Output: { path: "../my-app-worktrees/PROJ-123-add-login", hint: "cd ..." }

# List all active worktrees
shiba worktree list

# Remove worktree when done (branch remains)
shiba worktree remove --path ../my-app-worktrees/PROJ-123-add-login
```

**Default location:** Worktrees are created at `../<repo>-worktrees/<branch>` to keep them organized outside the main repository.

### Workflow Commands (`shiba workflow`)

Automatic Jira transitions based on git lifecycle events. Enable with `shiba config set workflow-enabled on`.

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba workflow status` | Show workflow config | — |
| `shiba workflow on-mr-create` | Transition to "Peer Review" | `--key`, `--draft` |
| `shiba workflow on-merge` | Transition to "Ready for QA" | `--key` |

**Integration:** Call these after MR/PR operations to automate Jira transitions:
```bash
# After creating an MR
shiba gitlab mr-create ... && shiba workflow on-mr-create --key PROJ-123

# After merging
shiba gitlab mr-merge ... && shiba workflow on-merge --key PROJ-123
```

### Ticket Notes Commands (`shiba notes`)

Per-ticket notes shared across repositories. Useful for Claude Code to track decisions, todos, and context without loading full issue files.

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba notes add` | Add a note | `--key`, `--content`, `--category` |
| `shiba notes list` | List notes (summary) | `--key` |
| `shiba notes get` | Get full note | `--key`, `--id` |
| `shiba notes query` | Query with filters | `--key`, `--category`, `--limit` |
| `shiba notes summary` | Token-efficient overview | `--key` |
| `shiba notes delete` | Delete a note | `--key`, `--id` |
| `shiba notes clear` | Clear all notes | `--key` |
| `shiba notes tickets` | List all tickets with notes | — |

**Categories:** `decision`, `todo`, `warning`, `info`, `question`, `progress`

**Token-efficient workflow:**
```bash
# Get summary first (minimal tokens)
shiba notes summary --key PROJ-123

# Fetch specific notes by ID if needed
shiba notes get --key PROJ-123 --id abc123
```

Run `shiba <command> --help` for full option details.

## JSON Output Convention

Success:
```json
{ "success": true, "data": { ... }, "timestamp": "2026-02-12T..." }
```

Error (written to stderr):
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." }, "timestamp": "..." }
```

## Agents

Agents are defined in `src/agents/`:

- **gitlab-agent** — GitLab specialist (MRs, pipelines, code review)
- **github-agent** — GitHub specialist (PRs, issues, workflows)
- **jira-agent** — Jira specialist (issues, transitions, JQL)
- **oapi-agent** — OpenAPI specialist (endpoint discovery, schema analysis, API guidance)
- **project-manager** — Orchestrator that delegates to specialist agents
- **task-agent** — Task execution and planning

## Docker Sandbox for Claude Code

This repository includes `.claude/settings.json` to enforce Docker sandbox mode. To enable sandbox in projects using shiba-agent, create `.claude/settings.json`:

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true
  }
}
```

| Setting | Description |
|---------|-------------|
| `sandbox.enabled` | Forces Docker sandbox mode for all bash commands |
| `autoAllowBashIfSandboxed` | Auto-approves bash commands since they run in isolation |
