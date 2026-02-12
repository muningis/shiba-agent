# Shiba Agent

Unified CLI for GitLab & Jira integration with Claude Code agents. Features environment isolation to keep work and personal data separate.

## Prerequisites

Shiba wraps official CLIs. Install them first:

```bash
# GitLab CLI
brew install glab

# Jira CLI
brew install ankitpokhrel/jira-cli/jira-cli
```

## Installation

```bash
git clone https://github.com/muningis/shiba-agent.git ~/.shiba-agent
cd ~/.shiba-agent
./setup.sh
```

This will:
1. Install bun if needed
2. Build the CLI
3. Link `shiba` command globally
4. Symlink agent definitions to `~/.claude/agents/`
5. Initialize data directory for environment isolation

## Environment Setup

Shiba uses git branches to isolate data between environments (work, home, clients):

```bash
# Create and switch to an environment
shiba env create work
shiba env use work      # Interactive confirmation required

# Configure CLIs for this environment
glab auth login         # GitLab auth stored per-environment
jira init               # Jira config stored per-environment
```

Each environment has isolated: config, issues, OpenAPI specs, Figma cache, and CLI auth.

## Updating

```bash
cd ~/.shiba-agent
git pull
./setup.sh
```

## CLI Commands

### Environment

```bash
shiba env list          # List all environments
shiba env create <name> # Create new environment
shiba env use <name>    # Switch environment (interactive)
shiba env current       # Show current environment
shiba env delete <name> # Delete environment (interactive)
```

### Core

```bash
shiba init              # Create .shiba/config.json with GitLab project info
shiba tui               # Interactive Jira issue navigator
shiba branch --key PROJ-123 --description "add feature"  # Generate branch name
shiba commit-msg --type feat --description "add login"   # Generate commit message
shiba config show       # Show effective configuration
```

### OpenAPI

```bash
shiba oapi add --name api --url https://api.example.com/openapi.json
shiba oapi fetch --all
shiba oapi path "/v1/users/*"
shiba oapi schema User
shiba oapi search "authentication"
```

### GitLab (wraps glab)

```bash
shiba gitlab mr-create --project <id> --source <branch> --target <branch> --title <title>
shiba gitlab mr-list --project <id> --state opened
shiba gitlab mr-merge --project <id> --iid <iid>
shiba gitlab pipeline-list --project <id>
shiba gitlab pipeline-status --project <id> --pipeline-id <id>
```

### Jira (wraps jira-cli)

```bash
shiba jira issue-get --key PROJ-123
shiba jira issue-create --project PROJ --type Task --summary "Title"
shiba jira issue-transition --key PROJ-123 --transition "In Progress"
shiba jira issue-search --jql "assignee = currentUser()"
```

### Figma

```bash
shiba figma file-get --file-key <key>
shiba figma node-get --file-key <key> --node-ids <ids>
shiba figma styles --file-key <key>
shiba figma components --file-key <key>
```

## Configuration

Preferences can be set per-environment or per-project:

```bash
shiba config set branch-pattern "feature/{key}"  # Branch naming pattern
shiba config set commit-style conventional       # Commit message style
shiba config set shiba-signature on              # Add signature to comments
```

## Claude Code Agents

The setup script automatically links agents to `~/.claude/agents/`:

- **gitlab-agent** — MRs, pipelines, code review
- **jira-agent** — Issues, transitions, JQL searches
- **project-manager** — Orchestrates cross-system workflows

**Security:** `shiba env use` requires interactive confirmation that Claude Code cannot provide, preventing accidental data leakage between environments.

## License

MIT
