export type NoteCategory = "decision" | "todo" | "warning" | "info" | "question" | "progress";

export interface TicketNote {
  id: string;
  timestamp: string;
  category: NoteCategory;
  content: string;
  repo?: string;
  branch?: string;
}

export interface TicketNotes {
  key: string;
  createdAt: string;
  updatedAt: string;
  notes: TicketNote[];
}

export interface NoteSummary {
  key: string;
  noteCount: number;
  categories: Record<NoteCategory, number>;
  lastUpdated: string;
  recent: Array<{
    id: string;
    category: NoteCategory;
    preview: string;
  }>;
}
