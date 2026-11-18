import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-lab-tasklist`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-lab-tasklist.task.created",
    sourceAppId: "app-lab-tasklist",
    label: "Task created",
    description: "Emitted when a new task is saved in Task List.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "taskId",
        "label": "Task ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "assigneeId",
        "label": "Assignee",
        "valueKind": "userId"
      },
      {
        "path": "priority",
        "label": "Priority",
        "valueKind": "string",
        "allowedValues": [
          "low",
          "medium",
          "high",
          "urgent"
        ]
      }
    ],
  },
  {
    eventType: "app-lab-tasklist.task.completed",
    sourceAppId: "app-lab-tasklist",
    label: "Task completed",
    description: "Emitted when a task status transitions to `completed`.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "taskId",
        "label": "Task ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "assigneeId",
        "label": "Assignee",
        "valueKind": "userId"
      }
    ],
  },
] as const;
