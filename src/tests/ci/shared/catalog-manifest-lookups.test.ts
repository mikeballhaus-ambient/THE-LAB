import { describe, expect, test } from '@jest/globals';
import {
  CATALOG_HOST_APP_IDS,
  CATALOG_MANIFEST_SEEDS,
  catalogHostDef,
} from '@/shared/lab-integrations/catalog-manifests';
import { buildCatalogHostManifest } from '@/shared/lab-integrations/catalog-manifest-builder';
import { buildCatalogAppDiscoveryContract } from '@/shared/lab-integrations/build-catalog-app-discovery-contract';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';

function propertiesFor(hostAppId: string): FormBuilderContractModelProperty[] {
  const def = catalogHostDef(hostAppId);
  if (!def) {
    throw new Error(`No catalog host def for ${hostAppId}`);
  }
  return def.entities.flatMap(
    (entity) => entity.properties as FormBuilderContractModelProperty[],
  );
}

// `app-weather-dashboard` intentionally has no lookup-bearing property: it persists only flat
// location records (name/lat/lon) and conditions are always live. Exempt it explicitly so this
// guard still catches a *new* host that forgets to declare lookups.
const LOOKUP_EXEMPT_HOSTS = new Set(['app-weather-dashboard']);

describe('catalog manifests — lookup coverage', () => {
  test('every catalog host declares at least one lookup property', () => {
    const missing = CATALOG_HOST_APP_IDS.filter(
      (appId) =>
        !LOOKUP_EXEMPT_HOSTS.has(appId) &&
        !propertiesFor(appId).some((prop) => prop.lookupProvider),
    );
    expect(missing).toEqual([]);
  });

  test('relationship parent keys use self-entity lookups', () => {
    // Entity keys are the connector segments of the provider entity.
    const parentKeys = [
      ['app-okr-goals', 'objectiveId', 'objectives'],
      ['app-travel-itinerary', 'tripId', 'trips'],
      ['app-training-quizzes', 'quizId', 'quizzes'],
      ['app-onboarding-checklist', 'checklistId', 'checklists'],
      ['app-home-maintenance', 'assetId', 'home-assets'],
      ['app-rental-property', 'propertyId', 'properties'],
      ['app-rental-property', 'leaseId', 'leases'],
      ['app-event-rsvp', 'eventId', 'events'],
      ['app-polls-surveys', 'pollId', 'polls'],
    ] as const;

    for (const [appId, propName, entityKey] of parentKeys) {
      const prop = propertiesFor(appId).find((row) => row.name === propName);
      expect({ appId, propName, provider: prop?.lookupProvider }).toEqual({
        appId,
        propName,
        provider: 'self-entity',
      });
      expect({ appId, propName, entity: prop?.lookupEntityKey }).toEqual({
        appId,
        propName,
        entity: entityKey,
      });
    }
  });

  test('person fields use lab-user lookups', () => {
    const personFields = [
      ['app-okr-goals', 'ownerName'],
      ['app-project-charter', 'sponsor'],
      ['app-project-charter', 'stakeholders'],
      ['app-suggestion-box', 'author'],
      ['app-expense-reports', 'submitter'],
      ['app-knowledge-base', 'author'],
      ['app-time-tracking', 'teamMember'],
      ['app-onboarding-checklist', 'newHire'],
      ['app-onboarding-checklist', 'owner'],
      ['app-training-quizzes', 'learner'],
      ['app-event-rsvp', 'guestName'],
    ] as const;

    for (const [appId, propName] of personFields) {
      const prop = propertiesFor(appId).find((row) => row.name === propName);
      expect({ appId, propName, provider: prop?.lookupProvider }).toEqual({
        appId,
        propName,
        provider: 'lab-user',
      });
    }
  });

  test('status and stage fields carry enum options', () => {
    const enumFields = [
      ['app-okr-goals', 'status'],
      ['app-project-charter', 'status'],
      ['app-job-applicant-tracker', 'stage'],
      ['app-suggestion-box', 'status'],
      ['app-expense-reports', 'category'],
      ['app-knowledge-base', 'status'],
      ['app-onboarding-checklist', 'status'],
      ['app-home-maintenance', 'priority'],
      ['app-rental-property', 'status'],
      ['app-event-rsvp', 'response'],
      ['app-polls-surveys', 'kind'],
      ['app-polls-surveys', 'status'],
      ['app-training-quizzes', 'status'],
    ] as const;

    for (const [appId, propName] of enumFields) {
      const prop = propertiesFor(appId).find((row) => row.name === propName);
      expect({ appId, propName, provider: prop?.lookupProvider }).toEqual({
        appId,
        propName,
        provider: 'enum',
      });
      expect(prop?.options?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('catalog discovery contracts emit lookups', () => {
  test('every catalog app contract has at least one lookup', () => {
    const empty: string[] = [];

    for (const [hostAppId] of CATALOG_MANIFEST_SEEDS) {
      const def = catalogHostDef(hostAppId);
      if (!def) {
        continue;
      }
      const manifest = buildCatalogHostManifest(def);
      const descriptors = manifest.integrationServices ?? [];
      const lookupCount = descriptors.reduce((total, descriptor) => {
        const contract = buildCatalogAppDiscoveryContract(
          def.slug,
          descriptor,
          'http://localhost',
          4100,
        );
        return total + contract.endpoints.lookups.length;
      }, 0);

      if (lookupCount === 0 && !LOOKUP_EXEMPT_HOSTS.has(hostAppId)) {
        empty.push(hostAppId);
      }
    }

    expect(empty).toEqual([]);
  });

  test('lab-user lookups point at the platform users endpoint', () => {
    const def = catalogHostDef('app-okr-goals');
    if (!def) throw new Error('missing def');
    const manifest = buildCatalogHostManifest(def);
    const descriptor = (manifest.integrationServices ?? []).find(
      (row) => row.serviceId === 'okr-goals.objectives',
    );
    if (!descriptor) throw new Error('missing descriptor');

    const contract = buildCatalogAppDiscoveryContract(
      def.slug,
      descriptor,
      'http://localhost',
      4110,
    );
    const ownerLookup = contract.endpoints.lookups.find((row) => row.forProperty === 'ownerName');

    expect(ownerLookup?.endpoint.url).toBe('/api/platform/users/lookup');
  });

  test('enum lookups embed options instead of fetching', () => {
    const def = catalogHostDef('app-polls-surveys');
    if (!def) throw new Error('missing def');
    const manifest = buildCatalogHostManifest(def);
    const descriptor = (manifest.integrationServices ?? []).find(
      (row) => row.serviceId === 'polls-surveys.polls',
    );
    if (!descriptor) throw new Error('missing descriptor');

    const contract = buildCatalogAppDiscoveryContract(
      def.slug,
      descriptor,
      'http://localhost',
      4124,
    );
    const kindLookup = contract.endpoints.lookups.find((row) => row.forProperty === 'kind');

    expect(kindLookup?.endpoint.url).toBe('');
    expect(kindLookup?.endpoint.response.map((r) => r.value)).toEqual(['single', 'multi']);
  });
});
