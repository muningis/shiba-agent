import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { TicketSummaryItem } from "../hooks/useTicketNotes.js";

interface TicketNotesListProps {
  tickets: TicketSummaryItem[];
  onSelect: (key: string) => void;
}

function formatCategories(categories: Record<string, number>): string {
  const parts: string[] = [];
  for (const [cat, count] of Object.entries(categories)) {
    if (count > 0) {
      parts.push(`${cat}:${count}`);
    }
  }
  return parts.join(" ");
}

export function TicketNotesList({ tickets, onSelect }: TicketNotesListProps) {
  if (tickets.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No ticket notes. Use `shiba notes add` to add notes to a ticket.</Text>
      </Box>
    );
  }

  const items = tickets.map((t) => ({
    label: `${t.key} (${t.noteCount} notes)  ${formatCategories(t.categories)}`,
    value: t.key,
    key: t.key,
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Tickets with Notes ({tickets.length})</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}
