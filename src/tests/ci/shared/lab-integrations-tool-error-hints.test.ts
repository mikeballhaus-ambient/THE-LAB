import { describe, expect, test } from '@jest/globals';
import { resolveLabIntegrationsToolFixHint } from '@/shared/lab-integrations/lab-integrations-tool-error-hints';

describe('lab-integrations-tool-error-hints', () => {
  test('upsert binding conflict suggests bindingId and clarifies overwrite', () => {
    const hint = resolveLabIntegrationsToolFixHint(
      'lab_integrations_upsert_binding',
      'CONFLICT: A binding already exists for slot "task.create.dialog" on this host',
    );
    expect(hint).toContain('list_bindings');
    expect(hint).toContain('bindingId');
    expect(hint).toContain('overwrite: true');
    expect(hint).toContain('not** on upsert_binding');
  });

  test('provision form stub conflict suggests overwrite', () => {
    const hint = resolveLabIntegrationsToolFixHint(
      'lab_integrations_provision_form_stub',
      'CONFLICT: Form already exists for key: task-list.task-list.task-create',
    );
    expect(hint).toContain('overwrite: true');
  });
});
