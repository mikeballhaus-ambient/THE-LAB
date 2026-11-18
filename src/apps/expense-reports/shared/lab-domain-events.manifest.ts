import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/**
 * Domain event catalog registrations for `app-expense-reports`.
 *
 * @see docs/platform/lab-domain-events.md
 */
export const LAB_DOMAIN_EVENTS_MANIFEST: readonly LabDomainEventCatalogEntry[] = [
  {
    eventType: "app-expense-reports.expense.approved",
    sourceAppId: "app-expense-reports",
    label: "Expense approved",
    description: "Emitted when an expense status transitions to `approved`. Intended trigger for ledger posting.",
    publisherKind: "catalog-app",
    payloadFields: [
      {
        "path": "expenseId",
        "label": "Expense ID",
        "valueKind": "id"
      },
      {
        "path": "title",
        "label": "Title",
        "valueKind": "string"
      },
      {
        "path": "submitter",
        "label": "Submitter",
        "valueKind": "userId"
      },
      {
        "path": "amountCents",
        "label": "Amount (cents)",
        "valueKind": "number"
      },
      {
        "path": "currency",
        "label": "Currency",
        "valueKind": "string"
      },
      {
        "path": "category",
        "label": "Category",
        "valueKind": "string"
      }
    ],
  },
] as const;
