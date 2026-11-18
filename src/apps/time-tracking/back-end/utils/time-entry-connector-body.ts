import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { labUserFieldSchema, resolveLabUserFieldValue } from '@/shared/server/lab-user-field-input';
import { demoCastNameForId } from '@/shared/config/demo-data-cast';
import type { TimeEntry, UpsertTimeEntryInput } from '../../shared/types';

const TimeEntryConnectorBodySchema = z.object({
  teamMember: labUserFieldSchema.or(z.string()).optional(),
  project: z.string().min(1),
  task: z.string().optional(),
  date: z.string().min(1),
  minutes: z.number().int().nonnegative(),
  billable: z.boolean().optional(),
  notes: z.string().optional(),
  weekKey: z.string().optional(),
});

export async function parseTimeEntryConnectorBody(
  body: Record<string, unknown>,
  request?: FastifyRequest,
): Promise<UpsertTimeEntryInput> {
  const parsed = TimeEntryConnectorBodySchema.parse(body);
  const actorUserId = request ? resolveLabAppActorUserId(request) : 0;
  const member = await resolveLabUserFieldValue(parsed.teamMember, actorUserId, {
    fieldName: 'teamMember',
  });

  return {
    userId: member.userId ?? null,
    userName: member.name.trim(),
    project: parsed.project,
    task: (parsed.task ?? '').trim(),
    date: parsed.date,
    minutes: parsed.minutes,
    billable: parsed.billable ?? true,
    notes: (parsed.notes ?? '').trim(),
    weekKey: (parsed.weekKey ?? '').trim(),
  };
}

/** Forms Builder lab-user Select values are platform user ids; charts group on display names. */
export function timeEntryToConnector(entry: TimeEntry): Record<string, unknown> {
  const userName =
    entry.userName?.trim() ||
    (entry.userId != null && entry.userId > 0 ? demoCastNameForId(entry.userId) ?? '' : '');
  return {
    ...entry,
    teamMember: entry.userId != null && entry.userId > 0 ? String(entry.userId) : '',
    userName,
  };
}
