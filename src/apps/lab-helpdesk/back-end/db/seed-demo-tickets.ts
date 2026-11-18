import type { Database } from 'better-sqlite3';
import {
  APP_SEED_BOOT_FLAG_KEYS,
  isAppSeedBootDisabled,
} from '@/shared/config/app-seed-boot-flags';
import { demoCastByName } from '@/shared/config/demo-data-cast';

export const HELP_DESK_DEMO_TICKETS_PACK_ID = 'help-desk-demo-tickets';
const SEED_METADATA = JSON.stringify({ seedPack: HELP_DESK_DEMO_TICKETS_PACK_ID, schemaVersion: 1 });

export function hasHelpDeskDemoTickets(db: Database): boolean {
  return Boolean(
    db.prepare(`SELECT 1 FROM tickets WHERE metadata LIKE ? LIMIT 1`).get(`%${HELP_DESK_DEMO_TICKETS_PACK_ID}%`),
  );
}

interface DemoTicketSpec {
  subject: string;
  status: string;
  priority: string;
  /** Cast assignee — support-flavoured work goes to Sam Patel. */
  assigneeName: string;
  /** Cast requester. */
  requesterName: string;
  requesterEmail?: string;
}

/**
 * Story A anchor: "Cannot sign in to CRM" — assigned to Sam Patel, requested by the Northwind
 * contact (external email, so `requester_email` is set and `requester_lab_user_id` stays null).
 *
 * Story B anchor: "Trial environment question" — requester Jordan Patel (Summit Health).
 */
const DEMO_TICKETS: DemoTicketSpec[] = [
  {
    subject: 'Cannot sign in to CRM',
    status: 'new',
    priority: 'high',
    assigneeName: 'Sam Patel',
    requesterName: 'Mia Chen',
    requesterEmail: 'avery.chen@northwind.example',
  },
  { subject: 'Chart widgets show no data', status: 'open', priority: 'medium', assigneeName: 'Sam Patel', requesterName: 'Mia Chen' },
  { subject: 'Request kanban column customization', status: 'pending', priority: 'low', assigneeName: 'Sam Patel', requesterName: 'Casey Hayes' },
  { subject: 'Billing export missing line items', status: 'open', priority: 'urgent', assigneeName: 'Taylor Nguyen', requesterName: 'Mia Chen' },
  { subject: 'How to link ticket to contact?', status: 'resolved', priority: 'medium', assigneeName: 'Sam Patel', requesterName: 'Riley Brooks' },
  { subject: 'Trial environment question', status: 'open', priority: 'medium', assigneeName: 'Sam Patel', requesterName: 'Jordan Lee', requesterEmail: 'jordan.patel@summit.example' },
  { subject: 'Mobile layout overlap on ticket form', status: 'open', priority: 'high', assigneeName: 'Sam Patel', requesterName: 'Mia Chen' },
  { subject: 'Duplicate notifications for assignments', status: 'closed', priority: 'low', assigneeName: 'Sam Patel', requesterName: 'Drew Ward' },
  { subject: 'SSO timeout after 15 minutes', status: 'new', priority: 'medium', assigneeName: 'Sam Patel', requesterName: 'Blake Torres' },
  { subject: 'Training sandbox reset request', status: 'pending', priority: 'low', assigneeName: 'Sam Patel', requesterName: 'Cameron Foster' },
  { subject: 'API rate limit on form submit', status: 'open', priority: 'high', assigneeName: 'Taylor Nguyen', requesterName: 'Mia Chen' },
  { subject: 'Dark mode contrast on priority badges', status: 'resolved', priority: 'low', assigneeName: 'Sam Patel', requesterName: 'Casey Hayes' },
  { subject: 'Escalation: production form 404', status: 'open', priority: 'urgent', assigneeName: 'Taylor Nguyen', requesterName: 'Jordan Lee' },
];

export interface SeedApplyOptions {
  adminApply?: boolean;
}

export function seedDemoTicketsIfMissing(db: Database, options?: SeedApplyOptions): number {
  if (!options?.adminApply && isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.HELP_DESK_DEMO_TICKETS)) {
    return 0;
  }
  if (hasHelpDeskDemoTickets(db)) {
    return 0;
  }
  const now = new Date().toISOString();
  let inserted = 0;
  for (const ticket of DEMO_TICKETS) {
    const assignee = demoCastByName(ticket.assigneeName);
    const requester = demoCastByName(ticket.requesterName);
    db.prepare(
      `INSERT INTO tickets (
         subject, description, status, priority, assignee_id,
         requester_lab_user_id, requester_email, metadata, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      ticket.subject,
      'Seeded demo ticket for Help Desk queue and dashboard metrics.',
      ticket.status,
      ticket.priority,
      // `assignee_id` is TEXT holding a stringified user id (see `ticket-service.ts`).
      assignee ? String(assignee.id) : null,
      // The requester email identifies an external party when one is set.
      ticket.requesterEmail ? null : (requester?.id ?? null),
      ticket.requesterEmail ?? null,
      SEED_METADATA,
      now,
      now,
    );
    inserted += 1;
  }
  return inserted;
}

export function removeDemoTickets(db: Database): number {
  const result = db.prepare(`DELETE FROM tickets WHERE metadata LIKE ?`).run(`%${HELP_DESK_DEMO_TICKETS_PACK_ID}%`);
  return result.changes;
}
