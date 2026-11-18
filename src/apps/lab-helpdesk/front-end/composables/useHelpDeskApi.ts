import type {
  KanbanBoard,
  KanbanBoardColumn,
  KanbanBoardFieldKey,
} from '../../shared/types/kanban-board.types';
import type { TicketPriority, TicketStatus } from '../../shared/types/ticket.types';

export interface ConnectorTicket {
  id: number;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId?: string | null;
  metadata?: string;
}

export interface CreateTicketInput {
  subject: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
}

import { labAppFetch, getLabUserHeaders } from '@/shared/composables/useLabUserHeaders';

export function useHelpDeskApi(serverUrl: string) {
  const base = () => serverUrl.replace(/\/$/, '');

  async function fetchTickets(): Promise<ConnectorTicket[]> {
    const res = await labAppFetch(`${base()}/api/connector/tickets`);
    if (!res.ok) {
      throw new Error(`Load failed (${res.status})`);
    }
    return (await res.json()) as ConnectorTicket[];
  }

  async function updateTicket(
    id: number,
    patch: Partial<CreateTicketInput>,
  ): Promise<ConnectorTicket> {
    const res = await labAppFetch(`${base()}/api/connector/tickets/${id}`, {
      method: 'POST',
      headers: getLabUserHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      throw new Error(`Update failed (${res.status})`);
    }
    return (await res.json()) as ConnectorTicket;
  }

  async function fetchKanbanBoards(): Promise<KanbanBoard[]> {
    const res = await labAppFetch(`${base()}/api/kanban-boards`);
    if (!res.ok) {
      throw new Error(`Boards load failed (${res.status})`);
    }
    return (await res.json()) as KanbanBoard[];
  }

  async function createKanbanBoard(input: {
    name: string;
    fieldKey: KanbanBoardFieldKey;
    columns: KanbanBoardColumn[];
  }): Promise<KanbanBoard> {
    const res = await labAppFetch(`${base()}/api/kanban-boards`, {
      method: 'POST',
      headers: getLabUserHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Failed to create board');
    }
    return (await res.json()) as KanbanBoard;
  }

  async function updateKanbanBoard(
    id: number,
    input: {
      name?: string;
      fieldKey?: KanbanBoardFieldKey;
      columns?: KanbanBoardColumn[];
    },
  ): Promise<KanbanBoard> {
    const res = await labAppFetch(`${base()}/api/kanban-boards/${id}`, {
      method: 'POST',
      headers: getLabUserHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Failed to update board');
    }
    return (await res.json()) as KanbanBoard;
  }

  async function deleteKanbanBoard(id: number): Promise<void> {
    const res = await labAppFetch(`${base()}/api/kanban-boards/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Failed to delete board');
    }
  }

  return {
    fetchTickets,
    updateTicket,
    fetchKanbanBoards,
    createKanbanBoard,
    updateKanbanBoard,
    deleteKanbanBoard,
  };
}
