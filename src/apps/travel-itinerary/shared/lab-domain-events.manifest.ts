import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-travel-itinerary`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-travel-itinerary.trip.scheduled",
    sourceAppId: "app-travel-itinerary",
    label: "Trip scheduled",
    description: "Emitted when a trip gains both a start and an end date.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "tripId",
        "label": "Trip ID",
        "valueKind": "id"
      },
      {
        "path": "name",
        "label": "Name",
        "valueKind": "string"
      },
      {
        "path": "destination",
        "label": "Destination",
        "valueKind": "string"
      },
      {
        "path": "startDate",
        "label": "Start date",
        "valueKind": "string"
      },
      {
        "path": "endDate",
        "label": "End date",
        "valueKind": "string"
      }
    ],
  },
] as const;
