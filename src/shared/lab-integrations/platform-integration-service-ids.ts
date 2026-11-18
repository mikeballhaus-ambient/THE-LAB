/** Integration service ids routed to main THE-LAB backend (:3000) platform connectors. */
export function isPlatformHostedIntegrationServiceId(serviceId: string | undefined): boolean {
  if (!serviceId) {
    return false;
  }
  const prefix = serviceId.split('.')[0];
  return (
    prefix === 'lab-approvals-policies'
    || prefix === 'lab-financial-ledger'
    || prefix === 'lab-workflow-studio'
    || prefix === 'lab-app-builder'
  );
}
