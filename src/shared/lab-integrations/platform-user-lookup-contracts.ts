import type { FormBuilderContractModelProperty, LookupContract } from '@/shared/types/forms-builder-integration';

const PLATFORM_USER_LOOKUP_PROPERTY = /^(.*assignee.*|requesterLabUserId|ownerUserId)$/i;

export function isPlatformUserLookupProperty(propertyName: string): boolean {
  if (/assigneeUserId$/i.test(propertyName)) {
    return true;
  }
  return PLATFORM_USER_LOOKUP_PROPERTY.test(propertyName);
}

export function listPlatformUserLookupPropertyNames(
  properties: FormBuilderContractModelProperty[],
): string[] {
  const names = new Set<string>();
  for (const prop of properties) {
    if (isPlatformUserLookupProperty(prop.name)) {
      names.add(prop.name);
    }
  }
  return [...names];
}

export function buildPlatformUserLookupContracts(
  apiBase: string,
  forProperties: string[],
  options?: { appId?: string },
): LookupContract[] {
  const base = apiBase.replace(/\/$/, '');
  const appQuery = options?.appId ? `?appId=${encodeURIComponent(options.appId)}` : '';
  return forProperties.map((forProperty) => ({
    forProperty,
    endpoint: {
      url: `${base}/api/platform/users/lookup${appQuery}`,
      type: 'GET',
      data: {},
      response: [],
    },
  }));
}

export function buildPlatformUserLookupContractsForProperties(
  apiBase: string,
  properties: FormBuilderContractModelProperty[],
  options?: { appId?: string },
): LookupContract[] {
  return buildPlatformUserLookupContracts(
    apiBase,
    listPlatformUserLookupPropertyNames(properties),
    options,
  );
}
