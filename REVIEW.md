# Shiba Agent — Code Review

Comprehensive module-by-module code review with proposed changes.

---

## Table of Contents

1. [Shared Library](#1-shared-library-srcpackagesshared)
2. [CLI Commands](#2-cli-commands-srctoolsshiba-clisrccommands)
3. [OpenAPI Module](#3-openapi-module-srctoolsshiba-clisrcopenapi)
4. [Issue Tracking Module](#4-issue-tracking-module-srctoolsshiba-clisrcissues)
5. [Figma Module](#5-figma-module-srctoolsshiba-clisrcfigma)
6. [TUI Module](#6-tui-module-srctoolsshiba-clisrctui)
7. [Agents & Skills](#7-agents--skills-srcagents--srcskills)
8. [Build & Setup](#8-build--setup)
9. [Cross-Cutting Concerns](#9-cross-cutting-concerns)

---

## 1. Shared Library (`src/packages/shared/`)

### 1.1 Config — `config/global.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 1.1.1 | **Medium** | `findRepoRoot()` fallback at line 75 hardcodes "5 levels deep" assumption. If directory structure changes, this silently resolves to the wrong path. | Remove magic fallback. Throw an explicit error instead: `throw new Error("Could not find shiba-agent repo root")`. |
| 1.1.2 | **Low** | `REPO_ROOT`, `CONFIG_DIR`, etc. are computed eagerly at module import time (line 78-83). Any failure crashes all imports. | Keep as-is for CLI context (runs once and exits). If ever used in a library context, convert to lazy getters. |
| 1.1.3 | **Low** | `loadGlobalConfig()` silently returns `{}` on JSON parse failure (line 135). Corrupt config is indistinguishable from empty config. | Log a warning to stderr when JSON parsing fails, so users know their config is broken. |
| 1.1.4 | **Low** | No config schema validation. Typos in config keys (e.g. `gitLab` instead of `gitlab`) are silently ignored. | Consider adding minimal runtime validation (check for unexpected top-level keys). |

### 1.2 Auth — `auth/gitlab.ts`, `auth/jira.ts`, `auth/figma.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 1.2.1 | **Low** | Module-level singleton cache (`let _client = null`). Correct for CLI but would break in long-lived processes or tests. | Acceptable for current use. Add a comment documenting the singleton assumption. |
| 1.2.2 | **Info** | All three auth modules follow the same pattern: load config → check fields → error on missing → create client. Clean and consistent. | No change needed. |

### 1.3 Output — `output/json.ts`, `output/error.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 1.3.1 | **Low** | `mapErrorToCode()` in `error.ts:23-34` maps errors by substring matching on `err.message`. This is fragile — a library upgrade changing message wording breaks the mapping. | Acceptable for now; consider also checking `err.cause?.status` or HTTP status codes directly when available, as the code already extracts `statusCode` at line 11-14. |
| 1.3.2 | **Info** | `successResponse()` doesn't call `process.exit()` while `errorResponse()` does. Intentional and correct — success returns normally, error terminates. | No change needed. |

### 1.4 Types — `types/index.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 1.4.1 | **Info** | Clean discriminated union with `CliOutput<T>`. Well-structured type hierarchy. | No change needed. |

### 1.5 Package Config — `package.json`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 1.5.1 | **Low** | Exports map (line 7-13) doesn't include `auth/figma` or `config/global` paths, but they are imported by the CLI tool. Works via direct dist path imports but isn't formalized. | Add missing export paths: `"./auth/figma"`, `"./config/global"`, `"./output/error"`. |

---

## 2. CLI Commands (`src/tools/shiba-cli/src/commands/`)

### 2.1 CLI Entry — `cli.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 2.1.1 | **Medium** | 617-line monolithic command registration file. Every command has identical `try { await fn(opts) } catch (err) { handleCliError(err) }` boilerplate. | Extract a helper: `function wrapAction(fn) { return async (...args) => { try { await fn(...args) } catch(err) { handleCliError(err) } } }`. Reduces each registration to a single line. |
| 2.1.2 | **Low** | `--no-track` option (line 316-319) results in double negation: `opts.track` is `true` by default, then inverted to `noTrack: !opts.track`. Confusing. | Keep the Commander convention but add a comment explaining the inversion. |

### 2.2 GitLab Commands — `commands/gitlab.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 2.2.1 | **Medium** | `mrCreate` (line 25): Prepends `"Draft: "` to title manually. GitLab's API also supports a `draft` field natively. If GitLab sees both `Draft:` prefix AND `draft: false`, behavior is ambiguous. | Use GitLab's native draft API field instead of title manipulation. Remove the prefix logic and pass `draft: opts.draft` to the API call. |
| 2.2.2 | **Low** | `mrList` (line 70): `opts.state` is cast to a union type with `as`. No validation that the input is actually one of the valid values. | Add input validation or use Commander's `.choices()` method for the `--state` option. |
| 2.2.3 | **Low** | MR response mapping uses `String()` extensively (lines 45-52, 85-92). Defensive but verbose. The same mapping logic is duplicated between `mrCreate` and `mrList`. | Extract a shared `toMRSummary(mr)` mapper function. |
| 2.2.4 | **Low** | `pipelineStatus` (line 161): Jobs typed as `Array<Record<string, unknown>>` — loses all type safety. | Use gitbeaker's job type if available, or define a local interface. |

### 2.3 Jira Commands — `commands/jira.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 2.3.1 | **High** | `issueGet` (lines 47-60 vs 67-82): Jira field extraction logic is duplicated — once for the CLI response summary and once for the tracked issue data. Same field access patterns repeated. | Extract a shared mapping function like `mapJiraFields(issue)` that returns both the summary and jira data. |
| 2.3.2 | **Medium** | `parseDescription()` (line 92-104): ADF parsing only handles text within paragraph blocks. Lists, tables, code blocks, mentions, headings, inline cards, and other ADF node types are silently dropped. | Expand ADF parsing to handle at minimum: `heading`, `bulletList`, `orderedList`, `listItem`, `codeBlock`, `blockquote`. Consider using a dedicated ADF-to-text library. |
| 2.3.3 | **Medium** | `issueComment` (line 271-274): Double type assertion `as unknown as Record<string, unknown>` to work around jira.js typing. Fragile and hides potential runtime errors. | Pin the jira.js version and add an integration test. Document why the cast is necessary. |
| 2.3.4 | **Medium** | `issueAssign` (line 332): `accountId: accountId as string` when `accountId` is `null` (the "unassigned" case). Passing `null as string` is a type lie. | Use a type assertion that matches reality: `accountId: accountId as string \| null`, or use a conditional call: if unassigned, call with `accountId: null` explicitly typed. |
| 2.3.5 | **Low** | `issueCreate` (line 176): `result as unknown as Record<string, unknown>` — unsafe double cast on API response. | Add runtime check for `result` shape before accessing fields. |

### 2.4 Issue Commands — `commands/issue.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 2.4.1 | **Low** | Every command function follows identical pattern: load → null-check → error → operate → save. 10 functions with near-identical structure. | Extract a helper: `withIssue(key, fn)` that handles load/null-check/error, then calls `fn(issue)`. Saves and responds. |
| 2.4.2 | **Low** | `issueShow` (line 62): `return` statement after `errorResponse()` is unreachable dead code since `errorResponse` returns `never`. Same pattern in all other functions. | Remove unreachable `return` statements after `errorResponse()` calls. |

### 2.5 OpenAPI Commands — `commands/oapi.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 2.5.1 | **Low** | `oapiFetch` (line 108): Fetches specs sequentially in a `for...of` loop. Multiple specs could be fetched in parallel. | Use `Promise.allSettled()` for parallel fetching. |
| 2.5.2 | **Low** | `getSpecsToQuery()` (line 242): Return type uses complex `ReturnType<typeof getCachedSpec>` with `NonNullable` cast at line 282. | Simplify: define an explicit return type `Array<[string, CachedSpec]>`. |

### 2.6 Init Command — `commands/init.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 2.6.1 | **Low** | `detectGitlabProject()` (line 110): `.git` suffix removal is redundant — the three regexes above already strip `.git` via `(?:\.git)?$`. | Remove the redundant `.git` check at lines 110-112. |
| 2.6.2 | **Low** | `updateGitignore()` (line 56): Only adds `.shiba/tasks/` to gitignore but not `.shiba/issues/` or other generated paths. | Consider adding `.shiba/` entirely or at minimum `.shiba/tasks/` and document what should/shouldn't be committed. |
| 2.6.3 | **Low** | `updateGitignore()` uses relative path `".gitignore"` (line 55) — depends on `process.cwd()`. | Pass cwd explicitly for consistency with `project.ts` functions. |

### 2.7 Figma Commands — `commands/figma.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 2.7.1 | **Low** | Uses different registration pattern from other command files — returns a `Command` instance via `createFigmaCommands()` instead of exporting individual action functions. | Acceptable pattern, but inconsistent. Consider documenting the rationale or aligning with other modules. |

---

## 3. OpenAPI Module (`src/tools/shiba-cli/src/openapi/`)

### 3.1 Types — `types.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 3.1.1 | **Low** | `SchemaObject` includes `$ref` field (line 83) but `ReferenceObject` is a separate interface. Having `$ref` on both types can confuse consumers about which to use for type narrowing. | Remove `$ref` from `SchemaObject`. Use `SchemaObject \| ReferenceObject` union where refs are possible (already done in most places). |

### 3.2 Fetch — `fetch.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 3.2.1 | **Medium** | `fetchSpec()` (line 11-14): Returns dereferenced spec regardless of validation result. Invalid specs are cached and queried as if valid. | Check `validation.valid` and either throw on invalid specs or include warnings in the cached result for the user. |
| 3.2.2 | **Low** | No timeout on the `fetch()` call (line 45). A hanging server blocks the CLI indefinitely. | Add `AbortSignal.timeout(30_000)` or configurable timeout. |
| 3.2.3 | **Low** | `dereference()` may fail on circular `$ref` chains or external file references. No error handling around it. | Wrap `dereference()` in try/catch with a descriptive error message. |

### 3.3 Cache — `cache.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 3.3.1 | **Low** | `isCacheStale()` (line 56-63) is defined but **never called** anywhere in the codebase. Dead code. | Either use it (e.g., in `oapiFetch` to skip fresh caches) or remove it. |
| 3.3.2 | **Low** | `listCachedSpecs()` (line 53): `file.replace(".json", "")` would mangle a spec named `"my-api.json-v2"` (unlikely but possible). | Use `file.replace(/\.json$/, "")` for safer suffix removal. |
| 3.3.3 | **Low** | No cache eviction or cleanup. Old/orphaned cached specs persist forever. | Add a `cache clean` command or auto-evict on `oapi remove`. |

### 3.4 Query — `query.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 3.4.1 | **Low** | `listSchemas()` (line 67): Accepts `specName` parameter but never uses it. Dead parameter. | Remove unused `specName` parameter. |
| 3.4.2 | **Low** | `patternToRegex()` (line 176): Only supports single `*` glob, not `**` for recursive matching. | Document the limitation or add `**` support. |
| 3.4.3 | **Low** | `getSchemaType()` (line 277-301): Handles `allOf` and `oneOf` but silently ignores `anyOf`. | Add `anyOf` handling (same pattern as `oneOf`). |
| 3.4.4 | **Info** | `resolveRef()` only supports local `#/` refs. External file refs return `null`. Documented at line 150. | Acceptable limitation. Consider logging a warning when external refs are encountered. |

---

## 4. Issue Tracking Module (`src/tools/shiba-cli/src/issues/`)

### 4.1 Types — `types.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 4.1.1 | **Medium** | `TrackedIssue.version` is a literal `"1.0"` (line 156). No migration mechanism exists for future schema changes. Changing the schema will break existing issue files. | Add a migration system: on load, check version and apply transforms. Even a simple switch/case over version strings would suffice. |
| 4.1.2 | **Low** | Command option types (`IssueShowOpts`, etc.) are defined alongside domain types. Mixes concerns. | Acceptable for current size. Consider splitting if the file grows. |

### 4.2 Store — `store.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 4.2.1 | **High** | No file locking on `saveIssue()` (line 43-47). Concurrent CLI invocations (e.g., two terminals) could corrupt issue data with race conditions. | Use `writeFileSync` with `{ flag: 'wx' }` for atomic writes, or write to a temp file and rename (atomic on most filesystems). |
| 4.2.2 | **Medium** | `clearBlockers()` (line 290-295): Automatically sets status to `"in_progress"`. If the issue was `"in_review"` before being blocked, clearing the blocker resets it to the wrong status. | Store the previous status before blocking and restore it on clear. Or require explicit status when clearing. |
| 4.2.3 | **Medium** | `addBlocker()` (line 283-288): Automatically sets status to `"blocked"` as a side effect. Callers may not expect this. | Document the side effect in a JSDoc comment. Consider making the status change opt-in. |
| 4.2.4 | **Medium** | `syncJiraData()` (line 103-106): Replaces entire `issue.jira` object. Any local enrichments or manual additions to Jira fields are lost. | Merge rather than replace: `issue.jira = { ...issue.jira, ...jiraData }`. Or document that sync is destructive. |
| 4.2.5 | **Low** | No deduplication: `addMergeRequest`, `addApiEndpoint`, `addContext`, `addFigma` can add duplicate entries. E.g., calling `add-mr` twice with the same IID creates two records. | Check for existing entries by natural key (IID+project for MRs, method+path for APIs) before adding. |
| 4.2.6 | **Low** | `createDefaultIssue()` (line 60): `key.split("-")[0]` for projectKey extraction. Assumes standard `PROJ-123` format. Keys with multiple hyphens in the project name would extract only the first segment. | Use `key.split("-").slice(0, -1).join("-")` or regex `key.match(/^(.+)-\d+$/)?.[1]`. |
| 4.2.7 | **Low** | `updateProgress()` (line 266-281): Uses `Object.assign(issue.progress, updates)` which allows setting arbitrary properties on `IssueProgress`. | Use explicit field assignments for type safety. |

### 4.3 Index — `index.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 4.3.1 | **Info** | Clean barrel export file. All types and functions properly re-exported. | No change needed. |

---

## 5. Figma Module (`src/tools/shiba-cli/src/figma/`)

### 5.1 Types — `types.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 5.1.1 | **Info** | Well-defined Figma API types. `CachedFigmaFile` follows the same caching pattern as `CachedSpec`. | No change needed. |

### 5.2 Fetch — `fetch.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 5.2.1 | **High** | `extractDesignTokens()` (line 108-136): Token extraction is fundamentally broken for files with multiple color styles. Line 149: `colors.find((c) => c.value === "#000000")` matches the first unresolved color, so all fill nodes map to the same token. Same issue for typography at line 161. | Rewrite token extraction to properly correlate style keys with document nodes. Track which style ID applies to each node during traversal, then match tokens by their `styleKey`. |
| 5.2.2 | **Medium** | `getFileMetadata()` (line 224-234): Calls `fetchFile()` which downloads the ENTIRE Figma file (including full document tree) just to return 4 metadata fields. Wasteful for large files. | Use Figma's metadata endpoint (e.g., `GET /v1/files/{key}?depth=1`) or cache the metadata separately. |
| 5.2.3 | **Low** | `CACHE_MAX_AGE_MS` (line 17): Hardcoded to 1 hour with no configuration override. | Allow override via global config or environment variable. |
| 5.2.4 | **Low** | No timeout on Figma API fetch calls in `figmaFetch()` (line 19-33). | Add `AbortSignal.timeout()` for resilience. |

---

## 6. TUI Module (`src/tools/shiba-cli/src/tui/`)

### 6.1 App — `App.tsx`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 6.1.1 | **Low** | No error recovery — once an error state is reached, only manual `r` (refresh) recovers. No retry or auto-refresh mechanism. | Add an auto-retry after a delay, or at minimum show "press r to retry" in the error state. |

### 6.2 Components — `IssueList.tsx`, `IssueDetail.tsx`, `StatusBar.tsx`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 6.2.1 | **Low** | `IssueDetail.tsx` (line 64): Uses array index `key={i}` as React key for comments. If comments are reordered or deleted, this causes incorrect component reconciliation. | Use a stable identifier: `key={comment.created + comment.author}` or a hash. |
| 6.2.2 | **Low** | `IssueDetail.tsx` (line 33): `new Date(issue.updated).toLocaleString()` is locale-dependent. Terminal output may not render well with all locale formats. | Use a consistent date format (e.g., ISO short or relative time). |

### 6.3 Hooks — `useJiraIssues.ts`, `useFullIssue.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 6.3.1 | **Medium** | `useJiraIssues.ts` (line 34-38): Aggressive type casting `(issue.fields as Record<string, unknown>)` throughout. The jira.js library provides typed fields; these casts bypass them. | Use the jira.js typed field accessors directly (e.g., `issue.fields.summary`, `issue.fields.status?.name`). Same pattern works correctly in `commands/jira.ts`. |
| 6.3.2 | **Medium** | `useJiraIssues.ts` (line 26): JQL query is hardcoded. Users cannot filter by project, sprint, label, or any other criteria. | Support a configurable default JQL from `config.json` (the `preferences.defaultJql` field already exists in the config schema but is unused). |
| 6.3.3 | **Medium** | `useFullIssue.ts` (lines 78-79): When syncing Jira data, `assignee` is hardcoded to `null` and `created` to `""`. Discards data that was available from the API. | Pass the full data through: fetch assignee, reporter, and created from the API response. |
| 6.3.4 | **Low** | `CachedTask` type in `tui/types.ts` (line 37-39) is defined but never used anywhere. | Remove dead type. |

### 6.4 Shared Task Fetch — `tasks/fetch.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 6.4.1 | **Medium** | `parseDescription()` in `tasks/fetch.ts` (line 89-103) is a duplicate of the same function in `commands/jira.ts` (line 92-104). Different implementations of the same ADF parsing logic. | Extract to a shared utility in `@shiba-agent/shared` or a local `utils/` module. |
| 6.4.2 | **Low** | `JiraComment` and `JiraLinkedIssue` types exist in both `tui/types.ts` and `issues/types.ts`. Same data, different type definitions. | Consolidate: use the `issues/types.ts` definitions everywhere, or create a shared types module. |

---

## 7. Agents & Skills (`src/agents/` & `src/skills/`)

### 7.1 Agent Definitions

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 7.1.1 | **Medium** | `gitlab-agent.md` and `jira-agent.md`: Error handling tables reference `MISSING_ENV` error code, but the actual code uses `MISSING_CONFIG`. Documentation mismatch. | Update agent docs: change `MISSING_ENV` to `MISSING_CONFIG` to match the actual error codes. |
| 7.1.2 | **Low** | `project-manager.md`: Delegation examples show `Task(gitlab-agent):` syntax which isn't real Claude tool syntax. | Update to use actual Task tool invocation patterns, or clarify these are conceptual examples. |
| 7.1.3 | **Low** | `task-agent.md`: `maxTurns: 50` is very high. Most tasks should complete in fewer turns. | Consider reducing to 30 and letting the user extend if needed. |

### 7.2 Skill Definitions

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 7.2.1 | **Medium** | `create-mr/SKILL.md` (Step 6): References `--title`, `--url`, `--state` flags on `shiba issue add-mr` that don't exist. The actual CLI only accepts `--key`, `--project`, `--iid`, `--primary`. | Update the skill to use only the flags that actually exist. Remove references to `--title`, `--url`, `--state`. |
| 7.2.2 | **Low** | `start-task/SKILL.md`: Content substantially overlaps with `task-agent.md`. Maintaining both creates a documentation drift risk. | Consider having the skill reference the agent, or deduplicate by keeping workflow details in one place. |
| 7.2.3 | **Low** | `status-check/SKILL.md` (Step 3): `shiba gitlab mr-list --state all` doesn't filter by project — requires `--project` flag. | Add `--project` flag to the example command. |

---

## 8. Build & Setup

### 8.1 `setup.sh`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 8.1.1 | **Medium** | Installs bun globally via `curl \| bash` (line 14) without user confirmation. Could override an existing bun installation with a different version. | Add a confirmation prompt: "Bun not found. Install it? [y/N]". Or at minimum, check if `bunx` or `npx` could be used instead. |
| 8.1.2 | **Low** | No error handling after `bun run build` (line 26). If build fails, the script continues to `bun link`, potentially linking a broken/stale binary. | Add explicit error checking: `bun run build \|\| { echo "Build failed"; exit 1; }`. (Already handled by `set -e` at line 2 — this is actually fine.) |
| 8.1.3 | **Low** | No uninstall mechanism. Users have no clean way to remove the tool. | Add an `uninstall.sh` or a `shiba uninstall` command. |

### 8.2 `package.json` (root)

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 8.2.1 | **Medium** | No test configuration. No test runner. No test scripts. No test files exist in the project. | Add at minimum `vitest` or `bun test` configuration. Start with tests for the core store/query modules. |
| 8.2.2 | **Low** | No linting configured. No ESLint, Biome, or similar. | Add a linter. The agent definitions and skills reference `npm run lint` as a quality check, but no such script exists. |
| 8.2.3 | **Low** | Build script (line 11): `bun run --filter '@shiba-agent/*-cli' build` depends on naming convention. Adding a new tool that doesn't end in `-cli` would be missed. | Use `bun run --filter '*' build` with proper dependency ordering, or list packages explicitly. |

### 8.3 `tsconfig.base.json`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 8.3.1 | **Info** | Good strict settings. `isolatedModules: true` is correct for Bun. | No change needed. |

---

## 9. Cross-Cutting Concerns

### 9.1 Security

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 9.1.1 | **Medium** | Config file at `~/.shiba-agent/config/config.json` stores API tokens in plaintext. While gitignored, it's readable by any process on the machine. | Document the security model. Consider supporting environment variable overrides (e.g., `SHIBA_GITLAB_TOKEN`) as a more secure alternative. |
| 9.1.2 | **Low** | `init.ts` (line 82): `execSync("git remote get-url origin")` — no shell injection risk since there's no user input interpolation, but good to note. | No change needed. |

### 9.2 Error Handling

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 9.2.1 | **Medium** | No retry logic for API calls. Network failures immediately terminate the CLI. | Add configurable retry for transient errors (5xx, timeout, ECONNRESET) at the auth client level. |
| 9.2.2 | **Low** | Inconsistent error code names between code and documentation (see 7.1.1). | Audit all error codes and create a canonical list. |

### 9.3 Testing

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 9.3.1 | **High** | Zero test coverage. No test files, no test runner, no test configuration. The `complete-task` and `start-task` skills reference `npm run test` which doesn't exist. | Priority: Add tests for `issues/store.ts` (core data logic), `openapi/query.ts` (search/matching), and `commands/jira.ts` (ADF parsing). These are the modules with the most complex logic and highest bug risk. |

### 9.4 Code Duplication

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 9.4.1 | **Medium** | ADF `parseDescription()` is implemented twice: `commands/jira.ts:92-104` and `tasks/fetch.ts:89-103`. | Extract to shared utility. |
| 9.4.2 | **Medium** | Jira field mapping (issue → summary) duplicated in `commands/jira.ts` (issueGet) and `hooks/useJiraIssues.ts`. | Extract shared mapper. |
| 9.4.3 | **Low** | `JiraComment` / `JiraLinkedIssue` type definitions duplicated between `tui/types.ts` and `issues/types.ts`. | Consolidate into one source of truth. |

---

## Summary by Priority

### High (should fix)
- **4.2.1**: File write race conditions in `store.ts` — concurrent access can corrupt issue data
- **5.2.1**: `extractDesignTokens()` is fundamentally broken for multi-style files
- **9.3.1**: Zero test coverage for a CLI tool handling external API data

### Medium (should address)
- **1.1.1**: `findRepoRoot()` silent fallback to wrong path
- **2.1.1**: Monolithic `cli.ts` with repetitive boilerplate
- **2.2.1**: Draft MR uses title prefix instead of API field
- **2.3.1**: Duplicated Jira field extraction in `issueGet`
- **2.3.2**: Oversimplified ADF parsing drops most content types
- **2.3.3**: Fragile double type assertions in Jira comment API
- **2.3.4**: Type lie in `issueAssign` null handling
- **3.2.1**: Invalid OpenAPI specs cached without warning
- **4.1.1**: No schema migration for tracked issues
- **4.2.2**: `clearBlockers()` always resets to `in_progress` regardless of previous state
- **4.2.3**: `addBlocker()` auto-sets status as hidden side effect
- **4.2.4**: `syncJiraData()` destroys local enrichments
- **5.2.2**: `getFileMetadata()` downloads entire file for 4 fields
- **6.3.1-3**: TUI hooks bypass jira.js types and discard API data
- **7.1.1**: Agent docs reference wrong error codes
- **7.2.1**: Skill references nonexistent CLI flags
- **8.1.1**: Auto-installs bun without confirmation
- **8.2.1**: No test infrastructure
- **9.1.1**: Plaintext token storage
- **9.2.1**: No retry logic for API calls
- **9.4.1-2**: Code duplication across modules

### Low (nice to have)
- Various small improvements documented in each section above

---

## 10. New Code Review (Post-Refactor: CLI wrapping, GitHub, Env Isolation, Workflow, Tickets)

The following review covers the 4 commits merged into `main` that refactored the codebase to wrap official CLIs (`glab`, `jira-cli`, `gh`) instead of using Node.js libraries, and added GitHub support, environment isolation, workflow automation, and ticket notes.

### 10.1 CLI Execution — `shared/src/cli/exec.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.1.1 | **Info** | Clean utility with `execCli()`, `isCliAvailable()`, `requireCli()`. 10MB buffer is reasonable. `spawnSync` with `stdio: "pipe"` is correct for capturing output. | No change needed. |

### 10.2 Environment Variables — `shared/src/env.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.2.1 | **Info** | Simple utility loading `.env` from repo root. `getEnv()` with fallback and `requireEnv()` that throws. Clean. | No change needed. |

### 10.3 Preferences — `shared/src/config/preferences.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.3.1 | **Info** | Well-documented interfaces for branch naming, commit messages, signatures, workflow transitions. Sane defaults. | No change needed. |

### 10.4 Environment Commands — `commands/env.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.4.1 | **High** | **Shell injection in `execSync` calls.** Lines 85, 95, 145, 246: Branch/environment names are interpolated directly into shell strings: `execSync(\`git checkout -b ${opts.name}\`)`. While `opts.name` is validated with `/^[a-zA-Z0-9_-]+$/` at line 73 in `envCreate`, other callers like `envUse` (line 145) and `envDelete` (line 246) do **not** validate the name before passing it to `execSync`. A name like `; rm -rf /` would execute arbitrary commands. | **Either:** (a) validate `opts.name` in every function that uses it in `execSync`, or (b) use `spawnSync("git", ["checkout", "-b", opts.name])` instead of string interpolation — `spawnSync` with array args is not subject to shell injection. |
| 10.4.2 | **Medium** | `envMigrate()` (line 315): Uses `execSync(\`cp -r "${from}"/* "${to}"/ 2>/dev/null \|\| true\`)` which silently suppresses ALL errors, including permissions errors and disk-full conditions. Migrated data could be incomplete with no indication. | At minimum, check that the destination has files after copy. Or use Node's `fs.cpSync()` (available in Node 16.7+) for proper error handling. |
| 10.4.3 | **Medium** | `updateSymlink()` (line 387-389): When a backup already exists at the backup path, the function silently deletes the existing directory with `rmSync(linkPath, { recursive: true })`. This means re-running `envUse` can destroy user config data if the symlink setup was partially completed before. | Prompt the user or refuse to overwrite instead of silent deletion. At minimum, log a warning to stderr. |
| 10.4.4 | **Low** | `envList()` (line 175): `b.replace(/^\* /, "")` to strip the current branch marker. Regex also matches branch names that start with `* ` literally (unlikely but possible with bare repos). | Use `git branch --list --format='%(refname:short)'` for unambiguous output. |

### 10.5 GitHub Commands — `commands/github.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.5.1 | **Medium** | `prList` and `ghIssueList` (lines 102, 292): `catch { successResponse([]) }` silently returns empty array when `gh` output parsing fails. If `gh` changes its JSON format, this hides the breakage from users — they just see no results. | Return an error or at minimum log a warning to stderr: `console.error("Warning: Failed to parse gh output")`. |
| 10.5.2 | **Medium** | `prList` (line 99): `pr.isDraft as boolean ?? false` — operator precedence bug. `as boolean` has higher precedence than `??`, so this is `(pr.isDraft as boolean) ?? false`. If `isDraft` is `undefined`, the cast makes it `undefined as boolean` which is truthy for `??`. Use `(pr.isDraft ?? false) as boolean` or just `Boolean(pr.isDraft)`. | Fix operator precedence: `draft: Boolean(pr.isDraft)`. |
| 10.5.3 | **Low** | All `gh` commands use `--json` flag for list operations (good!) but text parsing for create operations (lines 41-42, 233-234: regex on stdout). | Consider using `gh pr create --json url,number` if supported by the user's `gh` version. Document minimum `gh` version. |

### 10.6 GitLab Commands — `commands/gitlab.ts` (refactored)

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.6.1 | **Medium** | Same pattern as GitHub: uses `execCli("glab", ...)` and parses output. The `glab` CLI uses `--output json` but the code doesn't always pass it. Check all commands have proper JSON output mode. | Audit each glab call to ensure `--output json` or `--json` is used where available. |

### 10.7 Jira Commands — `commands/jira.ts` (refactored)

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.7.1 | **High** | **Fragile text parser.** `parseJiraCliOutput()` (lines 83-176) parses `jira-cli --raw` output with line-by-line string matching (`line.startsWith("Summary:")`, etc.). This is extremely fragile — any change to jira-cli's output format silently breaks parsing. The comment regex on line 149 (`/^\s*[-*]?\s*(.+?)\s*\((.+?)\):\s*(.+)$/`) only matches a specific comment format. | Use `jira-cli`'s structured output when available. `jira issue view KEY --raw --output json` or `--template` flags may provide more reliable formats. If raw text parsing is unavoidable, add comprehensive tests with pinned jira-cli output samples. |
| 10.7.2 | **Medium** | `parseJiraCliOutput` is duplicated verbatim in both `commands/jira.ts` (lines 83-176) and `tasks/fetch.ts` (lines 24-95). Same fragile parser in two places. | Extract to a shared utility in `src/tools/shiba-cli/src/utils/jira-parser.ts`. |
| 10.7.3 | **Low** | `issueSearch` (line 351): Splits plain text output by `\s{2,}` (two or more spaces). Column values containing double spaces break parsing. | Same as above — prefer `jira issue list --output json` if available. |

### 10.8 Branch Commands — `commands/branch.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.8.1 | **High** | **Shell injection.** Line 48: `execSync(\`git checkout -b ${branchName}\`)` where `branchName` comes from user-provided `--description` via `slugify()`. While `slugify()` restricts to `[a-z0-9-]`, the `--key` component is not slugified — it's interpolated raw. A key like `PROJ-123; cat /etc/passwd` would execute. | Use `spawnSync("git", ["checkout", "-b", branchName])` instead of template string in `execSync`. |
| 10.8.2 | **Low** | `branch()` just generates a name and returns it — doesn't validate it's a legal git branch name. Names exceeding 255 chars or containing `..` would fail at `branchCreate`. | Add `git check-ref-format --branch <name>` validation. |

### 10.9 Commit Commands — `commands/commit.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.9.1 | **Info** | Simple, focused. Delegates to `generateCommitMessage()`. Correct. | No change needed. |

### 10.10 Config Commands — `commands/config.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.10.1 | **Medium** | `configSet()` (line 78): Accepts `commit-style` value without validating the `template` parameter. A custom style with no template silently falls back to conventional. | Require `--template` when style is `"custom"`. Error if template is empty. |
| 10.10.2 | **Low** | Line 99: Valid keys list doesn't include workflow-related config (`workflow-enabled`, `transition-on-branch-create`, etc.) even though `preferences.ts` defines them. | Add workflow config keys to the valid keys list. |

### 10.11 Notes Commands — `commands/notes.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.11.1 | **Low** | Category validation is duplicated: lines 31 and 118 both define the same `validCategories` array inline. | Extract to a shared constant: `export const VALID_CATEGORIES: NoteCategory[] = [...]` in `tickets/types.ts`. |

### 10.12 Workflow Commands — `commands/workflow.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.12.1 | **Info** | Clean implementation. Non-fatal error handling (doesn't fail if Jira is unavailable). Correctly skips draft MRs. | No change needed. |

### 10.13 Config Resolution — `config/resolve.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.13.1 | **Medium** | `getEffectivePreferences()` (lines 16-58): Manual deep merge of every preference field. Adding a new preference requires modifying this 40-line function in sync with the type definition. Error-prone and violates DRY. | Write a generic recursive merge utility: `deepMerge(defaults, global, project)` that handles nested objects. Or use a library like `lodash.merge`. |
| 10.13.2 | **Low** | `interpolateTemplate()` (lines 84-97): Uses `string.replace()` with static strings. If a value contains `$1`, `$&`, etc., JavaScript's replace interprets them as backreferences. | Use function replacement: `result.replace(/{key}/g, () => values.key!)` to prevent backreference interpretation. |
| 10.13.3 | **Low** | `appendCommentSignature()` (line 144): The signature `"🐕 Shiba Agent"` is added after `"Co-Authored-By: Shiba Agent"` — but `Co-Authored-By` is a git trailer convention, not a Jira/GitLab comment convention. It has no meaning in a Jira comment. | Use `Co-Authored-By` only in git commits. For Jira/GitLab comments, use just the emoji line. |

### 10.14 Ticket Notes Store — `tickets/store.ts`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.14.1 | **Medium** | `saveTicket()` (line 49): Uses `writeFileSync` directly — not atomic. Same race condition as the original `issues/store.ts` that was fixed in this PR. | Apply the same atomic write pattern: write to temp file, rename. |
| 10.14.2 | **Medium** | `generateId()` (line 8): `Math.random().toString(36).substring(2, 10)` produces 8-char IDs with ~41 bits of entropy. For a per-ticket scope this is usually fine, but concurrent rapid additions could collide. | Append a timestamp component: `Math.random().toString(36).substring(2, 10) + Date.now().toString(36)`. Or use `crypto.randomUUID()`. |
| 10.14.3 | **Low** | `getCurrentRepo()` and `getCurrentBranch()` (lines 15-31) are called on every `addNote()`. Each spawns a subprocess. | Cache the result for the duration of the CLI invocation (module-level variable). |

### 10.15 TUI Hook — `tui/hooks/useJiraIssues.ts` (refactored)

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.15.1 | **Medium** | Line 45: Splits by `\t\|\s{2,}`. Jira issue summaries containing tabs or double spaces break the parsing silently, producing garbled data. | Use `jira issue list --output json` or `--columns` with a reliable delimiter. |

### 10.16 GitHub Agent — `agents/github-agent.md`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.16.1 | **Info** | Comprehensive documentation. Covers all commands, error handling, and workflow integration. Good behavioral rules. | No change needed. |

### 10.17 Environment Defaults — `.env.default`

| # | Severity | Finding | Proposed Change |
|---|----------|---------|-----------------|
| 10.17.1 | **Low** | Only includes `GITLAB_TOKEN`, `JIRA_TOKEN`, `FIGMA_TOKEN`. Missing `GITHUB_TOKEN` even though `gh` may need explicit auth in CI. | Add `GITHUB_TOKEN=` to the template for completeness. |

---

## Summary of New Code Findings

### High (should fix)
- **10.4.1**: Shell injection in `env.ts` — `envUse` and `envDelete` pass unvalidated names to `execSync`
- **10.8.1**: Shell injection in `branch.ts` — `--key` is passed raw to `execSync`
- **10.7.1**: Extremely fragile jira-cli text parser — will break silently on format changes

### Medium (should address)
- **10.4.2**: `envMigrate` silently suppresses copy errors
- **10.4.3**: `updateSymlink` silently deletes existing directories
- **10.5.1**: Silent empty array on `gh` parse failure hides breakage
- **10.5.2**: Operator precedence bug: `isDraft as boolean ?? false`
- **10.7.2**: Jira CLI text parser duplicated in two files
- **10.10.1**: `configSet` accepts custom commit style with no template
- **10.13.1**: Manual deep merge of 40 lines — error-prone when adding new preferences
- **10.14.1**: `tickets/store.ts` `saveTicket()` not atomic (same bug we fixed in `issues/store.ts`)
- **10.14.2**: Weak note ID generation could collide
- **10.15.1**: TUI Jira hook parses columns by whitespace — fragile

### Low (nice to have)
- **10.4.4**: `envList` branch name parsing could use `--format`
- **10.10.2**: Config set missing workflow keys
- **10.11.1**: Note category validation duplicated
- **10.13.2**: Template replace vulnerable to backreferences
- **10.13.3**: `Co-Authored-By` misused in Jira comments
- **10.14.3**: Git subprocess called on every `addNote()`
- **10.17.1**: Missing `GITHUB_TOKEN` in `.env.default`
