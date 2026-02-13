import { existsSync, readFileSync, writeFileSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { getTicketsDir, ensureTicketsDir } from "@shiba-agent/shared";
import type { TicketNotes, TicketNote, NoteCategory, NoteSummary } from "./types.js";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getTicketPath(key: string): string {
  return join(getTicketsDir(), `${key}.json`);
}

function getCurrentRepo(): string | undefined {
  try {
    const remote = execSync("git remote get-url origin", { encoding: "utf-8", stdio: "pipe" }).trim();
    // Extract repo name from URL (e.g., git@github.com:user/repo.git -> user/repo)
    const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function getCurrentBranch(): string | undefined {
  try {
    return execSync("git branch --show-current", { encoding: "utf-8", stdio: "pipe" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

export function loadTicket(key: string): TicketNotes | null {
  const path = getTicketPath(key);
  if (!existsSync(path)) return null;

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function saveTicket(ticket: TicketNotes): void {
  ensureTicketsDir();
  ticket.updatedAt = new Date().toISOString();
  const ticketPath = getTicketPath(ticket.key);
  const tmpPath = ticketPath + `.tmp.${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(ticket, null, 2) + "\n");
  renameSync(tmpPath, ticketPath);
}

export function createTicket(key: string): TicketNotes {
  const now = new Date().toISOString();
  return {
    key,
    createdAt: now,
    updatedAt: now,
    notes: [],
  };
}

export function getOrCreateTicket(key: string): TicketNotes {
  return loadTicket(key) ?? createTicket(key);
}

export function addNote(
  ticket: TicketNotes,
  content: string,
  category: NoteCategory = "info"
): TicketNote {
  const note: TicketNote = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    category,
    content,
    repo: getCurrentRepo(),
    branch: getCurrentBranch(),
  };
  ticket.notes.push(note);
  return note;
}

export function getNoteById(ticket: TicketNotes, id: string): TicketNote | undefined {
  return ticket.notes.find((n) => n.id === id);
}

export function getNotesByCategory(ticket: TicketNotes, category: NoteCategory): TicketNote[] {
  return ticket.notes.filter((n) => n.category === category);
}

export function deleteNote(ticket: TicketNotes, id: string): boolean {
  const idx = ticket.notes.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  ticket.notes.splice(idx, 1);
  return true;
}

export function clearNotes(ticket: TicketNotes): void {
  ticket.notes = [];
}

export function getNoteSummary(ticket: TicketNotes): NoteSummary {
  const categories: Record<NoteCategory, number> = {
    decision: 0,
    todo: 0,
    warning: 0,
    info: 0,
    question: 0,
    progress: 0,
  };

  for (const note of ticket.notes) {
    categories[note.category]++;
  }

  // Get 5 most recent notes with preview (first 50 chars)
  const recent = ticket.notes
    .slice(-5)
    .reverse()
    .map((n) => ({
      id: n.id,
      category: n.category,
      preview: n.content.substring(0, 50) + (n.content.length > 50 ? "..." : ""),
    }));

  return {
    key: ticket.key,
    noteCount: ticket.notes.length,
    categories,
    lastUpdated: ticket.updatedAt,
    recent,
  };
}

export function listAllTickets(): string[] {
  const dir = getTicketsDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}
