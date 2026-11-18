/**
 * Server / CI aggregate — imports every manifest module. Do not import from dashboard UI.
 */
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import { mergeLabDomainEventManifests } from './domain-event-manifest-index';

export const LAB_DOMAIN_EVENT_CATALOG: readonly LabDomainEventCatalogEntry[] =
  mergeLabDomainEventManifests();

export function catalogEventTypes(): readonly string[] {
  return LAB_DOMAIN_EVENT_CATALOG.map((entry) => entry.eventType);
}