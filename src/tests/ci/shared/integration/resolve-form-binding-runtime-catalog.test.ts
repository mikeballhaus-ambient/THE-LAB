import { resolveFormBindingRuntime } from '@/shared/integration/resolve-form-binding-runtime';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';

/**
 * Regression cover for "click pencil → edit dialog opens empty".
 *
 * Catalog hosts derive slots from `buildCatalogHostManifest`, which emits edit/delete
 * `contextKeys` as `[...parentContextKeys, idContextKey]`. The runtime only knew a fixed list
 * of legacy slot names, so `location.edit.dialog` resolved `recordId: null`, the panel skipped
 * its connector GET, and the form rendered blank.
 */

const WEATHER_MANIFEST = {
  schemaVersion: 1,
  integrationServices: [
    {
      serviceId: 'weather-dashboard.locations',
      entityName: 'Location',
      capabilities: ['CRUD'],
      connector: { segment: 'locations' },
      primaryKeyType: 'number',
      properties: [],
    },
    {
      serviceId: 'weather-dashboard.weather-observations',
      entityName: 'WeatherObservation',
      capabilities: ['CRUD'],
      connector: { segment: 'weather-observations' },
      primaryKeyType: 'number',
      properties: [],
    },
  ],
  accepts: [
    {
      kind: 'form.surface',
      slot: 'location.edit.dialog',
      label: 'Edit Location',
      contextKeys: ['locationId'],
      requiresServiceId: 'weather-dashboard.locations',
    },
    {
      kind: 'form.surface',
      slot: 'weather-observation.edit.dialog',
      label: 'Edit WeatherObservation',
      contextKeys: ['locationId', 'weatherObservationId'],
      requiresServiceId: 'weather-dashboard.weather-observations',
    },
    {
      kind: 'form.surface',
      slot: 'location.delete.dialog',
      label: 'Delete Location',
      contextKeys: ['locationId'],
      requiresServiceId: 'weather-dashboard.locations',
    },
    {
      kind: 'form.surface',
      slot: 'weather-observation.delete.dialog',
      label: 'Delete WeatherObservation',
      contextKeys: ['locationId', 'weatherObservationId'],
      requiresServiceId: 'weather-dashboard.weather-observations',
    },
    {
      kind: 'form.surface',
      slot: 'location.create.dialog',
      label: 'Create Location',
      requiresServiceId: 'weather-dashboard.locations',
    },
  ],
} as unknown as AppLabIntegrationManifestV1;

function binding(slot: string, providerRef = 'form-key'): LabIntegrationBindingRecord {
  return {
    id: 'b1',
    hostAppId: 'app-weather-dashboard',
    slot,
    kind: 'form.surface',
    providerAppId: 'app-lab-formsbuilder',
    providerRef,
    config: {},
    isEnabled: true,
  } as unknown as LabIntegrationBindingRecord;
}

describe('catalog edit/delete record id resolution', () => {
  test('resolves the entity id for a single-key catalog edit slot', () => {
    const runtime = resolveFormBindingRuntime(
      WEATHER_MANIFEST,
      binding('location.edit.dialog'),
      { locationId: 12 },
    );
    expect(runtime?.recordId).toBe(12);
    expect(runtime?.connectorEntitySegment).toBe('locations');
  });

  test('takes the last context key so the parent id does not shadow the entity id', () => {
    const runtime = resolveFormBindingRuntime(
      WEATHER_MANIFEST,
      binding('weather-observation.edit.dialog'),
      { locationId: 3, weatherObservationId: 44 },
    );
    expect(runtime?.recordId).toBe(44);
  });

  test('accepts string ids from the host context', () => {
    const runtime = resolveFormBindingRuntime(
      WEATHER_MANIFEST,
      binding('weather-observation.delete.dialog'),
      { locationId: '3', weatherObservationId: '44' },
    );
    expect(runtime?.recordId).toBe(44);
  });

  test('rental lease edit resolves leaseId when parent propertyId is also present', () => {
    const manifest = {
      schemaVersion: 1,
      integrationServices: [
        {
          serviceId: 'rental-property.leases',
          entityName: 'Lease',
          capabilities: ['CRUD'],
          connector: { segment: 'leases' },
          primaryKeyType: 'number',
          properties: [],
        },
      ],
      accepts: [
        {
          kind: 'form.surface',
          slot: 'lease.edit.dialog',
          label: 'Edit lease',
          contextKeys: ['propertyId', 'leaseId'],
          requiresServiceId: 'rental-property.leases',
        },
      ],
    } as unknown as AppLabIntegrationManifestV1;

    const runtime = resolveFormBindingRuntime(
      manifest,
      binding('lease.edit.dialog'),
      { propertyId: 1, leaseId: 7 },
    );
    expect(runtime?.recordId).toBe(7);
  });

  test('create slots stay empty so the form does not hydrate a record', () => {
    const runtime = resolveFormBindingRuntime(
      WEATHER_MANIFEST,
      binding('location.create.dialog'),
      { locationId: 12 },
    );
    expect(runtime?.recordId).toBeNull();
  });
});
