import { useState, useEffect, useCallback } from "react";
import { listAllTickets, loadTicket, getNoteSummary } from "../../tickets/index.js";
import type { TicketNotes } from "../../tickets/index.js";
import type { NoteSummary } from "../../tickets/types.js";

export interface TicketSummaryItem {
  key: string;
  noteCount: number;
  categories: Record<string, number>;
  lastUpdated: string;
}

interface UseTicketNotesResult {
  tickets: TicketSummaryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getTicket: (key: string) => TicketNotes | null;
}

export function useTicketNotes(): UseTicketNotesResult {
  const [tickets, setTickets] = useState<TicketSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const keys = listAllTickets();
      const items: TicketSummaryItem[] = [];
      for (const key of keys) {
        const ticket = loadTicket(key);
        if (ticket && ticket.notes.length > 0) {
          const summary = getNoteSummary(ticket);
          items.push({
            key: summary.key,
            noteCount: summary.noteCount,
            categories: summary.categories,
            lastUpdated: summary.lastUpdated,
          });
        }
      }
      items.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
      setTickets(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getTicket = useCallback((key: string): TicketNotes | null => {
    return loadTicket(key);
  }, []);

  return { tickets, loading, error, refresh: load, getTicket };
}
