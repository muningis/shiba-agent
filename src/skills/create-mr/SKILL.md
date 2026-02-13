---
name: create-mr
description: "Creates a GitLab merge request linked to a Jira issue. Use when the user says 'create MR', 'open merge request', 'submit PR', 'push for review', or wants to submit their changes for code review."
version: 1.0.0
---

# Create Merge Request Workflow

You are creating a GitLab merge request with proper Jira linking.

## Step 1: Gather Context

Get current branch and repository:
```bash
git branch --show-current
git remote get-url origin
```

Check for uncommitted changes:
```bash
git status
```

If there are uncommitted changes, ask user if they want to commit first.

## Step 2: Identify Linked Issue

Extract the Jira issue key from:
1. User's message (e.g., "create MR for PROJ-123")
2. Branch name (e.g., `feature/PROJ-123-add-feature`)
3. Recent commits

If found, load the tracked issue:
```bash
shiba issue show --key <KEY>
```

## Step 3: Generate MR Content

From the issue data, prepare:

**Title**: `<KEY>: <Issue Summary>`
- Example: `PROJ-123: Add user authentication`

**Description** (using issue analysis):
```markdown
## Summary
<Brief description from issue summary>

## Changes
- <List key changes from commits>

## Acceptance Criteria
- [ ] <Criterion 1 from issue>
- [ ] <Criterion 2 from issue>
- [ ] <Criterion 3 from issue>

## Testing
<Instructions for reviewers to test>

## Related
- Jira: [<KEY>](https://your-jira.atlassian.net/browse/<KEY>)
```

## Step 4: Push Branch

Ensure branch is pushed to remote:
```bash
git push -u origin <branch-name>
```

## Step 5: Create Merge Request

```bash
shiba gitlab mr-create \
  --source <branch-name> \
  --target main \
  --title "<KEY>: <Summary>" \
  --description "<generated description>"
```

Capture the MR IID from the response.

## Step 6: Link MR to Issue

Record the MR in the tracked issue:
```bash
shiba issue add-mr --key <KEY> \
  --project "<group/project>" \
  --iid <MR_IID> \
  --primary
```

Update progress:
```bash
shiba issue progress --key <KEY> --percent 90
shiba issue add-note --key <KEY> --content "MR !<IID> created and ready for review" --category info
```

## Step 7: Monitor Pipeline

Check pipeline status:
```bash
shiba gitlab pipeline-list --limit 1
```

If pipeline is running, inform user they can check status with:
```bash
shiba gitlab pipeline-status --pipeline-id <ID>
```

## Step 8: Report to User

Provide:
- **MR URL**: Direct link to the merge request
- **Pipeline status**: Running/passed/failed
- **Next steps**:
  - Request reviewers
  - Monitor pipeline
  - Address review comments

## Important Rules

- **Always link to Jira** - Include issue key in title
- **Use acceptance criteria** - Make reviewers' job easier
- **Check for uncommitted work** - Don't lose changes
- **Verify push succeeded** - Branch must exist on remote
- **Target correct branch** - Usually main/master, but ask if unsure
