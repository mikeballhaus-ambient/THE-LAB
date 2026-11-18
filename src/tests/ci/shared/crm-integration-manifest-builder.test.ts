import {
  buildCrmIntegrationManifest,
  mergePreservedCustomCrmManifestEntities,
} from '@/shared/lab-integrations/crm-integration-manifest-builder';
import { resolveIntegrationAppIdForService } from '@/shared/lab-integrations/resolve-integration-connector-server-url';

describe('CRM integration manifest', () => {
  test('includes entity form slots and cross-app task/ticket slots', () => {
    const manifest = buildCrmIntegrationManifest();
    expect(manifest.accepts?.some((row) => row.slot === 'crm.contacts.create.dialog')).toBe(true);
    expect(manifest.accepts?.some((row) => row.slot === 'crm.task.create.dialog')).toBe(true);
    expect(manifest.accepts?.some((row) => row.slot === 'crm.ticket.create.dialog')).toBe(true);
    expect(manifest.accepts?.some((row) => row.slot === 'reports.sales-by-stage')).toBe(true);
    expect(manifest.integrationServices?.some((s) => s.serviceId === 'crm.leads')).toBe(true);
    expect(manifest.integrationServices?.some((s) => s.serviceId === 'crm.quotes')).toBe(true);
    expect(manifest.accepts?.some((row) => row.slot === 'crm.quotes.create.dialog')).toBe(true);
    expect(manifest.integrationServices?.some((s) => s.serviceId === 'task-list.tasks')).toBe(true);
    expect(manifest.accepts?.some((row) => row.slot === 'crm.approval.request.decide.dialog')).toBe(
      true,
    );
    expect(manifest.accepts?.some((row) => row.slot === 'crm.approval.request.submit.dialog')).toBe(
      false,
    );
    expect(manifest.accepts?.some((row) => row.slot === 'crm.ledger.entry.post.dialog')).toBe(
      false,
    );
    expect(manifest.accepts?.some((row) => row.slot === 'crm.ledger.account.create.dialog')).toBe(
      true,
    );
    expect(manifest.accepts?.some((row) => row.slot === 'reports.ledger.activity')).toBe(true);
    expect(
      manifest.integrationServices?.some(
        (s) => s.serviceId === 'lab-approvals-policies.approval-requests',
      ),
    ).toBe(true);
  });

  test('includes custom entity sources in manifest', () => {
    const manifest = buildCrmIntegrationManifest({
      entitySources: [
        {
          entityKey: 'widgets',
          name: 'Widgets',
          description: 'Custom widgets',
          properties: [{ name: 'title', type: 'string', label: 'Title', required: true }],
        },
      ],
    });
    expect(manifest.integrationServices?.some((s) => s.serviceId === 'crm.widgets')).toBe(true);
    expect(manifest.accepts?.some((row) => row.slot === 'crm.widgets.create.dialog')).toBe(true);
  });

  test('mergePreservedCustomCrmManifestEntities keeps custom services on re-seed', () => {
    const defaultManifest = buildCrmIntegrationManifest();
    const withCustom = buildCrmIntegrationManifest({
      entitySources: [
        {
          entityKey: 'widgets',
          name: 'Widgets',
          properties: [{ name: 'title', type: 'string', label: 'Title' }],
        },
      ],
    });
    const merged = mergePreservedCustomCrmManifestEntities(defaultManifest, withCustom);
    expect(merged.integrationServices?.some((s) => s.serviceId === 'crm.widgets')).toBe(true);
    expect(merged.integrationServices?.some((s) => s.serviceId === 'crm.contacts')).toBe(true);
  });
});

describe('resolveIntegrationAppIdForService', () => {
  test('routes cross-app services to provider registry ids', () => {
    expect(resolveIntegrationAppIdForService('app-lab-crm', 'task-list.tasks')).toBe('app-lab-tasklist');
    expect(resolveIntegrationAppIdForService('app-lab-crm', 'help-desk.tickets')).toBe('app-lab-helpdesk');
    expect(resolveIntegrationAppIdForService('app-lab-crm', 'crm.sales')).toBe('app-lab-crm');
  });
});
