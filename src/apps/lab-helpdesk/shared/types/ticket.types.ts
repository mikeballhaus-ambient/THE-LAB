export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId?: string | null;
  requesterLabUserId?: number | null;
  requesterEmail?: string | null;
  metadata?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCreateInput {
  subject: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
  requesterLabUserId?: number | null;
  requesterEmail?: string | null;
  metadata?: string | null;
}

export type TicketUpdateInput = Partial<TicketCreateInput>;
