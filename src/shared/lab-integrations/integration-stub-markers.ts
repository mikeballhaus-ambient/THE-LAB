/** User-visible suffix on Forms Builder descriptions from integration stub provisioners. */
export const INTEGRATION_STUB_DESCRIPTION_MARKER = '(integration stub)';

/** Legacy suffix — still recognized so unbind cleanup finds pre-rm-67.1 rows. */
export const LEGACY_RM64_STUB_DESCRIPTION_MARKER = '(rm-64)';

/** @deprecated Use {@link LEGACY_RM64_STUB_DESCRIPTION_MARKER} */
export const RM64_STUB_DESCRIPTION_MARKER = LEGACY_RM64_STUB_DESCRIPTION_MARKER;

export function buildIntegrationStubFormDescription(slot: string): string {
  return `Stub form for ${slot} ${INTEGRATION_STUB_DESCRIPTION_MARKER}`;
}

export function isIntegrationStubFormDescription(description: string | null | undefined): boolean {
  const d = description ?? '';
  return (
    d.includes(INTEGRATION_STUB_DESCRIPTION_MARKER) ||
    d.includes(LEGACY_RM64_STUB_DESCRIPTION_MARKER) ||
    d.startsWith('Stub form for')
  );
}

export function isIntegrationStubChartDescription(description: string | null | undefined): boolean {
  const d = description ?? '';
  return (
    d.includes(INTEGRATION_STUB_DESCRIPTION_MARKER) ||
    d.includes(LEGACY_RM64_STUB_DESCRIPTION_MARKER) ||
    d.toLowerCase().includes('integration stub') ||
    d.toLowerCase().startsWith('catalog stub for')
  );
}

/** @deprecated Use {@link isIntegrationStubFormDescription} */
export const isRm64ProvisionedFormDescription = isIntegrationStubFormDescription;

/** @deprecated Use {@link isIntegrationStubChartDescription} */
export const isRm64ProvisionedChartDescription = isIntegrationStubChartDescription;

export function isLabIntegrationsHubDiscoveryUrl(discoveryUrl: string | null | undefined): boolean {
  const url = discoveryUrl ?? '';
  return url.includes('/api/platform/lab-integrations/hub/');
}
