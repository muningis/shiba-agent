# Shiba Agent

Unified CLI for GitLab & Jira integration with Claude Code agents.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/muningis/shiba-agent/main/install.sh | sh
```

## Setup

1. **Install** (requires [bun](https://bun.sh)):
   ```bash
   git clone https://github.com/muningis/shiba-agent.git
   cd shiba-agent
   bun install && bun run build
   ```

2. **Link CLI globally**:
   ```bash
   cd src/tools/shiba-cli && bun link && cd ../../..
   ```

3. **Configure credentials** (`~/.shiba-agent/config.json`):
   ```bash
   mkdir -p ~/.shiba-agent
   cat > ~/.shiba-agent/config.json << 'EOF'
   {
     "gitlab": {
       "host": "https://gitlab.example.com",
       "token": "glpat-xxxxxxxxxxxx"
     },
     "jira": {
       "host": "https://your-domain.atlassian.net",
       "email": "you@example.com",
       "token": "your-api-token"
     }
   }
   EOF
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

### GitLab

```bash
shiba gitlab mr-create --project <id> --source <branch> --target <branch> --title <title>
shiba gitlab mr-list --project <id> --state opened
shiba gitlab mr-merge --project <id> --iid <iid>
shiba gitlab pipeline-list --project <id>
shiba gitlab pipeline-status --project <id> --pipeline-id <id>
```

### Jira

```bash
shiba jira issue-get --key PROJ-123
shiba jira issue-create --project PROJ --type Task --summary "Title"
shiba jira issue-transition --key PROJ-123 --transition "In Progress"
shiba jira issue-search --jql "assignee = currentUser()"
```

## Claude Code Agents

Copy agents to `~/.claude/agents/` for global availability:

```bash
mkdir -p ~/.claude/agents
ln -s "$(pwd)/src/agents/"*.md ~/.claude/agents/
```

- **gitlab-agent** — MRs, pipelines, code review
- **jira-agent** — Issues, transitions, JQL searches
- **project-manager** — Orchestrates cross-system workflows

## License

MIT
