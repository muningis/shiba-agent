# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-13

### Added

- **Direct Jira REST API** - Replaced `jira-cli` dependency with direct Jira REST API calls. Configure via `shiba setup` or environment variables (`JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`).
- **`shiba setup` wizard** - Interactive setup for CLI authentication (GitLab, GitHub) and Jira API configuration.
- **`shiba ask` command** - Get help on shiba usage directly from the CLI.
- **`shiba update` command** - Update shiba-agent from origin/main with automatic rebuild.
- **Workflow automation** - Automatic Jira transitions on branch create, MR/PR create, and merge.
- **Docker sandbox config** - Added `.claude/settings.json` to enforce sandbox mode for Claude Code.
- **OpenAPI authentication** - Support for `--auth-token`, `--auth-type` (bearer/basic/apikey), and `--auth-header` options in `shiba oapi add`.

### Removed

- **`jira-cli` dependency** - No longer required. Jira integration uses direct REST API.

## [1.0.0] - Initial Release

### Added

- Unified CLI for GitLab, GitHub, and Jira integration
- Environment isolation using git branches
- OpenAPI spec management
- Issue tracking and ticket notes
- Branch naming and commit message generation
- Claude Code agent definitions
