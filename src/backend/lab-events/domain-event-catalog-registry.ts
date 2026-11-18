import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import { mergeLabDomainEventManifests } from '@/shared/lab-domain-events/domain-event-manifest-index';
import { labDomainEventCatalogRepository } from '@/backend/db/LabEvents/lab-domain-event-catalog-repository';

/**
 * Aggregates per-app and platform domain-event manifests into the materialized SQLite catalog.
 */
export class DomainEventCatalogRegistry {
  private static instance: DomainEventCatalogRegistry | null = null;

  private readonly appManifests = new Map<string, readonly LabDomainEventCatalogEntry[]>();
  private platformManifest: readonly LabDomainEventCatalogEntry[] = [];

  private constructor() {}

  static getInstance(): DomainEventCatalogRegistry {
    if (!DomainEventCatalogRegistry.instance) {
      DomainEventCatalogRegistry.instance = new DomainEventCatalogRegistry();
    }
    return DomainEventCatalogRegistry.instance;
  }

  registerAppManifest(appId: string, entries: readonly LabDomainEventCatalogEntry[]): void {
    this.appManifests.set(appId, [...entries]);
  }

  registerPlatformManifest(entries: readonly LabDomainEventCatalogEntry[]): void {
    this.platformManifest = [...entries];
  }

  clearRegistrations(): void {
    this.appManifests.clear();
    this.platformManifest = [];
  }

  /**
   * Merged catalog for CI and build-time checks. Duplicate `eventType` values throw.
   */
  buildStaticCatalog(): readonly LabDomainEventCatalogEntry[] {
    const merged: LabDomainEventCatalogEntry[] = [];
    const seen = new Set<string>();

    const addAll = (entries: readonly LabDomainEventCatalogEntry[]) => {
      for (const entry of entries) {
        if (seen.has(entry.eventType)) {
          throw new Error(`Duplicate domain event type in catalog registry: ${entry.eventType}`);
        }
        seen.add(entry.eventType);
        merged.push(entry);
      }
    };

    addAll(this.platformManifest);
    for (const entries of this.appManifests.values()) {
      addAll(entries);
    }

    if (merged.length === 0) {
      return mergeLabDomainEventManifests();
    }

    return merged;
  }

  syncToDatabase(): void {
    const entries = this.buildStaticCatalog();
    labDomainEventCatalogRepository.syncEntries(entries);
  }

  /** Platform bootstrap — materialize registered manifests (defaults to on-disk index). */
  syncAll(): void {
    this.syncToDatabase();
  }

  removeAppManifest(appId: string): void {
    this.appManifests.delete(appId);
    labDomainEventCatalogRepository.deleteBySourceAppId(appId);
  }
}

export const domainEventCatalogRegistry = DomainEventCatalogRegistry.getInstance();