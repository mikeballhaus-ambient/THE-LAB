import type {
  LabDomainEventCatalogEntry,
  LabDomainEventCatalogResponse,
  LabDomainEventObservedType,
} from '@/shared/types/lab-domain-event-catalog';

function humanizeEventType(eventType: string): string {
  const segment = eventType.split('.').pop() ?? eventType;
  return segment
    .split(/[-_]/g)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function synthesizeEntryFromObserved(row: LabDomainEventObservedType): LabDomainEventCatalogEntry {
  return {
    eventType: row.eventType,
    sourceAppId: row.sourceAppId,
    label: humanizeEventType(row.eventType),
    description: 'Observed on the lab event bus (not yet documented in the static catalog).',
    publisherKind: row.sourceAppId.startsWith('app-') ? 'catalog-app' : 'platform',
    payloadFields: [],
    neverFired: false,
  };
}

export function findCatalogEntryByEventType(
  eventType: string,
  declaredEntries: readonly LabDomainEventCatalogEntry[],
): LabDomainEventCatalogEntry | undefined {
  return declaredEntries.find((e) => e.eventType === eventType);
}

/**
 * Merge declared catalog with types observed in the event log.
 *
 * Callers must pass `declaredEntries` from the catalog API or merged manifests (server/tests).
 */
export function buildLabDomainEventCatalogResponse(
  observed: LabDomainEventObservedType[],
  declaredEntries: readonly LabDomainEventCatalogEntry[],
): LabDomainEventCatalogResponse {
  const catalogTypes = new Set(declaredEntries.map((e) => e.eventType));
  const observedTypes = new Set(observed.map((o) => o.eventType));
  const observedOnly = observed.filter((o) => !catalogTypes.has(o.eventType));

  const declared: LabDomainEventCatalogEntry[] = declaredEntries.map((entry) => ({
    ...entry,
    neverFired: !observedTypes.has(entry.eventType),
  }));

  const mergedFromObserved: LabDomainEventCatalogEntry[] = observedOnly.map(
    synthesizeEntryFromObserved,
  );

  const entries = [...declared, ...mergedFromObserved].sort((a, b) => {
    const app = a.sourceAppId.localeCompare(b.sourceAppId);
    if (app !== 0) {
      return app;
    }
    return a.eventType.localeCompare(b.eventType);
  });

  return {
    schemaVersion: 1,
    entries,
    observedOnly,
  };
}

export function isKnownEventType(
  eventType: string,
  observed: LabDomainEventObservedType[] = [],
  declaredEntries: readonly LabDomainEventCatalogEntry[] = [],
): boolean {
  if (!eventType) {
    return false;
  }
  if (declaredEntries.some((entry) => entry.eventType === eventType)) {
    return true;
  }
  return observed.some((row) => row.eventType === eventType);
}

export function groupCatalogEntriesBySource(
  entries: LabDomainEventCatalogEntry[],
): { sourceAppId: string; events: LabDomainEventCatalogEntry[] }[] {
  const map = new Map<string, LabDomainEventCatalogEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.sourceAppId) ?? [];
    list.push(entry);
    map.set(entry.sourceAppId, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sourceAppId, events]) => ({ sourceAppId, events }));
}