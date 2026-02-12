---
name: status-check
description: "Shows comprehensive status of a Jira issue across all systems. Use when the user says 'what's the status', 'check progress', 'where are we', 'show status of PROJ-123', or wants an overview of task progress."
version: 1.0.0
---

# Status Check Workflow

You are providing a comprehensive status report for a Jira issue.

## Step 1: Identify the Issue

Extract the Jira issue key from:
1. User's message (e.g., "status of PROJ-123")
2. If not specified, list recent issues:
   ```bash
   shiba issue list
   ```

## Step 2: Fetch Latest Data

Get fresh data from Jira:
```bash
shiba jira issue-get --key <KEY>
```

Load the tracked issue with local data:
```bash
shiba issue show --key <KEY>
```

## Step 3: Check Linked MRs

If the issue has linked merge requests, check their status:

```bash
shiba gitlab mr-list --state all
```

For each linked MR, get pipeline status:
```bash
shiba gitlab pipeline-status --pipeline-id <ID>
```

## Step 4: Compile Status Report

Generate a clear status summary:

```
## Status: <KEY> - <Summary>

### Jira Status
- **Status**: <In Progress/Review/Done>
- **Priority**: <High/Medium/Low>
- **Assignee**: <Name or Unassigned>

### Implementation Progress
- **Completion**: <X>%
- **Status**: <not_started/in_progress/blocked/completed>
- **Started**: <date>
- **Last Updated**: <date>

### Blockers
<List any active blockers, or "None">

### Acceptance Criteria
- [x] <Completed criterion>
- [ ] <Pending criterion>

### Merge Requests
| MR | Status | Pipeline |
|----|--------|----------|
| !123 | Open | Passed |
| !124 | Merged | — |

### Recent Notes
- <date>: <note content>
- <date>: <note content>

### Technical Context
- <X> files tracked as relevant
- <Y> API endpoints documented
```

## Step 5: Identify Next Actions

Based on status, suggest next steps:

**If not_started**:
- "Run `/start-task <KEY>` to begin implementation"

**If in_progress**:
- "Continue implementation"
- "X acceptance criteria remaining"

**If blocked**:
- "Resolve blocker: <description>"
- "Clear with: `shiba issue progress --key <KEY> --clear-blockers`"

**If near completion (>80%)**:
- "Run quality checks and complete with `/complete-task <KEY>`"

**If MR exists but not merged**:
- "MR !<IID> awaiting review"
- "Pipeline status: <status>"

**If completed**:
- "Task complete. Consider transitioning Jira to Done."

## Important Rules

- **Fetch fresh Jira data** - Status may have changed externally
- **Show blockers prominently** - They need attention
- **Be concise** - Users want quick overview, not every detail
- **Suggest actions** - Don't just report, guide next steps
- **Handle missing data gracefully** - Not all fields may be populated
