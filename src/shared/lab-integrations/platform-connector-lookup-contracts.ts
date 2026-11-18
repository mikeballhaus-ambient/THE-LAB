import type { FormBuilderContractModelProperty, LookupContract } from '@/shared/types/forms-builder-integration';
import { PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS } from './platform-catalog-integration-services';
import {
  buildPlatformUserLookupContractsForProperties,
  listPlatformUserLookupPropertyNames,
} from './platform-user-lookup-contracts';

function buildApprovalPolicyLookup(apiBase: string): LookupContract {
  const base = apiBase.replace(/\/$/, '');
  return {
    forProperty: 'policyId',
    endpoint: {
      url: `${base}/api/connector/lab-approval-policies`,
      type: 'GET',
      data: {},
      response: [],
    },
  };
}

/** Extra lookups for platform (:3000) connector discovery contracts. */
export function buildPlatformConnectorLookupContracts(
  apiBase: string,
  properties: FormBuilderContractModelProperty[],
  options?: { serviceId?: string; hostAppId?: string },
): LookupContract[] {
  const userProps = listPlatformUserLookupPropertyNames(properties);
  const userLookups = buildPlatformUserLookupContractsForProperties(apiBase, properties, {
    appId: options?.hostAppId,
  });

  const lookups = [...userLookups];

  for (const property of properties) {
    if (property.lookupProvider !== 'enum') {
      continue;
    }
    const enumOptions = property.options ?? [];
    if (enumOptions.length === 0) {
      continue;
    }
    lookups.push({
      forProperty: property.name,
      endpoint: {
        url: '',
        type: 'GET',
        data: {},
        response: enumOptions.map((option) => ({
          id: option.value,
          value: option.value,
          label: option.label,
        })),
      },
    });
  }

  if (options?.serviceId === PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS) {
    lookups.push(buildApprovalPolicyLookup(apiBase));
  }

  if (userProps.length === 0 && lookups.length === 0) {
    return [];
  }

  return lookups;
}
