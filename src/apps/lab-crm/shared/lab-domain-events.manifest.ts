import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-lab-crm`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-lab-crm.sales.approval_submitted",
    sourceAppId: "app-lab-crm",
    label: "Sales approval submitted",
    description: "User submitted an approval request from a sales record. Workflow Studio raises the request with the configured sales policy.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "entityKey",
        "label": "Entity key",
        "valueKind": "string"
      },
      {
        "path": "recordId",
        "label": "Record ID",
        "valueKind": "id"
      },
      {
        "path": "recordLabel",
        "label": "Record label",
        "valueKind": "string"
      },
      {
        "path": "title",
        "label": "Request title",
        "valueKind": "string"
      },
      {
        "path": "comment",
        "label": "Comments",
        "valueKind": "string"
      },
      {
        "path": "stage",
        "label": "Pipeline stage",
        "valueKind": "string"
      },
      {
        "path": "subjectAppId",
        "label": "Subject app",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityType",
        "label": "Subject entity type",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityId",
        "label": "Subject entity ID",
        "valueKind": "id"
      }
    ],
  },
  {
    eventType: "app-lab-crm.quotes.approval_submitted",
    sourceAppId: "app-lab-crm",
    label: "Quote approval submitted",
    description: "User submitted an approval request from a quote record. Workflow Studio raises the request with the configured quote policy.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "entityKey",
        "label": "Entity key",
        "valueKind": "string"
      },
      {
        "path": "recordId",
        "label": "Record ID",
        "valueKind": "id"
      },
      {
        "path": "recordLabel",
        "label": "Record label",
        "valueKind": "string"
      },
      {
        "path": "title",
        "label": "Request title",
        "valueKind": "string"
      },
      {
        "path": "comment",
        "label": "Comments",
        "valueKind": "string"
      },
      {
        "path": "subjectAppId",
        "label": "Subject app",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityType",
        "label": "Subject entity type",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityId",
        "label": "Subject entity ID",
        "valueKind": "id"
      }
    ],
  },
  {
    eventType: "app-lab-crm.sales.ledger_post_requested",
    sourceAppId: "app-lab-crm",
    label: "Sales ledger post requested",
    description: "User requested a journal entry from a CRM sales record. Workflow Studio posts using configured demo accounts.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "entityKey",
        "label": "Entity key",
        "valueKind": "string"
      },
      {
        "path": "recordId",
        "label": "Record ID",
        "valueKind": "id"
      },
      {
        "path": "recordLabel",
        "label": "Record label",
        "valueKind": "string"
      },
      {
        "path": "memo",
        "label": "Memo",
        "valueKind": "string"
      },
      {
        "path": "amountCents",
        "label": "Amount (cents)",
        "valueKind": "number"
      },
      {
        "path": "subjectAppId",
        "label": "Subject app",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityType",
        "label": "Subject entity type",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityId",
        "label": "Subject entity ID",
        "valueKind": "id"
      }
    ],
  },
  {
    eventType: "app-lab-crm.quotes.ledger_post_requested",
    sourceAppId: "app-lab-crm",
    label: "Quote ledger post requested",
    description: "User requested a journal entry from a CRM quote record. Workflow Studio posts using configured demo accounts.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "entityKey",
        "label": "Entity key",
        "valueKind": "string"
      },
      {
        "path": "recordId",
        "label": "Record ID",
        "valueKind": "id"
      },
      {
        "path": "recordLabel",
        "label": "Record label",
        "valueKind": "string"
      },
      {
        "path": "memo",
        "label": "Memo",
        "valueKind": "string"
      },
      {
        "path": "amountCents",
        "label": "Amount (cents)",
        "valueKind": "number"
      },
      {
        "path": "subjectAppId",
        "label": "Subject app",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityType",
        "label": "Subject entity type",
        "valueKind": "string"
      },
      {
        "path": "subjectEntityId",
        "label": "Subject entity ID",
        "valueKind": "id"
      }
    ],
  },
] as const;
