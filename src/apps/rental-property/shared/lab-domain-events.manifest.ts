import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-rental-property`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-rental-property.rent.late",
    sourceAppId: "app-rental-property",
    label: "Rent late",
    description: "A rent payment for a completed period is still unpaid. Measured from the end of the payment period, not a due-date column.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "recordId",
        "label": "Payment ID",
        "valueKind": "id"
      },
      {
        "path": "leaseId",
        "label": "Lease ID",
        "valueKind": "id"
      },
      {
        "path": "amountCents",
        "label": "Amount (cents)",
        "valueKind": "number"
      },
      {
        "path": "periodMonth",
        "label": "Period (YYYY-MM)",
        "valueKind": "string"
      },
      {
        "path": "dueDate",
        "label": "Window date",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "app-rental-property.lease.expiring",
    sourceAppId: "app-rental-property",
    label: "Lease expiring",
    description: "An active lease ends within 30 days. Fires once on entering the window; `ended` and `pending` leases never fire.",
    publisherKind: "platform",
    payloadFields: [
      {
        "path": "recordId",
        "label": "Lease ID",
        "valueKind": "id"
      },
      {
        "path": "propertyId",
        "label": "Property ID",
        "valueKind": "id"
      },
      {
        "path": "tenantName",
        "label": "Tenant",
        "valueKind": "string"
      },
      {
        "path": "startDate",
        "label": "Start",
        "valueKind": "string"
      },
      {
        "path": "endDate",
        "label": "End",
        "valueKind": "string"
      }
    ],
  },
  {
    eventType: "app-rental-property.rent.due",
    sourceAppId: "app-rental-property",
    label: "Rent due",
    description: "Emitted when a rent payment transitions to `due` (`PATCH /api/rental/payments/:id/status`).",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "rentPaymentId",
        "label": "Rent payment ID",
        "valueKind": "id"
      },
      {
        "path": "leaseId",
        "label": "Lease ID",
        "valueKind": "id"
      },
      {
        "path": "propertyId",
        "label": "Property ID",
        "valueKind": "id"
      },
      {
        "path": "periodMonth",
        "label": "Period (YYYY-MM)",
        "valueKind": "string"
      },
      {
        "path": "amountCents",
        "label": "Amount (cents)",
        "valueKind": "number"
      }
    ],
  },
] as const;
