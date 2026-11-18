import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { labUserFieldSchema, resolveLabUserFieldValue } from '@/shared/server/lab-user-field-input';
import { demoCastByName } from '@/shared/config/demo-data-cast';
import type { Charter, UpsertCharterInput } from '../../shared/types';

const StatusSchema = z.enum(['draft', 'active', 'on-hold', 'complete']);

const CharterConnectorBodySchema = z.object({
  title: z.string().min(1),
  sponsor: labUserFieldSchema.or(z.string()).optional(),
  purpose: z.string().optional(),
  scope: z.string().optional(),
  outOfScope: z.string().optional(),
  goals: z.string().optional(),
  stakeholders: z
    .union([z.array(z.union([z.string(), z.number()])), z.string(), z.number()])
    .optional(),
  status: StatusSchema.optional(),
});

function normalizeStakeholderIds(raw: unknown): Array<string | number> {
  if (raw == null || raw === '') {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        return trimmed.split(/;\s*/).filter(Boolean);
      }
    }
    return trimmed.split(/;\s*/).filter(Boolean);
  }
  if (typeof raw === 'number') {
    return [raw];
  }
  return [String(raw)];
}

function serializeStakeholderUserIds(ids: Array<string | number>): string {
  return JSON.stringify(ids.map((id) => String(id)));
}

function parseStoredStakeholderUserIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((id) => String(id));
  } catch {
    return [];
  }
}

export function stakeholderIdsForConnector(stakeholderUserIds: string | null | undefined): string[] {
  return parseStoredStakeholderUserIds(stakeholderUserIds);
}

function stakeholderIdsFromDisplayText(stakeholders: string | null | undefined): string[] {
  const text = stakeholders?.trim();
  if (!text) {
    return [];
  }
  const ids: string[] = [];
  for (const segment of text.split(/;\s*/)) {
    const name = segment.trim();
    if (!name) {
      continue;
    }
    const member = demoCastByName(name);
    if (member) {
      ids.push(String(member.id));
    }
  }
  return ids;
}

/** Forms Builder lab-user Select option values are platform user ids, not display names. */
type CharterConnectorFields = Partial<Pick<Charter, 'sponsor' | 'stakeholders' | 'sponsorId' | 'stakeholderUserIds'>>;

export function sponsorValueForConnector(charter: CharterConnectorFields): string {
  if (charter.sponsorId != null && charter.sponsorId > 0) {
    return String(charter.sponsorId);
  }
  return charter.sponsor?.trim() ?? '';
}

/** MultiSelect hydrates from id strings; fall back to legacy semicolon names when JSON ids are empty. */
export function stakeholdersValueForConnector(charter: CharterConnectorFields): string[] {
  const stored = stakeholderIdsForConnector(charter.stakeholderUserIds);
  if (stored.length > 0) {
    return stored;
  }
  return stakeholderIdsFromDisplayText(charter.stakeholders);
}

export async function parseCharterConnectorBody(
  body: Record<string, unknown>,
  request?: FastifyRequest,
): Promise<UpsertCharterInput> {
  const parsed = CharterConnectorBodySchema.parse(body);
  const actorUserId = request ? resolveLabAppActorUserId(request) : 0;

  const sponsor = await resolveLabUserFieldValue(parsed.sponsor, actorUserId, { fieldName: 'sponsor' });

  const stakeholderIds = normalizeStakeholderIds(parsed.stakeholders);
  const resolvedStakeholders = await Promise.all(
    stakeholderIds.map((id) =>
      resolveLabUserFieldValue(id, actorUserId, { fieldName: 'stakeholders' }),
    ),
  );
  const stakeholderNames = resolvedStakeholders
    .map((row) => row.name.trim())
    .filter(Boolean)
    .join('; ');
  const stakeholdersOwnerId =
    resolvedStakeholders.find((row) => row.userId != null)?.userId ?? null;
  const idsForStorage = resolvedStakeholders
    .map((row) => row.userId)
    .filter((id): id is number => id != null);

  return {
    title: parsed.title,
    sponsor: sponsor.name,
    sponsorId: sponsor.userId ?? null,
    purpose: (parsed.purpose ?? '').trim(),
    scope: (parsed.scope ?? '').trim(),
    outOfScope: (parsed.outOfScope ?? '').trim(),
    goals: (parsed.goals ?? '').trim(),
    stakeholders: stakeholderNames,
    stakeholdersOwnerId,
    stakeholderUserIds: serializeStakeholderUserIds(idsForStorage),
    status: parsed.status ?? 'draft',
  };
}
