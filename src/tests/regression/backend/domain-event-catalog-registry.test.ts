import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { LAB_DOMAIN_EVENT_CATALOG } from '@/shared/lab-domain-events/aggregate-domain-event-catalog';
import { labDomainEventCatalogRepository } from '@/backend/db/LabEvents/lab-domain-event-catalog-repository';
import { domainEventCatalogRegistry } from '@/backend/lab-events/domain-event-catalog-registry';
import { labEventsService } from '@/backend/db/LabEvents/lab-events-service';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';

describe('domain-event-catalog-registry', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    await labEventsRepository.bootstrap(db);
    await labDomainEventCatalogRepository.bootstrap(db);
    domainEventCatalogRegistry.syncAll();
  });

  afterAll(() => {
    labDomainEventCatalogRepository.close();
    labEventsRepository.close();
    db.close();
  });

  test('materializes merged manifest row count in SQLite', () => {
    expect(labDomainEventCatalogRepository.countEntries()).toBe(LAB_DOMAIN_EVENT_CATALOG.length);
  });

  test('getEventCatalog reads declared entries from SQLite', () => {
    const catalog = labEventsService.getEventCatalog();
    expect(catalog.entries.length).toBeGreaterThanOrEqual(LAB_DOMAIN_EVENT_CATALOG.length);
    const types = new Set(catalog.entries.map((e) => e.eventType));
    for (const entry of LAB_DOMAIN_EVENT_CATALOG) {
      expect(types.has(entry.eventType)).toBe(true);
    }
  });

  test('buildStaticCatalog matches merged manifests', () => {
    const built = domainEventCatalogRegistry.buildStaticCatalog();
    expect(built.length).toBe(LAB_DOMAIN_EVENT_CATALOG.length);
  });
});