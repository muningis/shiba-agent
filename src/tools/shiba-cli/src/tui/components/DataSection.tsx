import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { useTrackedIssues } from "../hooks/useTrackedIssues.js";
import { useTicketNotes } from "../hooks/useTicketNotes.js";
import { TrackedIssueList } from "./TrackedIssueList.js";
import { TrackedIssueDetail } from "./TrackedIssueDetail.js";
import { TicketNotesList } from "./TicketNotesList.js";
import { TicketNotesDetail } from "./TicketNotesDetail.js";
import type { DataEntity } from "../types.js";
import type { TrackedIssue } from "../../issues/index.js";
import type { TicketNotes } from "../../tickets/index.js";

interface DataSectionProps {
  onViewChange: (view: "list" | "detail") => void;
}

const ENTITY_ITEMS = [
  { label: "Tracked Issues", value: "tracked-issues" as DataEntity, key: "tracked-issues" },
  { label: "Ticket Notes", value: "ticket-notes" as DataEntity, key: "ticket-notes" },
];

export function DataSection({ onViewChange }: DataSectionProps) {
  const [entity, setEntity] = useState<DataEntity | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detailIssue, setDetailIssue] = useState<TrackedIssue | null>(null);
  const [detailTicket, setDetailTicket] = useState<TicketNotes | null>(null);

  const trackedIssues = useTrackedIssues();
  const ticketNotes = useTicketNotes();

  useInput((_input, key) => {
    if (key.escape) {
      if (selectedKey) {
        setSelectedKey(null);
        setDetailIssue(null);
        setDetailTicket(null);
        onViewChange("list");
      } else if (entity) {
        setEntity(null);
        onViewChange("list");
      }
    }
  });

  // Entity menu
  if (!entity) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Data Browser</Text>
        <Box marginTop={1}>
          <SelectInput
            items={ENTITY_ITEMS}
            onSelect={(item) => {
              setEntity(item.value);
              onViewChange("list");
            }}
          />
        </Box>
      </Box>
    );
  }

  // Tracked Issues
  if (entity === "tracked-issues") {
    if (selectedKey && detailIssue) {
      return <TrackedIssueDetail issue={detailIssue} />;
    }

    if (trackedIssues.loading) {
      return (
        <Box padding={1}>
          <Text color="yellow"><Spinner type="dots" /> Loading tracked issues...</Text>
        </Box>
      );
    }

    if (trackedIssues.error) {
      return (
        <Box padding={1}>
          <Text color="red">Error: {trackedIssues.error}</Text>
        </Box>
      );
    }

    return (
      <TrackedIssueList
        issues={trackedIssues.issues}
        onSelect={(key) => {
          const full = trackedIssues.getFullIssue(key);
          if (full) {
            setSelectedKey(key);
            setDetailIssue(full);
            onViewChange("detail");
          }
        }}
      />
    );
  }

  // Ticket Notes
  if (entity === "ticket-notes") {
    if (selectedKey && detailTicket) {
      return <TicketNotesDetail ticket={detailTicket} />;
    }

    if (ticketNotes.loading) {
      return (
        <Box padding={1}>
          <Text color="yellow"><Spinner type="dots" /> Loading ticket notes...</Text>
        </Box>
      );
    }

    if (ticketNotes.error) {
      return (
        <Box padding={1}>
          <Text color="red">Error: {ticketNotes.error}</Text>
        </Box>
      );
    }

    return (
      <TicketNotesList
        tickets={ticketNotes.tickets}
        onSelect={(key) => {
          const ticket = ticketNotes.getTicket(key);
          if (ticket) {
            setSelectedKey(key);
            setDetailTicket(ticket);
            onViewChange("detail");
          }
        }}
      />
    );
  }

  return null;
}
