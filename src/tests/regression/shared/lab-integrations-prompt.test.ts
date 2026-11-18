import { describe, expect, test } from '@jest/globals';
import {
  detectIntegrationWorkflowPhase,
  shouldInjectIntegrationRouting,
} from '@/shared/config/lab-integrations-prompt';
import { appendLabIntegrationsPromptLayers } from '@/backend/utils/lab-integrations-system-prompt';

describe('lab-integrations prompt routing', () => {
  test('shouldInjectIntegrationRouting matches integration keywords', () => {
    expect(shouldInjectIntegrationRouting('Please bind a form to Task List', undefined)).toBe(true);
    expect(
      shouldInjectIntegrationRouting(
        "Read what's configured for Task List integrations and bindings",
        undefined,
      ),
    ).toBe(true);
    expect(shouldInjectIntegrationRouting('hello', undefined)).toBe(false);
    expect(shouldInjectIntegrationRouting('remove all Chart Builder bindings', undefined)).toBe(
      true,
    );
    expect(shouldInjectIntegrationRouting('re-add stubs for chart.designer.metadata', undefined)).toBe(
      true,
    );
    expect(
      shouldInjectIntegrationRouting('list the bindings for chart builder', undefined),
    ).toBe(true);
  });

  test('detectIntegrationWorkflowPhase defaults to discover for configuration questions', () => {
    expect(
      detectIntegrationWorkflowPhase('Task List from a clean slate — what is missing?', undefined),
    ).toBe('discover');
  });

  test('detectIntegrationWorkflowPhase honors sidecar phase', () => {
    expect(
      detectIntegrationWorkflowPhase('anything', {
        viewMode: 'single_app',
        visibleAppIds: ['app-lab-tasklist'],
        focusedAppId: 'app-lab-tasklist',
        integrationWorkflowPhase: 'bind_form',
      }),
    ).toBe('bind_form');
  });

  test('detectIntegrationWorkflowPhase routes chart and export intents', () => {
    expect(detectIntegrationWorkflowPhase('Bind a status chart on Task List reports', undefined)).toBe(
      'bind_chart',
    );
    expect(
      detectIntegrationWorkflowPhase('Make CRM expose contacts for other apps', undefined),
    ).toBe('export_host');
    expect(
      detectIntegrationWorkflowPhase('Add a create dialog slot on Help Desk host shell', undefined),
    ).toBe('host_shell');
  });

  test('appendLabIntegrationsPromptLayers injects bind_chart playbook', async () => {
    const out = await appendLabIntegrationsPromptLayers('BASE', {
      latestUserMessage: 'integration: provision chart stub for reports.by-status',
    });
    expect(out).toContain('lab_integrations_provision_chart_stub');
    expect(out).toContain('chart.surface');
  });

  test('appendLabIntegrationsPromptLayers prepends Code switch preamble for Chat', async () => {
    const out = await appendLabIntegrationsPromptLayers('BASE', {
      latestUserMessage: 'list the bindings for chart builder',
      currentPersonaName: 'Chat',
    });
    expect(out.indexOf('INTEGRATION TURN')).toBeLessThan(out.indexOf('BASE'));
    expect(out).toContain('persona_manager_switch_persona');
    expect(out).toContain('Do **not** claim integration tools are missing');
  });

  test('appendLabIntegrationsPromptLayers omits preamble for Code', async () => {
    const out = await appendLabIntegrationsPromptLayers('BASE', {
      latestUserMessage: 'list bindings for app-lab-chartbuilder',
      currentPersonaName: 'Code',
    });
    expect(out).not.toContain('INTEGRATION TURN');
    expect(out).toContain('BASE');
  });

  test('appendLabIntegrationsPromptLayers injects routing markdown', async () => {
    const out = await appendLabIntegrationsPromptLayers('BASE', {
      latestUserMessage: 'wire Forms Builder integration',
      currentPersonaName: 'Chat',
    });
    expect(out).toContain('BASE');
    expect(out).toContain('persona_manager_switch_persona');
    expect(out).toContain('FORBIDDEN');
    expect(out).toContain('plain, kind language');
    expect(out).toContain('autopopulates');
    expect(out).toContain('empty shells');
  });
});
