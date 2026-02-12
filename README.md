# Shiba Agent

Unified CLI for GitLab & Jira integration with Claude Code agents.

## Prerequisites

Shiba wraps official CLIs. Install them first:

```bash
# GitLab CLI
brew install glab

# Jira CLI
brew install ankitpokhrel/jira-cli/jira-cli
```

Then configure each:

```bash
glab auth login  # GitLab authentication
jira init        # Jira configuration
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

## Updating

```bash
cd ~/.shiba-agent
git pull
./setup.sh
```

## CLI Commands

### Core

```bash
shiba init          # Create .shiba/config.json with GitLab project info
shiba tui           # Interactive Jira issue navigator
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

## Claude Code Agents

The setup script automatically links agents to `~/.claude/agents/`:

- **gitlab-agent** — MRs, pipelines, code review
- **jira-agent** — Issues, transitions, JQL searches
- **project-manager** — Orchestrates cross-system workflows

## License

MIT
