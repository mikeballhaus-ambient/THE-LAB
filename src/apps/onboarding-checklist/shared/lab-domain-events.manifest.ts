import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-onboarding-checklist`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-onboarding-checklist.task.overdue",
    sourceAppId: "app-onboarding-checklist",
    label: "Onboarding task overdue",
    description: "An open onboarding task is past its due date. Fires one day after the due date, once — tasks without a due date never fire.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "recordId",
        "label": "Task ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "owner",
        "label": "Owner",
        "valueKind": "userId"
      },
      {
        "path": "checklistId",
        "label": "Checklist ID",
        "valueKind": "id"
      },
      {
        "path": "status",
        "label": "Status",
        "valueKind": "string"
      },
      {
        "path": "dueDate",
        "label": "Due date",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "app-onboarding-checklist.onboarding.completed",
    sourceAppId: "app-onboarding-checklist",
    label: "Onboarding completed",
    description: "Emitted once when the last open task of a checklist is closed — inferred from the sibling set, not a route of its own.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "checklistId",
        "label": "Checklist ID",
        "valueKind": "id"
      },
      {
        "path": "newHire",
        "label": "New hire",
        "valueKind": "userId"
      },
      {
        "path": "role",
        "label": "Role",
        "valueKind": "string"
      },
      {
        "path": "startDate",
        "label": "Start date",
        "valueKind": "string"
      }
    ],
  },
] as const;
