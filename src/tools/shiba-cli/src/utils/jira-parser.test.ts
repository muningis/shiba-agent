import { describe, expect, it } from "bun:test";
import { parseJiraCliRawOutput } from "./jira-parser.js";

const SAMPLE_OUTPUT = `Summary: Fix login redirect bug
Type: Bug
Status: In Progress
Priority: High
Assignee: Jane Doe
Reporter: John Smith
Created: 2025-06-15T10:30:00.000+0000
Updated: 2025-06-18T14:22:00.000+0000
Description:
When a user tries to log in with SSO, they are redirected
to the wrong page after authentication completes.

Steps to reproduce:
1. Navigate to /login
2. Click "Sign in with SSO"
3. Observe redirect goes to /dashboard instead of /home

Comments:
  - Alice (2025-06-16T09:00:00.000+0000): I can reproduce this on staging
  * Bob (2025-06-17T11:30:00.000+0000): This is caused by the redirect_uri config`;

describe("parseJiraCliRawOutput", () => {
  it("parses all key-value fields", () => {
    const result = parseJiraCliRawOutput("PROJ-123", SAMPLE_OUTPUT);

    expect(result.key).toBe("PROJ-123");
    expect(result.id).toBe("PROJ-123");
    expect(result.summary).toBe("Fix login redirect bug");
    expect(result.issueType).toBe("Bug");
    expect(result.status).toBe("In Progress");
    expect(result.priority).toBe("High");
    expect(result.assigneeName).toBe("Jane Doe");
    expect(result.reporterName).toBe("John Smith");
    expect(result.created).toBe("2025-06-15T10:30:00.000+0000");
    expect(result.updated).toBe("2025-06-18T14:22:00.000+0000");
  });

  it("parses multiline description", () => {
    const result = parseJiraCliRawOutput("PROJ-123", SAMPLE_OUTPUT);

    expect(result.description).not.toBeNull();
    expect(result.description).toContain("SSO");
    expect(result.description).toContain("Steps to reproduce:");
    expect(result.description).toContain("/dashboard instead of /home");
  });

  it("parses comments", () => {
    const result = parseJiraCliRawOutput("PROJ-123", SAMPLE_OUTPUT);

    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].author).toBe("Alice");
    expect(result.comments[0].body).toBe("I can reproduce this on staging");
    expect(result.comments[0].created).toBe("2025-06-16T09:00:00.000+0000");

    expect(result.comments[1].author).toBe("Bob");
    expect(result.comments[1].body).toBe("This is caused by the redirect_uri config");
  });

  it("handles missing description", () => {
    const raw = `Summary: Quick task
Type: Task
Status: To Do
Priority: Low`;

    const result = parseJiraCliRawOutput("PROJ-456", raw);

    expect(result.summary).toBe("Quick task");
    expect(result.description).toBeNull();
    expect(result.comments).toHaveLength(0);
  });

  it("handles empty input", () => {
    const result = parseJiraCliRawOutput("PROJ-789", "");

    expect(result.key).toBe("PROJ-789");
    expect(result.summary).toBe("");
    expect(result.status).toBe("Unknown");
    expect(result.description).toBeNull();
    expect(result.comments).toHaveLength(0);
  });

  it("handles # Comments header format", () => {
    const raw = `Summary: Test
Status: Done
# Comments
  - Dev (2025-01-01): Fixed it`;

    const result = parseJiraCliRawOutput("TEST-1", raw);

    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].author).toBe("Dev");
    expect(result.comments[0].body).toBe("Fixed it");
  });

  it("stops description at Comments section", () => {
    const raw = `Summary: Test
Description:
First line
Second line
Comments:
  - User (2025-01-01): A comment`;

    const result = parseJiraCliRawOutput("TEST-2", raw);

    expect(result.description).toBe("First line\nSecond line");
    expect(result.comments).toHaveLength(1);
  });

  it("preserves blank lines in description", () => {
    const raw = `Summary: Test
Description:
First paragraph

Second paragraph

Third paragraph`;

    const result = parseJiraCliRawOutput("TEST-4", raw);

    expect(result.description).toBe("First paragraph\n\nSecond paragraph\n\nThird paragraph");
  });

  it("handles inline description on same line", () => {
    const raw = `Summary: Quick
Description: Short inline description
Status: Open`;

    const result = parseJiraCliRawOutput("TEST-3", raw);

    expect(result.description).toBe("Short inline description");
    expect(result.status).toBe("Open");
  });
});
