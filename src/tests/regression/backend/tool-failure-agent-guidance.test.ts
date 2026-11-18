import { describe, expect, test } from '@jest/globals';
import {
  buildEnrichedToolFailureContent,
  buildToolFailureRecoveryUserMessage,
  classifyToolFailureMessage,
  formatZodValidationFailure,
  shouldSkipToolFailureRecoveryNudge,
  type ToolFailureSummary,
} from '@/backend/utils/tool-failure-agent-guidance';
import { z } from 'zod';

describe('tool-failure-agent-guidance', () => {
  test('classifyToolFailureMessage detects validation failures', () => {
    expect(
      classifyToolFailureMessage('Invalid arguments for app_management_get_app: bad'),
    ).toBe('arguments_validation');
  });

  test('formatZodValidationFailure lists issue paths', () => {
    const schema = z.object({ id: z.string(), userId: z.number() });
    const parsed = schema.safeParse({ userId: 'x' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const text = formatZodValidationFailure('app_management_get_app', parsed.error);
      expect(text).toContain('app_management_get_app');
      expect(text).toContain('`id`');
    }
  });

  test('buildEnrichedToolFailureContent uses lab integrations binding conflict hint', () => {
    const summaryList: ToolFailureSummary[] = [];
    const content = buildEnrichedToolFailureContent(
      'lab_integrations_upsert_binding',
      'CONFLICT: A binding already exists for slot "task.create.dialog" on this host',
      summaryList,
    );
    expect(content).toContain('bindingId');
    expect(content).toContain('overwrite: true');
  });

  test('buildEnrichedToolFailureContent adds fix hints', () => {
    const summaryList: ToolFailureSummary[] = [];
    const content = buildEnrichedToolFailureContent(
      'app_management_get_app',
      'Invalid arguments for app_management_get_app:\n- `id`: Required',
      summaryList,
    );
    expect(content).toContain('Argument validation failed');
    expect(content).toContain('app-lab-crm');
    expect(summaryList).toHaveLength(1);
  });

  test('buildToolFailureRecoveryUserMessage instructs retry via tools', () => {
    const msg = buildToolFailureRecoveryUserMessage([
      {
        toolId: 'read_file',
        kind: 'execution',
        detail: 'File not found',
      },
    ]);
    expect(msg).toContain('CRITICAL');
    expect(msg).toContain('native tool-calling');
  });

  test('shouldSkipToolFailureRecoveryNudge when loop warning present', () => {
    expect(
      shouldSkipToolFailureRecoveryNudge([
        { toolId: 'x', kind: 'execution', detail: '**BREAKING LOOP WARNING**' },
      ]),
    ).toBe(true);
  });
});
