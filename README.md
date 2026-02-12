# Shiba Agent

CLI tools for GitLab & Jira integration with Claude Code agents.

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

2. **Link CLIs globally**:
   ```bash
   cd src/tools/shiba-cli && bun link && cd ../../..
   cd src/tools/gitlab-cli && bun link && cd ../../..
   cd src/tools/jira-cli && bun link && cd ../../..
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

## CLI Tools

### shiba

```bash
shiba init          # Create shiba.json with GitLab project info
shiba tui           # Interactive Jira issue navigator
```

### gitlab-cli

```bash
gitlab-cli mr-create --project <id> --source <branch> --target <branch> --title <title>
gitlab-cli mr-list --project <id> --state opened
gitlab-cli mr-merge --project <id> --iid <iid>
gitlab-cli pipeline-list --project <id>
gitlab-cli pipeline-status --project <id> --pipeline-id <id>
```

### jira-cli

```bash
jira-cli issue-get --key PROJ-123
jira-cli issue-create --project PROJ --type Task --summary "Title"
jira-cli issue-transition --key PROJ-123 --transition "In Progress"
jira-cli issue-search --jql "assignee = currentUser()"
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
