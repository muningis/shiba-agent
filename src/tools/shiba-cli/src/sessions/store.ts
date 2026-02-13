import { existsSync, readFileSync, writeFileSync, renameSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { getDataDir, ensureDataDir } from "@shiba-agent/shared";
import type { Session } from "../tui/types.js";

function getSessionsPath(): string {
  return join(getDataDir(), "sessions.json");
}

export function loadSessions(): Session[] {
  const path = getSessionsPath();
  if (!existsSync(path)) return [];

  try {
    const content = readFileSync(path, "utf-8");
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  ensureDataDir();
  const sessionsPath = getSessionsPath();
  const tmpPath = sessionsPath + `.tmp.${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(sessions, null, 2) + "\n");
  renameSync(tmpPath, sessionsPath);
}

export function addSession(session: Omit<Session, "id">): Session {
  const sessions = loadSessions();
  const newSession: Session = { id: randomUUID(), ...session };
  sessions.push(newSession);
  saveSessions(sessions);
  return newSession;
}

export function updateSession(id: string, updates: Partial<Pick<Session, "status">>): Session | null {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  sessions[idx] = { ...sessions[idx], ...updates };
  saveSessions(sessions);
  return sessions[idx];
}

export function removeSession(id: string): boolean {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return false;

  sessions.splice(idx, 1);
  saveSessions(sessions);
  return true;
}
