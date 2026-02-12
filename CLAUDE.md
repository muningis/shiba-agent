# Shiba Agent — GitLab & Jira CLI for Claude Code

This repository provides CLI tools (`shiba`, `gitlab-cli`, and `jira-cli`)
designed to be invoked by Claude Code agents from any project.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/muningis/shiba-agent/main/install.sh | sh
```

This will:
1. Install bun if not present
2. Clone the repository to `~/.shiba-agent`
3. Build and link the CLI tools globally
4. Symlink agent definitions to `~/.claude/agents/`

## Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/muningis/shiba-agent.git
cd shiba-agent

# 2. Install dependencies
bun install

# 3. Build all packages
bun run build

# 4. Link globally so the CLIs work from anywhere
cd src/tools/shiba-cli && bun link && cd ../../..
cd src/tools/gitlab-cli && bun link && cd ../../..
cd src/tools/jira-cli && bun link && cd ../../..

# 5. Symlink agent definitions to ~/.claude/agents/
mkdir -p ~/.claude/agents
ln -s "$(pwd)/src/agents/gitlab-agent.md" ~/.claude/agents/
ln -s "$(pwd)/src/agents/jira-agent.md" ~/.claude/agents/
ln -s "$(pwd)/src/agents/project-manager.md" ~/.claude/agents/
```

## Configuration

Create `~/.shiba-agent/config.json`:

```json
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
```

| Field | Description | How to get it |
|-------|-------------|---------------|
| `gitlab.host` | GitLab instance URL | Your GitLab URL |
| `gitlab.token` | Personal access token (api scope) | GitLab → Settings → Access Tokens |
| `jira.host` | Jira Cloud URL | Your Atlassian URL |
| `jira.email` | Atlassian account email | Your login email |
| `jira.token` | API token | https://id.atlassian.com/manage/api-tokens |

## Project Structure

```
shiba-agent/
├── src/
│   ├── agents/           # Agent definitions (symlinked to ~/.claude/agents/)
│   ├── packages/shared/  # Shared library
│   └── tools/
│       ├── shiba-cli/    # Main CLI (shiba init, shiba tui)
│       ├── gitlab-cli/
│       └── jira-cli/
├── install.sh
├── package.json
└── tsconfig.base.json
```

## CLI Tools Reference

### shiba

Main CLI for project setup and task navigation.

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba init` | Initialize project config | `--force` |
| `shiba tui` | Interactive task navigator | — |

**shiba init** detects the GitLab project from git remote and creates `shiba.json`:
```json
{ "repository": "group/project-name" }
```

**shiba tui** launches an interactive terminal UI to navigate your Jira issues.

### gitlab-cli

Invoked via Bash. All output is JSON to stdout.

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `gitlab-cli mr-create` | Create merge request | `--project`, `--source`, `--target`, `--title` |
| `gitlab-cli mr-list` | List merge requests | `--project`, `--state`, `--limit` |
| `gitlab-cli mr-merge` | Merge an MR | `--project`, `--iid`, `--squash` |
| `gitlab-cli mr-comment` | Comment on MR | `--project`, `--iid`, `--body` |
| `gitlab-cli pipeline-status` | Get pipeline + jobs | `--project`, `--pipeline-id` |
| `gitlab-cli pipeline-list` | List pipelines | `--project`, `--ref`, `--limit` |

Run `gitlab-cli <command> --help` for full option details.

### jira-cli

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `jira-cli issue-get` | Get issue details | `--key` |
| `jira-cli issue-create` | Create issue | `--project`, `--type`, `--summary` |
| `jira-cli issue-transition` | Change status | `--key`, `--transition` |
| `jira-cli issue-comment` | Add comment | `--key`, `--body` |
| `jira-cli issue-search` | JQL search | `--jql`, `--max-results` |
| `jira-cli issue-assign` | Assign issue | `--key`, `--assignee` |

Run `jira-cli <command> --help` for full option details.

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

Three agents are defined in `src/agents/`:

- **gitlab-agent** — GitLab specialist (MRs, pipelines, code review)
- **jira-agent** — Jira specialist (issues, transitions, JQL)
- **project-manager** — Orchestrator that delegates to the above two
