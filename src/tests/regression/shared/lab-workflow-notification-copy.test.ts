import { describe, expect, test } from '@jest/globals';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import {
  renderWorkflowMessageTemplate,
  workflowCommsDmTextForEvent,
  workflowNotificationCopyForEvent,
} from '@/shared/utils/lab-workflow-notification-copy';

/**
 * Templated notification copy (W4.3).
 *
 * Before this, every notification carried fixed wording, so a workflow could only say "automation
 * ran for X". These tests pin the two properties that make templating safe: values are resolved
 * per item, and a missing value produces a gap rather than leaking template syntax into an inbox.
 */

function envelope(type: string, payload: Record<string, unknown>): LabDomainEventEnvelopeV1 {
  return {
    schemaVersion: 1,
    id: '11111111-1111-4111-8111-111111111111',
    type,
    sourceAppId: 'app-lab-tasklist',
    occurredAt: '2026-10-19T12:00:00.000Z',
    actorUserId: 1,
    payload,
  };
}

const TASK_CREATED = envelope('app-lab-tasklist.task.created', {
  taskId: 'task-7',
  title: 'Ship the thing',
  assigneeId: 42,
  nested: { reporter: 'Ada' },
});

describe('renderWorkflowMessageTemplate', () => {
  test('substitutes payload references', () => {
    expect(
      renderWorkflowMessageTemplate('New task: {{payload.title}}', { payload: TASK_CREATED.payload }),
    ).toBe('New task: Ship the thing');
  });

  test('accepts a bare path, because authors write the field name they see', () => {
    expect(renderWorkflowMessageTemplate('{{title}}', { payload: TASK_CREATED.payload })).toBe(
      'Ship the thing',
    );
  });

  test('resolves nested paths', () => {
    expect(
      renderWorkflowMessageTemplate('Reporter: {{payload.nested.reporter}}', {
        payload: TASK_CREATED.payload,
      }),
    ).toBe('Reporter: Ada');
  });

  test('an unresolved reference becomes an empty gap, never literal template syntax', () => {
    // A notification body reading "{{payload.missing}}" is a bug the user cannot act on, and the
    // run history would still report success.
    const rendered = renderWorkflowMessageTemplate('Assigned to {{payload.missing}} today', {
      payload: TASK_CREATED.payload,
    });
    expect(rendered).toBe('Assigned to  today');
    expect(rendered).not.toContain('{{');
  });

  test('the item wins over the envelope payload for the same path', () => {
    // This is what makes a batched or looped run render per row instead of repeating the first.
    expect(
      renderWorkflowMessageTemplate('{{payload.title}}', {
        payload: TASK_CREATED.payload,
        item: { title: 'Row two' },
      }),
    ).toBe('Row two');
  });

  test('numbers and booleans render without JSON quoting', () => {
    expect(
      renderWorkflowMessageTemplate('{{payload.assigneeId}}', { payload: TASK_CREATED.payload }),
    ).toBe('42');
  });

  test('an empty or absent template renders as empty', () => {
    expect(renderWorkflowMessageTemplate(undefined, { payload: {} })).toBe('');
    expect(renderWorkflowMessageTemplate('', { payload: {} })).toBe('');
  });
});

describe('workflowNotificationCopyForEvent', () => {
  test('keeps the built-in wording when no template is supplied', () => {
    const copy = workflowNotificationCopyForEvent(TASK_CREATED, 'Demo workflow');
    expect(copy.title).toBe('New task assigned to you');
    expect(copy.body).toContain('Ship the thing');
  });

  test('a body template renders payload values', () => {
    const copy = workflowNotificationCopyForEvent(TASK_CREATED, 'Demo workflow', {
      body: '"{{payload.title}}" is yours to finish.',
    });
    expect(copy.body).toBe('"Ship the thing" is yours to finish.');
    // An unsupplied field still uses the fallback rather than going blank.
    expect(copy.title).toBe('New task assigned to you');
  });

  test('a template that renders to whitespace falls back instead of blanking the message', () => {
    const copy = workflowNotificationCopyForEvent(TASK_CREATED, 'Demo workflow', {
      title: '   ',
      body: '{{payload.missing}}',
    });
    expect(copy.title).toBe('New task assigned to you');
    expect(copy.body).toContain('Ship the thing');
  });

  test('a bare {{payload.x}} body with no other text still counts as copy', () => {
    const copy = workflowNotificationCopyForEvent(TASK_CREATED, 'Demo workflow', {
      body: '{{payload.title}}',
    });
    expect(copy.body).toBe('Ship the thing');
  });
});

describe('workflowCommsDmTextForEvent', () => {
  test('renders the custom text against the item', () => {
    expect(
      workflowCommsDmTextForEvent(TASK_CREATED, 'Heads up: {{payload.title}}', {
        title: 'Row two',
      }),
    ).toBe('Heads up: Row two');
  });

  test('falls back to the event default when there is no text', () => {
    expect(workflowCommsDmTextForEvent(TASK_CREATED)).toContain('Ship the thing');
  });
});
