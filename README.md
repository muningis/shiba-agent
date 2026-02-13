# Shiba Agent

Unified CLI for GitLab, GitHub & Jira integration with Claude Code agents. Features environment isolation to keep work and personal data separate.

## Prerequisites

Shiba wraps official CLIs. Install the ones you need (all are optional):

```bash
# GitLab CLI (optional)
brew install glab

# GitHub CLI (optional)
brew install gh

# Jira CLI (optional)
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

### Branch & Commit

```bash
shiba branch name --key PROJ-123 --description "add feature"   # Generate branch name
shiba branch create --key PROJ-123 --description "add feature" # Create branch + Jira transition
shiba commit-msg --type feat --description "add login"         # Generate commit message
```

### Core

```bash
shiba init              # Create .shiba/config.json with GitLab project info
shiba tui               # Interactive Jira issue navigator
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

### GitHub (wraps gh)

```bash
shiba github pr-create --title "Add feature"
shiba github pr-list --state open
shiba github pr-merge --number 123 --squash
shiba github issue-get --number 456
shiba github issue-create --title "Bug report"
shiba github issue-list --assignee @me
```

### Jira (wraps jira-cli)

```bash
shiba jira issue-get --key PROJ-123
shiba jira issue-create --project PROJ --type Task --summary "Title"
shiba jira issue-transition --key PROJ-123 --transition "In Progress"
shiba jira issue-search --jql "assignee = currentUser()"
```

### Workflow Automation

Automatic Jira transitions based on git lifecycle events:

```bash
shiba workflow status                        # Show workflow config
shiba workflow on-mr-create --key PROJ-123   # Transition to "Peer Review"
shiba workflow on-merge --key PROJ-123       # Transition to "Ready for QA"
```

Configure workflow in your environment:
```bash
shiba config set workflow-enabled on
```

### Ticket Notes

Per-ticket notes shared across repositories (useful for Claude Code context):

```bash
shiba notes add --key PROJ-123 --category decision --content "Using React Query"
shiba notes list --key PROJ-123              # Token-efficient summary
shiba notes get --key PROJ-123 --id abc123   # Get full note
shiba notes query --key PROJ-123 --category todo
shiba notes summary --key PROJ-123           # Minimal overview
shiba notes clear --key PROJ-123             # Clear all notes
shiba notes tickets                          # List all tickets with notes
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

- **gitlab-agent** — GitLab MRs, pipelines, code review (with Jira workflow automation)
- **github-agent** — GitHub PRs, issues, code review (with Jira workflow automation)
- **jira-agent** — Issues, transitions, JQL searches
- **project-manager** — Orchestrates cross-system workflows

**Security:** `shiba env use` requires interactive confirmation that Claude Code cannot provide, preventing accidental data leakage between environments.

## License

MIT
