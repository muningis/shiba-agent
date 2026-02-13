import React from "react";
import { Box, Text } from "ink";
import type { TicketNotes } from "../../tickets/index.js";

interface TicketNotesDetailProps {
  ticket: TicketNotes;
}

const CATEGORY_COLORS: Record<string, string> = {
  decision: "magenta",
  todo: "yellow",
  warning: "red",
  info: "blue",
  question: "cyan",
  progress: "green",
};

export function TicketNotesDetail({ ticket }: TicketNotesDetailProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">{ticket.key}</Text>
      <Text dimColor>Notes: {ticket.notes.length} | Updated: {new Date(ticket.updatedAt).toLocaleString()}</Text>

      <Box marginTop={1} flexDirection="column">
        {ticket.notes.map((note) => (
          <Box key={note.id} marginTop={1} flexDirection="column" marginLeft={1}>
            <Box>
              <Text color={CATEGORY_COLORS[note.category] ?? "white"} bold>[{note.category}]</Text>
              <Text dimColor> {new Date(note.timestamp).toLocaleString()}</Text>
              {note.repo && <Text dimColor> @ {note.repo}</Text>}
              {note.branch && <Text dimColor> ({note.branch})</Text>}
            </Box>
            <Box marginLeft={1}>
              <Text wrap="wrap">{note.content}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
