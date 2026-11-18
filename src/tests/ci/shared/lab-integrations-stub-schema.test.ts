import { describe, expect, test } from '@jest/globals';
import { ProvisionFormStubRequestSchema } from '@/shared/types/schemas/lab-integrations-stub-schema';
import { labIntegrationsProvisionFormStubSchemaFields } from '@/shared/types/schemas/lab-integrations-mcp-schemas';

describe('ProvisionFormStubRequestSchema', () => {
  const base = {
    hostAppId: 'app-lab-tasklist',
    serviceId: 'task-list.tasks',
    slot: 'task.create.dialog',
  };

  test('accepts boolean overwrite', () => {
    const parsed = ProvisionFormStubRequestSchema.parse({ ...base, overwrite: true });
    expect(parsed.overwrite).toBe(true);
  });

  test('coerces string overwrite from models', () => {
    const parsed = ProvisionFormStubRequestSchema.parse({ ...base, overwrite: 'true' });
    expect(parsed.overwrite).toBe(true);
  });

  test('MCP schema includes userId and overwrite', () => {
    const parsed = labIntegrationsProvisionFormStubSchemaFields.parse({
      userId: 1,
      ...base,
      overwrite: 'true',
    });
    expect(parsed.userId).toBe(1);
    expect(parsed.overwrite).toBe(true);
  });
});
