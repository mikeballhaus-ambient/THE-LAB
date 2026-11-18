import { describe, expect, test } from '@jest/globals';
import { verifyDomainEventManifestPack } from '@/shared/lab-domain-events/verify-domain-event-manifest-pack';
import { LAB_DOMAIN_EVENT_MANIFESTS } from '@/shared/lab-domain-events/domain-event-manifest-index';

describe('domain event manifests', () => {
  test('verify pack passes (index matches disk, no duplicate event types)', () => {
    const result = verifyDomainEventManifestPack();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.stats.catalogEntries).toBeGreaterThan(0);
  });

  test('each manifest array is non-empty or intentionally scaffolded elsewhere', () => {
    const nonEmpty = LAB_DOMAIN_EVENT_MANIFESTS.filter((m) => m.length > 0);
    expect(nonEmpty.length).toBe(LAB_DOMAIN_EVENT_MANIFESTS.length);
  });
});