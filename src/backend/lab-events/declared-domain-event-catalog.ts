import { labDomainEventCatalogRepository } from '@/backend/db/LabEvents/lab-domain-event-catalog-repository';
import { mergeLabDomainEventManifests } from '@/shared/lab-domain-events/domain-event-manifest-index';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

function materializedCatalogEntryCount(): number {
  try {
    return labDomainEventCatalogRepository.countEntries();
  } catch {
    return 0;
  }
}

/** Materialized DB rows when present; otherwise merged on-disk manifests (bootstrap/tests). */
export function loadDeclaredDomainEventCatalogEntries(): readonly LabDomainEventCatalogEntry[] {
  if (materializedCatalogEntryCount() > 0) {
    return labDomainEventCatalogRepository.listAllEntries();
  }
  return mergeLabDomainEventManifests();
}