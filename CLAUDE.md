# Shiba Agent — GitLab & Jira CLI for Claude Code

This repository provides the `shiba` CLI tool designed to be invoked by Claude Code agents from any project.

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

# 4. Link globally so the CLI works from anywhere
cd src/tools/shiba-cli && bun link && cd ../../..

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
│       └── shiba-cli/    # Unified CLI (init, tui, oapi, gitlab, jira)
├── install.sh
├── package.json
└── tsconfig.base.json
```

## CLI Reference

All output is JSON to stdout.

### Core Commands

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba init` | Initialize project config | `--force` |
| `shiba tui` | Interactive task navigator | — |

**shiba init** detects the GitLab project from git remote and creates `.shiba/config.json`:
```json
{ "repository": "group/project-name" }
```

**shiba tui** launches an interactive terminal UI to navigate your Jira issues.

### OpenAPI Commands (`shiba oapi`)

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba oapi list` | List configured specs | — |
| `shiba oapi add` | Add spec source | `--name`, `--url`, `--auth-token` |
| `shiba oapi fetch` | Fetch/update specs | `--name` or `--all` |
| `shiba oapi path <pattern>` | Find endpoints by path | `--spec` |
| `shiba oapi schema [name]` | Query schemas | `--list`, `--spec` |
| `shiba oapi search <query>` | Search paths & schemas | `--type`, `--spec` |
| `shiba oapi remove` | Remove a spec | `--name` |

### GitLab Commands (`shiba gitlab`)

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba gitlab mr-create` | Create merge request | `--project`, `--source`, `--target`, `--title` |
| `shiba gitlab mr-list` | List merge requests | `--project`, `--state`, `--limit` |
| `shiba gitlab mr-merge` | Merge an MR | `--project`, `--iid`, `--squash` |
| `shiba gitlab mr-comment` | Comment on MR | `--project`, `--iid`, `--body` |
| `shiba gitlab pipeline-status` | Get pipeline + jobs | `--project`, `--pipeline-id` |
| `shiba gitlab pipeline-list` | List pipelines | `--project`, `--ref`, `--limit` |

### Jira Commands (`shiba jira`)

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `shiba jira issue-get` | Get issue details | `--key` |
| `shiba jira issue-create` | Create issue | `--project`, `--type`, `--summary` |
| `shiba jira issue-transition` | Change status | `--key`, `--transition` |
| `shiba jira issue-comment` | Add comment | `--key`, `--body` |
| `shiba jira issue-search` | JQL search | `--jql`, `--max-results` |
| `shiba jira issue-assign` | Assign issue | `--key`, `--assignee` |

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

Three agents are defined in `src/agents/`:

- **gitlab-agent** — GitLab specialist (MRs, pipelines, code review)
- **jira-agent** — Jira specialist (issues, transitions, JQL)
- **project-manager** — Orchestrator that delegates to the above two
