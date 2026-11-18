import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-home-maintenance`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-home-maintenance.maintenance.due",
    sourceAppId: "app-home-maintenance",
    label: "Maintenance due",
    description: "A maintenance task reached its due date. Fires once when the date arrives; `done` and `skipped` tasks never fire.",
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
        "path": "priority",
        "label": "Priority",
        "valueKind": "string"
      },
      {
        "path": "assetId",
        "label": "Asset ID",
        "valueKind": "id"
      },
      {
        "path": "dueDate",
        "label": "Due date",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "app-home-maintenance.maintenance.overdue",
    sourceAppId: "app-home-maintenance",
    label: "Maintenance overdue",
    description: "A maintenance task is past its due date. Fires one day after the date, once — not on every tick.",
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
        "path": "priority",
        "label": "Priority",
        "valueKind": "string"
      },
      {
        "path": "assetId",
        "label": "Asset ID",
        "valueKind": "id"
      },
      {
        "path": "dueDate",
        "label": "Due date",
        "valueKind": "string"
      }
    ],
  },
] as const;
