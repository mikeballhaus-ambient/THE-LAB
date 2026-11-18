import { describe, expect, test } from '@jest/globals';
import {
  buildCatalogAppDiscoveryContract,
  buildCatalogLookupContracts,
} from '@/shared/lab-integrations/build-catalog-app-discovery-contract';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';

function descriptor(
  properties: FormBuilderContractModelProperty[],
): IntegrationServiceDescriptor {
  return {
    serviceId: 'okr-goals.objectives',
    label: 'Objective',
    tier: 'domain',
    entityName: 'Objective',
    capabilities: ['CRUD'],
    connector: { segment: 'objectives', discoveryPath: '/connector/discovery/objective' },
    properties,
    primaryKeyType: 'number',
  };
}

const idHidden: FormBuilderContractModelProperty = {
  name: 'id',
  type: 'number',
  label: 'ID',
  hidden: true,
};

describe('buildCatalogLookupContracts', () => {
  test('returns nothing when no property declares a lookupProvider', () => {
    const lookups = buildCatalogLookupContracts(
      descriptor([idHidden, { name: 'title', type: 'string', label: 'Title' }]),
      { selfBaseUrl: 'http://localhost:4110' },
    );
    expect(lookups).toEqual([]);
  });

  test('emits embedded options for enum properties without a fetch', () => {
    const lookups = buildCatalogLookupContracts(
      descriptor([
        {
          name: 'status',
          type: 'string',
          label: 'Status',
          lookupProvider: 'enum',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
          ],
        },
      ]),
      { selfBaseUrl: 'http://localhost:4110' },
    );

    expect(lookups).toHaveLength(1);
    expect(lookups[0].forProperty).toBe('status');
    expect(lookups[0].endpoint.url).toBe('');
    expect(lookups[0].endpoint.response).toEqual([
      { id: 'open', value: 'open', label: 'Open' },
      { id: 'closed', value: 'closed', label: 'Closed' },
    ]);
  });

  test('emits the platform users endpoint for lab-user properties', () => {
    const lookups = buildCatalogLookupContracts(
      descriptor([{ name: 'ownerName', type: 'string', label: 'Owner', lookupProvider: 'lab-user' }]),
      { selfBaseUrl: 'http://localhost:4110' },
    );

    expect(lookups).toHaveLength(1);
    expect(lookups[0].forProperty).toBe('ownerName');
    expect(lookups[0].endpoint.url).toBe('/api/platform/users/lookup');
  });

  test('emits an absolute self-entity URL for parent links', () => {
    const lookups = buildCatalogLookupContracts(
      descriptor([
        {
          name: 'objectiveId',
          type: 'number',
          label: 'Objective',
          hidden: true,
          lookupProvider: 'self-entity',
          lookupEntityKey: 'objectives',
        },
      ]),
      { selfBaseUrl: 'http://localhost:4110/' },
    );

    expect(lookups).toHaveLength(1);
    expect(lookups[0].endpoint.url).toBe(
      'http://localhost:4110/api/connector/objectives/lookups/objectiveId',
    );
  });

  test('routes provider-entity lookups through the platform proxy', () => {
    const lookups = buildCatalogLookupContracts(
      descriptor([
        {
          name: 'companyId',
          type: 'number',
          label: 'Account',
          lookupProvider: 'provider-entity',
          lookupProviderAppId: 'app-lab-crm',
          lookupEntityKey: 'accounts',
        },
      ]),
      { selfBaseUrl: 'http://localhost:4110' },
    );

    expect(lookups).toHaveLength(1);
    // The caller never needs the provider port — :3000 resolves it from the registry.
    expect(lookups[0].endpoint.url).toBe(
      '/api/platform/lab-lookup/app-lab-crm/accounts/lookups/companyId',
    );
  });

  test('skips provider-entity properties with no provider app id', () => {
    const lookups = buildCatalogLookupContracts(
      descriptor([
        {
          name: 'companyId',
          type: 'number',
          lookupProvider: 'provider-entity',
          lookupEntityKey: 'accounts',
        },
      ]),
      { selfBaseUrl: 'http://localhost:4110' },
    );

    expect(lookups).toEqual([]);
  });

  test('skips enum properties with no options', () => {
    const lookups = buildCatalogLookupContracts(
      descriptor([{ name: 'stage', type: 'string', lookupProvider: 'enum' }]),
      { selfBaseUrl: 'http://localhost:4110' },
    );
    expect(lookups).toEqual([]);
  });

  test('skips provider-entity properties with no lookupEntityKey', () => {
    const lookups = buildCatalogLookupContracts(
      descriptor([{ name: 'companyId', type: 'number', lookupProvider: 'provider-entity' }]),
      { selfBaseUrl: 'http://localhost:4110' },
    );
    expect(lookups).toEqual([]);
  });

  test('emits one contract per lookup property', () => {
    const lookups = buildCatalogLookupContracts(
      descriptor([
        { name: 'ownerName', type: 'string', lookupProvider: 'lab-user' },
        { name: 'status', type: 'string', lookupProvider: 'enum', options: [{ value: 'a', label: 'A' }] },
      ]),
      { selfBaseUrl: 'http://localhost:4110' },
    );
    expect(lookups.map((l) => l.forProperty).sort()).toEqual(['ownerName', 'status']);
  });
});

describe('buildCatalogAppDiscoveryContract', () => {
  test('includes lookups in the emitted contract', () => {
    const contract = buildCatalogAppDiscoveryContract(
      'okr-goals',
      descriptor([
        idHidden,
        { name: 'ownerName', type: 'string', label: 'Owner', lookupProvider: 'lab-user' },
      ]),
      'http://localhost',
      4110,
    );

    expect(contract.endpoints.lookups).toHaveLength(1);
    expect(contract.endpoints.lookups[0].forProperty).toBe('ownerName');
  });

  test('emits an empty lookup array when no property declares one', () => {
    const contract = buildCatalogAppDiscoveryContract(
      'project-charter',
      descriptor([idHidden, { name: 'title', type: 'string', label: 'Title' }]),
      'http://localhost',
      4112,
    );
    expect(contract.endpoints.lookups).toEqual([]);
  });

  test('provider-entity lookups point at the platform proxy', () => {
    const contract = buildCatalogAppDiscoveryContract(
      'expense-reports',
      descriptor([
        {
          name: 'companyId',
          type: 'number',
          lookupProvider: 'provider-entity',
          lookupProviderAppId: 'app-lab-crm',
          lookupEntityKey: 'accounts',
        },
      ]),
      'http://localhost',
      4116,
    );

    expect(contract.endpoints.lookups[0].endpoint.url).toBe(
      '/api/platform/lab-lookup/app-lab-crm/accounts/lookups/companyId',
    );
  });
});
