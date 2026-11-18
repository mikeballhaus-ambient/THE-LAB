import { describe, expect, test, afterEach } from '@jest/globals';
import {
  isLabPersonaDirectWorkflow,
  shouldUsePersonaDirectWorkflow,
} from '@/shared/config/lab-persona-direct-workflow';

describe('lab-persona-direct-workflow', () => {
  const prevDirect = process.env.LAB_PERSONA_DIRECT_WORKFLOW;

  afterEach(() => {
    if (prevDirect === undefined) delete process.env.LAB_PERSONA_DIRECT_WORKFLOW;
    else process.env.LAB_PERSONA_DIRECT_WORKFLOW = prevDirect;
  });

  test('shouldUsePersonaDirectWorkflow defaults to true', () => {
    delete process.env.LAB_PERSONA_DIRECT_WORKFLOW;
    expect(shouldUsePersonaDirectWorkflow()).toBe(true);
  });

  test('shouldUsePersonaDirectWorkflow false when explicitly disabled', () => {
    process.env.LAB_PERSONA_DIRECT_WORKFLOW = '0';
    expect(shouldUsePersonaDirectWorkflow()).toBe(false);
  });

  test('isLabPersonaDirectWorkflow when flag set', () => {
    process.env.LAB_PERSONA_DIRECT_WORKFLOW = '1';
    expect(isLabPersonaDirectWorkflow()).toBe(true);
  });
});
