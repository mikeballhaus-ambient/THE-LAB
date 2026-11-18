import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-event-rsvp`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-event-rsvp.rsvp-response.received",
    sourceAppId: "app-event-rsvp",
    label: "RSVP response received",
    description: "Emitted when a guest submits an RSVP response.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "rsvpResponseId",
        "label": "RSVP ID",
        "valueKind": "id"
      },
      {
        "path": "eventId",
        "label": "Event ID",
        "valueKind": "id"
      },
      {
        "path": "guestName",
        "label": "Guest",
        "valueKind": "userId"
      },
      {
        "path": "response",
        "label": "Response",
        "valueKind": "string"
      },
      {
        "path": "headcount",
        "label": "Headcount",
        "valueKind": "number"
      }
    ],
  },
] as const;
