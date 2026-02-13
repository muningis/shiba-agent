import {
  successResponse,
  errorResponse,
  getRepoRoot,
  getCustomAgentsDir,
  ensureCustomAgentsDir,
} from "@shiba-agent/shared";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  symlinkSync,
  lstatSync,
  mkdirSync,
  renameSync,
} from "fs";
import { join, basename } from "path";
import { homedir } from "os";

// --- Agent frontmatter parsing ---

interface AgentMeta {
  name: string;
  description: string;
  tools: string;
  model: string;
  maxTurns: number;
}

function parseAgentFile(filePath: string): { meta: AgentMeta; body: string } {
  const content = readFileSync(filePath, "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return {
      meta: { name: basename(filePath, ".md"), description: "", tools: "", model: "sonnet", maxTurns: 15 },
      body: content,
    };
  }

  const frontmatter = match[1];
  const body = (match[2] ?? "").trim();
  const meta: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return {
    meta: {
      name: meta.name || basename(filePath, ".md"),
      description: meta.description || "",
      tools: meta.tools || "",
      model: meta.model || "sonnet",
      maxTurns: parseInt(meta.maxTurns || "15", 10),
    },
    body,
  };
}

function generateAgentFile(meta: AgentMeta, body: string): string {
  return `---\nname: ${meta.name}\ndescription: "${meta.description}"\ntools: ${meta.tools}\nmodel: ${meta.model}\nmaxTurns: ${meta.maxTurns}\n---\n\n${body}\n`;
}

// --- Agent discovery ---

function getBuiltInAgentsDir(): string {
  return join(getRepoRoot(), "src", "agents");
}

function getClaudeAgentsDir(): string {
  return join(homedir(), ".claude", "agents");
}

interface AgentInfo {
  name: string;
  type: "built-in" | "custom";
  model: string;
  maxTurns: number;
  description: string;
  tools: string;
  path: string;
}

function discoverAgents(): AgentInfo[] {
  const agents: AgentInfo[] = [];

  // Built-in agents
  const builtInDir = getBuiltInAgentsDir();
  if (existsSync(builtInDir)) {
    for (const file of readdirSync(builtInDir).filter((f) => f.endsWith(".md"))) {
      const filePath = join(builtInDir, file);
      const { meta } = parseAgentFile(filePath);
      agents.push({
        name: meta.name,
        type: "built-in",
        model: meta.model,
        maxTurns: meta.maxTurns,
        description: meta.description,
        tools: meta.tools,
        path: filePath,
      });
    }
  }

  // Custom agents
  const customDir = getCustomAgentsDir();
  if (existsSync(customDir)) {
    for (const file of readdirSync(customDir).filter((f) => f.endsWith(".md"))) {
      const filePath = join(customDir, file);
      const { meta } = parseAgentFile(filePath);
      agents.push({
        name: meta.name,
        type: "custom",
        model: meta.model,
        maxTurns: meta.maxTurns,
        description: meta.description,
        tools: meta.tools,
        path: filePath,
      });
    }
  }

  return agents;
}

function findAgent(name: string): (AgentInfo & { body: string }) | null {
  const agents = discoverAgents();
  const agent = agents.find((a) => a.name === name);
  if (!agent) return null;

  const { body } = parseAgentFile(agent.path);
  return { ...agent, body };
}

function isSymlinked(agentPath: string): boolean {
  const claudeAgentsDir = getClaudeAgentsDir();
  const linkPath = join(claudeAgentsDir, basename(agentPath));
  if (!existsSync(linkPath)) return false;
  try {
    return lstatSync(linkPath).isSymbolicLink();
  } catch {
    return false;
  }
}

// --- Settings helpers ---

function readSettingsFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function writeSettingsFile(path: string, settings: Record<string, unknown>): void {
  const dir = join(path, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const tmpPath = path + `.tmp.${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, path);
}

function getGlobalSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

function getProjectSettingsPath(): string {
  return join(process.cwd(), ".claude", "settings.json");
}

// --- Commands ---

// team setup
export interface TeamSetupOpts {
  global?: boolean;
  project?: boolean;
  teammateMode?: string;
  disable?: boolean;
}

export async function teamSetup(opts: TeamSetupOpts): Promise<void> {
  const validModes = ["in-process", "tmux", "auto"];
  const teammateMode = opts.teammateMode ?? "auto";

  if (!validModes.includes(teammateMode)) {
    errorResponse("INVALID_MODE", `Invalid teammate mode. Must be one of: ${validModes.join(", ")}`);
  }

  const scope = opts.project ? "project" : "global";
  const settingsPath = opts.project ? getProjectSettingsPath() : getGlobalSettingsPath();

  const settings = readSettingsFile(settingsPath);

  if (opts.disable) {
    // Remove agent teams config
    const env = (settings.env ?? {}) as Record<string, string>;
    delete env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    if (Object.keys(env).length === 0) {
      delete settings.env;
    } else {
      settings.env = env;
    }
    delete settings.teammateMode;

    writeSettingsFile(settingsPath, settings);
    successResponse({ enabled: false, scope, path: settingsPath });
    return;
  }

  // Enable agent teams
  const env = ((settings.env ?? {}) as Record<string, string>);
  env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
  settings.env = env;
  settings.teammateMode = teammateMode;

  writeSettingsFile(settingsPath, settings);
  successResponse({ enabled: true, scope, teammateMode, path: settingsPath });
}

// team status
export async function teamStatus(): Promise<void> {
  const globalSettings = readSettingsFile(getGlobalSettingsPath());
  const projectSettings = readSettingsFile(getProjectSettingsPath());

  const globalEnv = (globalSettings.env ?? {}) as Record<string, string>;
  const projectEnv = (projectSettings.env ?? {}) as Record<string, string>;

  const globalEnabled = globalEnv.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";
  const projectEnabled = projectEnv.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";
  const enabled = globalEnabled || projectEnabled;

  const teammateMode = (projectSettings.teammateMode ?? globalSettings.teammateMode ?? null) as string | null;

  const scope = projectEnabled ? "project" : globalEnabled ? "global" : "none";

  // Count agents
  const builtInDir = getBuiltInAgentsDir();
  const customDir = getCustomAgentsDir();
  const builtInCount = existsSync(builtInDir)
    ? readdirSync(builtInDir).filter((f) => f.endsWith(".md")).length
    : 0;
  const customCount = existsSync(customDir)
    ? readdirSync(customDir).filter((f) => f.endsWith(".md")).length
    : 0;

  // Check symlink status
  const agents = discoverAgents();
  const claudeAgentsDir = getClaudeAgentsDir();
  const allSynced = agents.every((a) => {
    const linkPath = join(claudeAgentsDir, basename(a.path));
    if (!existsSync(linkPath)) return false;
    try {
      return lstatSync(linkPath).isSymbolicLink();
    } catch {
      return false;
    }
  });

  successResponse({
    enabled,
    teammateMode,
    scope,
    agents: {
      builtIn: builtInCount,
      custom: customCount,
      synced: allSynced,
    },
  });
}

// team list
export async function teamList(): Promise<void> {
  const agents = discoverAgents();
  successResponse(
    agents.map((a) => ({
      name: a.name,
      type: a.type,
      model: a.model,
      maxTurns: a.maxTurns,
      description: a.description,
    }))
  );
}

// team show
export interface TeamShowOpts {
  name: string;
}

export async function teamShow(opts: TeamShowOpts): Promise<void> {
  if (!opts.name) {
    errorResponse("MISSING_NAME", "Agent name is required (--name)");
  }

  const agent = findAgent(opts.name);
  if (!agent) {
    errorResponse("AGENT_NOT_FOUND", `Agent "${opts.name}" not found`);
  }

  successResponse({
    name: agent.name,
    type: agent.type,
    model: agent.model,
    tools: agent.tools,
    maxTurns: agent.maxTurns,
    description: agent.description,
    instructions: agent.body,
    path: agent.path,
    symlinked: isSymlinked(agent.path),
  });
}

// team create
export interface TeamCreateOpts {
  name: string;
  description: string;
  model?: string;
  tools?: string;
  maxTurns?: string;
  instructions?: string;
}

export async function teamCreate(opts: TeamCreateOpts): Promise<void> {
  if (!opts.name) {
    errorResponse("MISSING_NAME", "Agent name is required (--name)");
  }
  if (!opts.description) {
    errorResponse("MISSING_DESCRIPTION", "Agent description is required (--description)");
  }

  const validModels = ["sonnet", "opus", "haiku"];
  const model = opts.model ?? "sonnet";
  if (!validModels.includes(model)) {
    errorResponse("INVALID_MODEL", `Invalid model. Must be one of: ${validModels.join(", ")}`);
  }

  // Check for name conflicts
  const existing = discoverAgents();
  if (existing.some((a) => a.name === opts.name)) {
    errorResponse("AGENT_EXISTS", `Agent "${opts.name}" already exists`);
  }

  const tools = opts.tools ?? "Bash, Read, Grep, Glob";
  const maxTurns = opts.maxTurns ? parseInt(opts.maxTurns, 10) : 15;

  // Read instructions from file if provided
  let body = "# Instructions\n\nAdd your agent instructions here.";
  if (opts.instructions) {
    if (!existsSync(opts.instructions)) {
      errorResponse("FILE_NOT_FOUND", `Instructions file not found: ${opts.instructions}`);
    }
    body = readFileSync(opts.instructions, "utf-8").trim();
  }

  const meta: AgentMeta = {
    name: opts.name,
    description: opts.description,
    tools,
    model,
    maxTurns,
  };

  ensureCustomAgentsDir();
  const agentPath = join(getCustomAgentsDir(), `${opts.name}.md`);
  writeFileSync(agentPath, generateAgentFile(meta, body));

  // Symlink to ~/.claude/agents/
  const claudeAgentsDir = getClaudeAgentsDir();
  mkdirSync(claudeAgentsDir, { recursive: true });
  const symlinkPath = join(claudeAgentsDir, `${opts.name}.md`);
  if (existsSync(symlinkPath)) {
    unlinkSync(symlinkPath);
  }
  symlinkSync(agentPath, symlinkPath);

  successResponse({
    created: true,
    name: opts.name,
    path: agentPath,
    symlink: symlinkPath,
  });
}

// team edit
export interface TeamEditOpts {
  name: string;
  description?: string;
  model?: string;
  tools?: string;
  maxTurns?: string;
  instructions?: string;
}

export async function teamEdit(opts: TeamEditOpts): Promise<void> {
  if (!opts.name) {
    errorResponse("MISSING_NAME", "Agent name is required (--name)");
  }

  const agent = findAgent(opts.name);
  if (!agent) {
    errorResponse("AGENT_NOT_FOUND", `Agent "${opts.name}" not found`);
  }
  if (agent.type === "built-in") {
    errorResponse("CANNOT_EDIT_BUILTIN", "Built-in agents cannot be edited. Create a custom agent instead.");
  }

  if (opts.model) {
    const validModels = ["sonnet", "opus", "haiku"];
    if (!validModels.includes(opts.model)) {
      errorResponse("INVALID_MODEL", `Invalid model. Must be one of: ${validModels.join(", ")}`);
    }
  }

  // Read existing file
  const { meta, body: existingBody } = parseAgentFile(agent.path);

  // Update only provided fields
  const updatedMeta: AgentMeta = {
    name: meta.name,
    description: opts.description ?? meta.description,
    tools: opts.tools ?? meta.tools,
    model: opts.model ?? meta.model,
    maxTurns: opts.maxTurns ? parseInt(opts.maxTurns, 10) : meta.maxTurns,
  };

  let body = existingBody;
  if (opts.instructions) {
    if (!existsSync(opts.instructions)) {
      errorResponse("FILE_NOT_FOUND", `Instructions file not found: ${opts.instructions}`);
    }
    body = readFileSync(opts.instructions, "utf-8").trim();
  }

  writeFileSync(agent.path, generateAgentFile(updatedMeta, body));

  successResponse({
    updated: true,
    name: opts.name,
    changes: {
      ...(opts.description && { description: opts.description }),
      ...(opts.model && { model: opts.model }),
      ...(opts.tools && { tools: opts.tools }),
      ...(opts.maxTurns && { maxTurns: parseInt(opts.maxTurns, 10) }),
      ...(opts.instructions && { instructions: "updated from file" }),
    },
  });
}

// team delete
export interface TeamDeleteOpts {
  name: string;
}

export async function teamDelete(opts: TeamDeleteOpts): Promise<void> {
  if (!opts.name) {
    errorResponse("MISSING_NAME", "Agent name is required (--name)");
  }

  const agent = findAgent(opts.name);
  if (!agent) {
    errorResponse("AGENT_NOT_FOUND", `Agent "${opts.name}" not found`);
  }
  if (agent.type === "built-in") {
    errorResponse("CANNOT_DELETE_BUILTIN", "Built-in agents cannot be deleted.");
  }

  // Remove symlink from ~/.claude/agents/
  const symlinkPath = join(getClaudeAgentsDir(), `${opts.name}.md`);
  if (existsSync(symlinkPath)) {
    unlinkSync(symlinkPath);
  }

  // Remove the agent file
  unlinkSync(agent.path);

  successResponse({
    deleted: true,
    name: opts.name,
  });
}

// team sync
export async function teamSync(): Promise<void> {
  const agents = discoverAgents();
  const claudeAgentsDir = getClaudeAgentsDir();
  mkdirSync(claudeAgentsDir, { recursive: true });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const agent of agents) {
    const linkPath = join(claudeAgentsDir, basename(agent.path));

    if (existsSync(linkPath)) {
      try {
        const stat = lstatSync(linkPath);
        if (stat.isSymbolicLink()) {
          // Check if symlink points to correct target
          const target = readFileSync(linkPath, "utf-8");
          // Re-create to ensure it points to the right place
          unlinkSync(linkPath);
          symlinkSync(agent.path, linkPath);
          updated++;
        } else {
          // Regular file exists, replace with symlink
          unlinkSync(linkPath);
          symlinkSync(agent.path, linkPath);
          updated++;
        }
      } catch {
        unlinkSync(linkPath);
        symlinkSync(agent.path, linkPath);
        updated++;
      }
    } else {
      symlinkSync(agent.path, linkPath);
      created++;
    }
  }

  successResponse({
    synced: true,
    total: agents.length,
    created,
    updated,
    skipped,
  });
}
