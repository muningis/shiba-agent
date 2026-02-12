---
name: review-task
description: "Performs requirements-based code review for a Jira issue. Use when the user says 'review my changes', 'code review', 'check my work for PROJ-123', 'review MR', or wants to self-review before submitting."
version: 1.0.0
---

# Review Task Workflow

You are performing a requirements-based code review that maps changes to acceptance criteria.

## Step 1: Identify the Issue

Extract the Jira issue key from:
1. User's message (e.g., "review changes for PROJ-123")
2. Current branch name
3. Most recently worked issue

Load the tracked issue:
```bash
shiba issue show --key <KEY>
```

## Step 2: Gather Changes

Get all changes for this task:

```bash
# Changes compared to main branch
git diff main...HEAD

# List of changed files
git diff --name-only main...HEAD

# Commit history for context
git log main..HEAD --oneline
```

## Step 3: Load Requirements Context

From the tracked issue, extract:
- Acceptance criteria
- Documented requirements (MoSCoW priorities)
- Technical decisions recorded
- Out-of-scope items
- Assumptions

## Step 4: Generate Review Checklist

Create a structured review mapping requirements to code:

```
## Code Review: <KEY> - <Summary>

### Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| <criterion 1> | ✅/❌/⚠️ | <file:line or "Not found"> |
| <criterion 2> | ✅/❌/⚠️ | <file:line or "Not found"> |

### Requirements Coverage

**MUST Have**:
- [x] <requirement> → implemented in `file.ts:123`
- [ ] <requirement> → NOT FOUND

**SHOULD Have**:
- [x] <requirement> → implemented

**COULD Have**:
- [ ] <requirement> → deferred (acceptable)

### Code Quality Checklist

- [ ] **Error handling**: Are errors caught and handled appropriately?
- [ ] **Edge cases**: Are boundary conditions handled?
- [ ] **Security**: No injection vulnerabilities, secrets exposure?
- [ ] **Performance**: No obvious N+1 queries, memory leaks?
- [ ] **Types**: Proper TypeScript types, no `any` abuse?
- [ ] **Tests**: New functionality has test coverage?
- [ ] **Documentation**: Complex logic is commented?

### Technical Decisions Verification

Review against documented decisions:
<For each decision in issue notes, verify implementation matches>

### Out-of-Scope Verification

Confirm these were NOT implemented (as intended):
- <out-of-scope item 1>
- <out-of-scope item 2>

### Findings

**Critical Issues** (must fix):
- <issue description with file:line>

**Suggestions** (nice to have):
- <suggestion with context>

**Questions** (need clarification):
- <question about implementation choice>
```

## Step 5: Deep Dive on Concerns

For any issues found:

1. Read the specific file sections
2. Understand the context
3. Propose specific fixes if possible
4. Note if it's a blocker or suggestion

## Step 6: Summarize Review

Provide a clear verdict:

**Ready for Review**: All criteria met, no critical issues
**Needs Work**: List specific items to address
**Questions First**: Clarifications needed before assessment

## Step 7: Document Review

Record the review in issue notes:
```bash
shiba issue add-note --key <KEY> \
  --content "Self-review completed. <X> criteria verified, <Y> issues found." \
  --category info
```

## Important Rules

- **Map to requirements** - Every criterion should have evidence
- **Be specific** - Reference file:line, not vague descriptions
- **Prioritize findings** - Critical vs nice-to-have
- **Check decisions** - Implementation should match documented choices
- **Verify out-of-scope** - Scope creep is a real risk
- **Don't block on style** - Focus on correctness and requirements
