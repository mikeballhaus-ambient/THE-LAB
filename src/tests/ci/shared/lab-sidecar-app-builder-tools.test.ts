import { describe, expect, test } from '@jest/globals';
import {
  applyLabSidecarPersonaTools,
  LAB_SIDECAR_APP_BUILDER_TOOL_IDS,
} from '@/shared/config/lab-sidecar-app-builder-tools';
import type { Persona } from '@/shared/types/persona';

const persona: Persona = {
  name: 'Chat',
  sysMsg: {
    role: 'chat',
    capabilities: '',
    output: '',
    rules: '',
  },
  slashCommands: [],
  tools: [
    'app_management_create_app',
    'read_file',
    'app_management_get_apps',
    'ui_automation_discover_elements',
  ],
  reasoning: { medium: 0.5 },
};

describe('lab-sidecar app builder tools', () => {
  test('narrows persona tools for app_builder profile', () => {
    const narrowed = applyLabSidecarPersonaTools(persona, 'app_builder');
    expect(narrowed?.tools).toEqual([
      'app_management_create_app',
      'app_management_get_apps',
      'ui_automation_discover_elements',
    ]);
    expect(narrowed?.tools).not.toContain('read_file');
  });

  test('leaves persona unchanged without profile', () => {
    expect(applyLabSidecarPersonaTools(persona, undefined)).toBe(persona);
  });

  test('allowlist includes app management and ui automation', () => {
    expect(LAB_SIDECAR_APP_BUILDER_TOOL_IDS).toContain('app_management_create_app');
    expect(LAB_SIDECAR_APP_BUILDER_TOOL_IDS).toContain('awaiter');
  });
});
