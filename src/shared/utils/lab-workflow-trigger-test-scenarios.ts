import type { LabDomainEventCatalogEntry, LabDomainEventPayloadFieldDescriptor } from '@/shared/types/lab-domain-event-catalog';
import type { LabDomainEventPublishInput } from '@/shared/types/schemas/lab-domain-event-schema';
import { DEMO_CAST_WITH_ADMIN } from '@/shared/config/demo-data-cast';
export interface LabWorkflowTriggerTestScenario {
  id: string;
  /** Short label in the Test & run picker. */
  name: string;
  /** Plain-language explanation for business users. */
  lead: string;
  buildEnvelope: () => LabDomainEventPublishInput;
}

function freshEnvelope(
  eventType: string,
  sourceAppId: string,
  payload: Record<string, unknown>,
): LabDomainEventPublishInput {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    type: eventType,
    sourceAppId,
    occurredAt: new Date().toISOString(),
    payload,
  };
}

function sampleValueForField(field: LabDomainEventPayloadFieldDescriptor): unknown {
  if (field.allowedValues?.length) {
    return field.allowedValues[0];
  }
  switch (field.valueKind) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'userId':
      return 3;
    case 'id':
      return `demo-${field.path}`;
    default:
      return `Example ${field.label}`;
  }
}

export function buildWorkflowTriggerExampleEnvelope(
  eventType: string,
  sourceAppId: string,
  catalogEntry: LabDomainEventCatalogEntry | undefined,
  payloadOverrides: Record<string, unknown> = {},
): LabDomainEventPublishInput {
  const payload: Record<string, unknown> = {};
  for (const field of catalogEntry?.payloadFields ?? []) {
    payload[field.path] = sampleValueForField(field);
  }
  return freshEnvelope(eventType, sourceAppId, { ...payload, ...payloadOverrides });
}

const TASK_CREATED = 'app-lab-tasklist.task.created';
const TASK_SOURCE = 'app-lab-tasklist';

const TASK_CREATED_SCENARIOS: LabWorkflowTriggerTestScenario[] = [
  {
    id: 'task-no-assignee',
    name: 'Task with no assignee',
    lead:
      'Simulates a new task that nobody owns yet. The demo task workflow should notify the lab owner.',
    buildEnvelope: () =>
      freshEnvelope(TASK_CREATED, TASK_SOURCE, {
        taskId: 'sample-task-1001',
        title: 'Sample — unassigned task',
      }),
  },
  {
    id: 'task-assigned',
    name: 'Assigned task',
    lead:
      'A task assigned to Mia Chen. Matches what Task List publishes today (assigneeId on create).',
    buildEnvelope: () =>
      freshEnvelope(TASK_CREATED, TASK_SOURCE, {
        taskId: 'sample-task-1002',
        title: 'Sample — assigned task',
        assigneeId: 3,
      }),
  },
];

const EXPENSE_APPROVED = 'app-expense-reports.expense.approved';
const EXPENSE_SOURCE = 'app-expense-reports';

const EXPENSE_APPROVED_SCENARIOS: LabWorkflowTriggerTestScenario[] = [
  {
    id: 'expense-travel-approved',
    name: 'Approved travel expense',
    lead:
      'Northwind travel line (demo seed). The expense demo workflow should pass lookup + Travel rule and preview a ledger post.',
    buildEnvelope: () =>
      freshEnvelope(EXPENSE_APPROVED, EXPENSE_SOURCE, {
        expenseId: 1,
        title: 'Northwind Labs onsite — flights',
        submitter: 'Mia Chen',
        amountCents: 142_500,
        currency: 'USD',
        category: 'Travel',
        status: 'approved',
      }),
  },
  {
    id: 'expense-learning-approved',
    name: 'Approved non-travel expense',
    lead:
      'Approved learning expense. Lookup passes but the Travel rule should not match — owner notify only.',
    buildEnvelope: () =>
      freshEnvelope(EXPENSE_APPROVED, EXPENSE_SOURCE, {
        expenseId: 6,
        title: 'Connector contract review — reference book',
        submitter: 'Sam Patel',
        amountCents: 5_999,
        currency: 'USD',
        category: 'Learning',
        status: 'approved',
      }),
  },
];

const SCENARIOS_BY_EVENT_TYPE: Record<string, LabWorkflowTriggerTestScenario[]> = {
  [TASK_CREATED]: TASK_CREATED_SCENARIOS,
  [EXPENSE_APPROVED]: EXPENSE_APPROVED_SCENARIOS,
};

function genericScenarioForEntry(entry: LabDomainEventCatalogEntry): LabWorkflowTriggerTestScenario {
  return {
    id: 'typical-example',
    name: `Typical ${entry.label}`,
    lead: `A ready-made example for “${entry.label}” with typical field values for this event.`,
    buildEnvelope: () => buildWorkflowTriggerExampleEnvelope(entry.eventType, entry.sourceAppId, entry),
  };
}

export function listWorkflowTriggerTestScenarios(
  eventType: string,
  catalogEntries: LabDomainEventCatalogEntry[],
): LabWorkflowTriggerTestScenario[] {
  const trimmed = eventType.trim();
  if (!trimmed) {
    return [];
  }
  const specific = SCENARIOS_BY_EVENT_TYPE[trimmed];
  if (specific?.length) {
    return specific;
  }
  const entry = catalogEntries.find((row) => row.eventType === trimmed);
  if (!entry?.payloadFields?.length) {
    return [];
  }
  return [genericScenarioForEntry(entry)];
}

export type WorkflowTriggerPayloadSummaryEntry = {
  label: string;
  value: string;
};

/** Key → value rows for the run-panel sample preview (no JSON). */
export function workflowTriggerPayloadSummaryEntries(
  envelope: LabDomainEventPublishInput,
  catalogEntries: LabDomainEventCatalogEntry[],
): WorkflowTriggerPayloadSummaryEntry[] {
  const entry = catalogEntries.find((row) => row.eventType === envelope.type);
  const rows: WorkflowTriggerPayloadSummaryEntry[] = [];
  const payload = envelope.payload ?? {};
  for (const [key, raw] of Object.entries(payload)) {
    const field = entry?.payloadFields.find((f) => f.path === key);
    const label = field?.label ?? key;
    let valueText: string;
    if (raw === null || raw === undefined || raw === '') {
      valueText = '(empty)';
    } else if (field?.valueKind === 'userId') {
      const member = DEMO_CAST_WITH_ADMIN.find((row) => row.id === Number(raw));
      valueText = member ? `${member.name} (user ${member.id})` : String(raw);
    } else {
      valueText = String(raw);
    }
    rows.push({ label, value: valueText });
  }
  return rows;
}

/** Human-readable lines for the payload (no JSON). */
export function summarizeWorkflowTriggerPayload(
  envelope: LabDomainEventPublishInput,
  catalogEntries: LabDomainEventCatalogEntry[],
): string[] {
  const entries = workflowTriggerPayloadSummaryEntries(envelope, catalogEntries);
  if (entries.length === 0) {
    return ['No payload fields in this sample.'];
  }
  return entries.map((row) => `${row.label}: ${row.value}`);
}
