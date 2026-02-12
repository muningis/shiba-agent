# Agent Tools — GitLab & Jira CLI for Claude Code

This repository provides two globally-installed CLI tools (`gitlab-cli` and `jira-cli`)
designed to be invoked by Claude Code agents from any project.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/muningis/agent-tools/main/install.sh | sh
```

This will:
1. Install bun if not present
2. Clone the repository to `~/.agent-tools`
3. Build and link the CLI tools globally
4. Symlink agent definitions to `~/.claude/agents/`

## Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/muningis/agent-tools.git
cd agent-tools

# 2. Install dependencies
bun install

# 3. Build all packages
bun run build

# 4. Link globally so the CLIs work from anywhere
cd src/tools/gitlab-cli && bun link && cd ../../..
cd src/tools/jira-cli && bun link && cd ../../..

# 5. Symlink agent definitions to ~/.claude/agents/
mkdir -p ~/.claude/agents
ln -s "$(pwd)/src/agents/gitlab-agent.md" ~/.claude/agents/
ln -s "$(pwd)/src/agents/jira-agent.md" ~/.claude/agents/
ln -s "$(pwd)/src/agents/project-manager.md" ~/.claude/agents/
```

## Environment Variables

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# GitLab
export GITLAB_HOST=https://gitlab.example.com
export GITLAB_TOKEN=glpat-xxxxxxxxxxxx

# Jira
export JIRA_HOST=https://your-domain.atlassian.net
export JIRA_EMAIL=you@example.com
export JIRA_TOKEN=your-api-token
```

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `GITLAB_HOST` | GitLab instance URL | Your GitLab URL |
| `GITLAB_TOKEN` | Personal access token (api scope) | GitLab → Settings → Access Tokens |
| `JIRA_HOST` | Jira Cloud URL | Your Atlassian URL |
| `JIRA_EMAIL` | Atlassian account email | Your login email |
| `JIRA_TOKEN` | API token | https://id.atlassian.com/manage/api-tokens |

## Project Structure

```
agent-tools/
├── src/
│   ├── agents/           # Agent definitions (symlinked to ~/.claude/agents/)
│   ├── packages/shared/  # Shared library
│   └── tools/
│       ├── gitlab-cli/
│       └── jira-cli/
├── install.sh
├── package.json
└── tsconfig.base.json
```

## CLI Tools Reference

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
