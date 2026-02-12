---
name: complete-task
description: "Completes a Jira task with verification. Use when the user says 'finish task', 'complete PROJ-123', 'wrap up ticket', 'done with issue', or indicates they've finished implementation."
version: 1.0.0
---

# Complete Task Workflow

You are completing a Jira task. This ensures quality verification before marking done.

## Step 1: Identify the Task

Extract the Jira issue key from the user's message (e.g., "PROJ-123").

If no key is provided, check for the most recently worked issue:
```bash
shiba issue list
```

Load the tracked issue:
```bash
shiba issue show --key <KEY>
```

## Step 2: Run Quality Checks

Execute all quality verification:

```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Tests
npm run test
```

If any checks fail:
1. Report the failures clearly
2. Fix the issues
3. Re-run checks until all pass
4. Document fixes in notes:
   ```bash
   shiba issue add-note --key <KEY> --content "Fixed lint errors in X" --category info
   ```

## Step 3: Verify Acceptance Criteria

Review the issue's acceptance criteria:
```bash
shiba issue show --key <KEY>
```

For each acceptance criterion:
1. Verify it has been implemented
2. Test the behavior manually if applicable
3. Check for edge cases mentioned in requirements

If any criteria are NOT met:
- Report which criteria failed
- Ask user if they want to continue implementation or mark as partial

## Step 4: Self Code Review

Review all changes made for this task:

```bash
git diff main...HEAD
```

Check for:
- Code quality and readability
- Proper error handling
- Security concerns
- Missing tests for new functionality
- Documentation if needed

Document any concerns:
```bash
shiba issue add-note --key <KEY> --content "Review note: Consider adding test for edge case X" --category info
```

## Step 5: Update Progress

Mark the task as completed:

```bash
shiba issue progress --key <KEY> --status completed --percent 100
```

Add completion note:
```bash
shiba issue add-note --key <KEY> \
  --content "Implementation complete. All acceptance criteria verified. Quality checks passed." \
  --category info
```

## Step 6: Transition Jira (Optional)

If the user wants to update Jira status:

```bash
# Check available transitions
shiba jira issue-get --key <KEY>

# Transition to Done/Resolved
shiba jira issue-transition --key <KEY> --transition "Done"
```

## Step 7: Generate Summary

Report to user:
- **Summary**: What was implemented
- **Files changed**: List of modified files
- **Tests**: Tests added or modified
- **Quality checks**: All passed
- **Deviations**: Any changes from original requirements (with justification)
- **Next steps**: Suggest creating MR if not done

## Important Rules

- **Never skip quality checks** - They catch issues before review
- **Verify ALL acceptance criteria** - Partial completion should be explicitly noted
- **Document deviations** - If requirements changed, explain why
- **Self-review first** - Catch issues before others review
- **Ask about Jira transition** - User may want to keep it in review status
