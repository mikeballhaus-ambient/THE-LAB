import { describe, expect, test } from '@jest/globals';
import { sanitizeToolResultContentForAgent } from '@/shared/utils/agent-audience-tool-result';

describe('sanitizeToolResultContentForAgent', () => {
  const fullApp = JSON.stringify({
    id: 'app-lab-crm',
    name: 'CRM',
    description: 'Customer relationship management for teams.',
    type: 'hybrid',
    appSystemInstructions: 'FormMounter on port 3010 Fastify Vue flowchart...',
    server: { port: 3010, entry: '/src/apps/lab-crm/back-end/server.ts' },
    componentPath: '/src/apps/lab-crm/front-end/App.vue',
  });

  test('strips technical fields in non-developer mode', () => {
    const out = sanitizeToolResultContentForAgent(
      'app_management_get_app',
      fullApp,
      false,
    );
    const parsed = JSON.parse(out) as Record<string, unknown>;
    expect(parsed.name).toBe('CRM');
    expect(parsed.appSystemInstructions).toBeUndefined();
    expect(parsed.server).toBeUndefined();
    expect(parsed.componentPath).toBeUndefined();
  });

  test('preserves full payload in developer mode', () => {
    const out = sanitizeToolResultContentForAgent(
      'app_management_get_app',
      fullApp,
      true,
    );
    expect(JSON.parse(out).appSystemInstructions).toContain('FormMounter');
  });
});
