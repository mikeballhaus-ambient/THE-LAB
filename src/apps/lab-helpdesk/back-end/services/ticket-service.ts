import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import type { Ticket, TicketCreateInput, TicketUpdateInput } from '../../shared/types/ticket.types';
import { ticketMetadataEntityFilter } from '../../shared/utils/ticket-metadata-filter';

export class TicketService {
  private static instance: TicketService | null = null;

  private get db(): AppDatabaseServiceProxy {
    return AppDatabaseServiceProxy.getInstance();
  }

  public static getInstance(): TicketService {
    if (!this.instance) {
      this.instance = new TicketService();
    }
    return this.instance;
  }

  private mapRow(row: Record<string, unknown>): Ticket {
    return {
      id: Number(row.id),
      subject: String(row.subject ?? ''),
      description: String(row.description ?? ''),
      status: row.status as Ticket['status'],
      priority: row.priority as Ticket['priority'],
      assigneeId: row.assignee_id != null ? String(row.assignee_id) : null,
      requesterLabUserId:
        row.requester_lab_user_id != null ? Number(row.requester_lab_user_id) : null,
      requesterEmail: row.requester_email != null ? String(row.requester_email) : null,
      metadata: row.metadata != null ? String(row.metadata) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  public async list(options?: {
    entityKey?: string;
    recordId?: number;
    limit?: number;
  }): Promise<Ticket[]> {
    const meta = ticketMetadataEntityFilter(options?.entityKey, options?.recordId);
    const limit = Math.min(options?.limit ?? 500, 500);
    const result = await this.db.select({
      sql: `SELECT * FROM tickets WHERE 1=1${meta.clause} ORDER BY updated_at DESC LIMIT ?`,
      params: [...meta.params.map(String), String(limit)],
    });
    return result.rows.map((row) => this.mapRow(row as Record<string, unknown>));
  }

  public async getById(id: number): Promise<Ticket | null> {
    const result = await this.db.select({
      sql: 'SELECT * FROM tickets WHERE id = ?',
      params: [String(id)],
    });
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0] as Record<string, unknown>);
  }

  public async create(input: TicketCreateInput): Promise<Ticket | null> {
    const now = new Date().toISOString();
    const insert = await this.db.insert({
      tableName: 'tickets',
      data: {
        subject: input.subject,
        description: input.description ?? '',
        status: input.status ?? 'new',
        priority: input.priority ?? 'medium',
        assignee_id: input.assigneeId ?? null,
        requester_lab_user_id: input.requesterLabUserId ?? null,
        requester_email: input.requesterEmail ?? null,
        metadata: input.metadata ?? null,
        created_at: now,
        updated_at: now,
      },
    });
    if (!insert.success || insert.insertId == null) {
      return null;
    }
    return await this.getById(insert.insertId);
  }

  public async update(id: number, input: TicketUpdateInput): Promise<Ticket | null> {
    const data: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.subject !== undefined) data.subject = input.subject;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.assigneeId !== undefined) data.assignee_id = input.assigneeId;
    if (input.requesterLabUserId !== undefined) {
      data.requester_lab_user_id = input.requesterLabUserId;
    }
    if (input.requesterEmail !== undefined) data.requester_email = input.requesterEmail;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    const result = await this.db.update({
      tableName: 'tickets',
      data,
      where: { id },
    });
    if (!result.success) {
      return null;
    }
    return await this.getById(id);
  }

  public async delete(id: number): Promise<boolean> {
    const result = await this.db.delete({ tableName: 'tickets', where: { id } });
    return result.success && result.affected > 0;
  }
}
