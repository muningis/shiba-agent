---
name: start-task
description: "Initiates structured task implementation from a Jira ticket. Use when the user says 'start task', 'work on ticket', 'implement PROJ-123', 'start working on', or provides a Jira issue key to begin work on."
version: 1.0.0
---

# Start Task Workflow

You are beginning structured implementation of a Jira ticket. Follow this workflow carefully.

## Step 1: Extract and Fetch Ticket

Extract the Jira issue key from the user's message (e.g., "PROJ-123").

```bash
shiba jira issue-get --key <KEY>
```

This fetches the ticket and creates/updates the tracking file at `~/.shiba-agent/issues/<KEY>.json`.

## Step 2: Review Task Details

Read the fetched issue data:

```bash
shiba issue show --key <KEY>
```

Note carefully:
- **Summary** - What is being requested
- **Description** - Detailed requirements
- **Acceptance criteria** - How success is measured
- **Comments** - Additional context from stakeholders
- **Linked issues** - Dependencies or related work

## Step 3: Requirements Clarification

**Never rush to implementation.** The most expensive bugs come from misunderstood requirements.

### Identify Ambiguities

Look for:
- Unclear user flows
- Missing edge cases
- Undefined behaviors
- Vague success criteria
- Implicit requirements not stated explicitly

### Ask Clarifying Questions

Formulate questions about:
- User personas affected
- Expected behaviors in edge cases
- Priority of conflicting requirements
- Integration points with other features

Record questions:
```bash
shiba issue add-note --key <KEY> --content "QUESTION: <your question>" --category question
```

**Present questions to the user and wait for answers.**

Record answers:
```bash
shiba issue add-note --key <KEY> --content "DECISION: <answer received>" --category decision
```

## Step 4: Technical Analysis

Once product requirements are clear, explore the codebase:

1. **Understand existing patterns** - Use Glob/Grep/Read to find related code
2. **Identify files to modify** - Document what needs to change
3. **Check for API contracts** - Use `shiba oapi` if applicable

Document relevant contexts:
```bash
shiba issue add-context --key <KEY> --type file --path "src/..." \
  --description "Component handling X" --relevance "Will need modification for Y"
```

Document API endpoints if implementing backend:
```bash
shiba issue add-api --key <KEY> --method POST --path "/api/..." \
  --description "Creates new resource"
```

## Step 5: Document Understanding

Once all questions are answered, document your understanding:

```bash
shiba issue set-analysis --key <KEY> \
  --summary "Clear summary of implementation scope" \
  --acceptance-criteria "criterion1,criterion2,criterion3" \
  --out-of-scope "item1,item2" \
  --assumptions "assumption1,assumption2"
```

Add detailed requirements (MoSCoW prioritization):
```bash
shiba issue add-requirement --key <KEY> \
  --title "Requirement title" \
  --description "Detailed description" \
  --type functional \
  --priority must
```

## Step 6: Implementation

Now proceed with coding:

1. **Use TodoWrite** to track implementation subtasks

2. **Update progress** as you work:
   ```bash
   shiba issue progress --key <KEY> --status in_progress --percent 10
   shiba issue progress --key <KEY> --percent 30
   shiba issue progress --key <KEY> --percent 50
   ```

3. **Document important decisions**:
   ```bash
   shiba issue add-note --key <KEY> --content "Used X pattern because..." --category decision
   ```

4. **Handle blockers**:
   ```bash
   shiba issue progress --key <KEY> --blocker "Waiting for API endpoint X"
   shiba issue progress --key <KEY> --status blocked
   ```

## Step 7: Verification

Before marking complete, verify thoroughly:

1. **Self Code Review** - Re-read all changed files
2. **Run Quality Checks**:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```
3. **Fix any issues**, then re-run checks
4. **Verify against acceptance criteria** manually

## Step 8: Completion

1. **Update progress**:
   ```bash
   shiba issue progress --key <KEY> --status completed --percent 100
   ```

2. **Add completion note**:
   ```bash
   shiba issue add-note --key <KEY> \
     --content "Implementation complete. All acceptance criteria verified." \
     --category info
   ```

3. **Report to user**:
   - Summary of what was implemented
   - Any deviations from requirements (with justification)
   - Files changed
   - Tests added/modified

## Important Rules

- **Questions may spawn more questions** - When an answer reveals new ambiguities, ask follow-ups
- **Batch related questions** - Group related questions together
- **Confidence threshold** - Only proceed to implementation at 90%+ confidence
- **When in doubt, ask** - One extra question is cheaper than wrong implementation
- **Read before writing** - Explore existing code before changes
- **Quality over speed** - Take time to do it right
