import { createHash } from 'node:crypto';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/** Stable hash for idempotent catalog UPSERT (excludes runtime-only `neverFired`). */
export function hashLabDomainEventCatalogEntry(entry: LabDomainEventCatalogEntry): string {
  const payload = {
    eventType: entry.eventType,
    sourceAppId: entry.sourceAppId,
    label: entry.label,
    description: entry.description,
    publisherKind: entry.publisherKind,
    payloadFields: entry.payloadFields,
    dynamicPayload: entry.dynamicPayload ?? false,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}