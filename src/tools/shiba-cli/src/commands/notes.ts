import { successResponse, errorResponse } from "@shiba-agent/shared";
import {
  getOrCreateTicket,
  saveTicket,
  loadTicket,
  addNote,
  getNoteById,
  getNotesByCategory,
  deleteNote,
  clearNotes,
  getNoteSummary,
  listAllTickets,
  type NoteCategory,
} from "../tickets/index.js";

// Notes Add
export interface NotesAddOpts {
  key: string;
  content: string;
  category: string;
}

export async function notesAdd(opts: NotesAddOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Ticket key is required (--key)");
  }
  if (!opts.content) {
    errorResponse("MISSING_CONTENT", "Note content is required (--content)");
  }

  const validCategories: NoteCategory[] = ["decision", "todo", "warning", "info", "question", "progress"];
  const category = opts.category as NoteCategory;
  if (!validCategories.includes(category)) {
    errorResponse("INVALID_CATEGORY", `Invalid category. Must be one of: ${validCategories.join(", ")}`);
  }

  const ticket = getOrCreateTicket(opts.key);
  const note = addNote(ticket, opts.content, category);
  saveTicket(ticket);

  successResponse({
    key: opts.key,
    note: {
      id: note.id,
      category: note.category,
      timestamp: note.timestamp,
    },
  });
}

// Notes List
export interface NotesListOpts {
  key: string;
}

export async function notesList(opts: NotesListOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Ticket key is required (--key)");
  }

  const ticket = loadTicket(opts.key);
  if (!ticket) {
    errorResponse("NOT_FOUND", `No notes found for ticket ${opts.key}`);
  }

  // Return summary (token-efficient)
  const summary = getNoteSummary(ticket);
  successResponse(summary);
}

// Notes Get
export interface NotesGetOpts {
  key: string;
  id: string;
}

export async function notesGet(opts: NotesGetOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Ticket key is required (--key)");
  }
  if (!opts.id) {
    errorResponse("MISSING_ID", "Note ID is required (--id)");
  }

  const ticket = loadTicket(opts.key);
  if (!ticket) {
    errorResponse("NOT_FOUND", `No notes found for ticket ${opts.key}`);
  }

  const note = getNoteById(ticket, opts.id);
  if (!note) {
    errorResponse("NOTE_NOT_FOUND", `Note ${opts.id} not found in ticket ${opts.key}`);
  }

  successResponse(note);
}

// Notes Query
export interface NotesQueryOpts {
  key: string;
  category?: string;
  limit?: string;
}

export async function notesQuery(opts: NotesQueryOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Ticket key is required (--key)");
  }

  const ticket = loadTicket(opts.key);
  if (!ticket) {
    errorResponse("NOT_FOUND", `No notes found for ticket ${opts.key}`);
  }

  let notes = ticket.notes;

  if (opts.category) {
    const validCategories: NoteCategory[] = ["decision", "todo", "warning", "info", "question", "progress"];
    const category = opts.category as NoteCategory;
    if (!validCategories.includes(category)) {
      errorResponse("INVALID_CATEGORY", `Invalid category. Must be one of: ${validCategories.join(", ")}`);
    }
    notes = getNotesByCategory(ticket, category);
  }

  const limit = opts.limit ? parseInt(opts.limit, 10) : 20;
  if (limit > 0 && notes.length > limit) {
    notes = notes.slice(-limit);
  }

  successResponse({
    key: opts.key,
    total: notes.length,
    notes,
  });
}

// Notes Summary (token-efficient overview)
export interface NotesSummaryOpts {
  key: string;
}

export async function notesSummary(opts: NotesSummaryOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Ticket key is required (--key)");
  }

  const ticket = loadTicket(opts.key);
  if (!ticket) {
    errorResponse("NOT_FOUND", `No notes found for ticket ${opts.key}`);
  }

  const summary = getNoteSummary(ticket);
  successResponse(summary);
}

// Notes Delete
export interface NotesDeleteOpts {
  key: string;
  id: string;
}

export async function notesDelete(opts: NotesDeleteOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Ticket key is required (--key)");
  }
  if (!opts.id) {
    errorResponse("MISSING_ID", "Note ID is required (--id)");
  }

  const ticket = loadTicket(opts.key);
  if (!ticket) {
    errorResponse("NOT_FOUND", `No notes found for ticket ${opts.key}`);
  }

  const deleted = deleteNote(ticket, opts.id);
  if (!deleted) {
    errorResponse("NOTE_NOT_FOUND", `Note ${opts.id} not found in ticket ${opts.key}`);
  }

  saveTicket(ticket);
  successResponse({ key: opts.key, deleted: opts.id });
}

// Notes Clear
export interface NotesClearOpts {
  key: string;
}

export async function notesClear(opts: NotesClearOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Ticket key is required (--key)");
  }

  const ticket = loadTicket(opts.key);
  if (!ticket) {
    errorResponse("NOT_FOUND", `No notes found for ticket ${opts.key}`);
  }

  const count = ticket.notes.length;
  clearNotes(ticket);
  saveTicket(ticket);

  successResponse({ key: opts.key, cleared: count });
}

// Notes List All Tickets
export async function notesListTickets(): Promise<void> {
  const tickets = listAllTickets();
  successResponse({ tickets, count: tickets.length });
}
