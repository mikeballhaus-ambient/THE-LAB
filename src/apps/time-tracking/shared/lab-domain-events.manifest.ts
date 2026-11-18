import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-time-tracking`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-time-tracking.timesheet.submitted",
    sourceAppId: "app-time-tracking",
    label: "Timesheet submitted",
    description: "Emitted when a week’s draft time entries are submitted. Weekly grouping by `weekKey`.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "userId",
        "label": "Team member",
        "valueKind": "userId"
      },
      {
        "path": "weekKey",
        "label": "Week key",
        "valueKind": "string"
      },
      {
        "path": "entryCount",
        "label": "Entry count",
        "valueKind": "number"
      },
      {
        "path": "totalMinutes",
        "label": "Total minutes",
        "valueKind": "number"
      }
    ],
  },
] as const;
