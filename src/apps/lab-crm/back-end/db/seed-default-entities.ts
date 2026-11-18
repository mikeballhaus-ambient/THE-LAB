import type { EntityProperty } from '../../shared/types/entity.types';

export interface DefaultEntitySeed {
  entityKey: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  /** Default lookup label when this entity is referenced (system seeds). */
  lookupDisplayProperty?: string;
  /** Template for lookup labels, e.g. `{{ firstName }} {{ lastName }}`. */
  lookupDisplayFormat?: string;
  properties: EntityProperty[];
}

export const DEFAULT_ENTITY_SEEDS: DefaultEntitySeed[] = [
  {
    entityKey: 'accounts',
    name: 'Accounts',
    description: 'Companies and organizations',
    icon: 'pi-building',
    sortOrder: 0,
    lookupDisplayProperty: 'name',
    properties: [
      { name: 'name', type: 'string', label: 'Account name', required: true },
      { name: 'domain', type: 'string', label: 'Domain' },
      { name: 'industry', type: 'string', label: 'Industry' },
      { name: 'phone', type: 'string', label: 'Phone' },
      { name: 'website', type: 'string', label: 'Website' },
      {
        name: 'status',
        type: 'enum',
        label: 'Status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'prospect', label: 'Prospect' },
          { value: 'churned', label: 'Churned' },
        ],
      },
      { name: 'notes', type: 'string', label: 'Notes' },
      { name: 'ownerId', type: 'labUser', label: 'Account owner' },
    ],
  },
  {
    entityKey: 'contacts',
    name: 'Contacts',
    description: 'People and organizations',
    icon: 'pi-users',
    sortOrder: 1,
    lookupDisplayFormat: '{{ firstName }} {{ lastName }}',
    properties: [
      { name: 'firstName', type: 'string', label: 'First name', required: true },
      { name: 'lastName', type: 'string', label: 'Last name', required: true },
      { name: 'email', type: 'string', label: 'Email' },
      { name: 'phone', type: 'string', label: 'Phone' },
      { name: 'company', type: 'string', label: 'Company' },
      {
        name: 'companyId',
        type: 'lookup',
        label: 'Account',
        lookupEntityKey: 'accounts',
      },
      { name: 'title', type: 'string', label: 'Title' },
      {
        name: 'status',
        type: 'enum',
        label: 'Status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
      { name: 'source', type: 'string', label: 'Source' },
      { name: 'notes', type: 'string', label: 'Notes' },
      { name: 'accountOwnerId', type: 'labUser', label: 'Account owner' },
    ],
  },
  {
    entityKey: 'leads',
    name: 'Leads',
    description: 'Sales prospects',
    icon: 'pi-filter',
    sortOrder: 2,
    lookupDisplayProperty: 'title',
    properties: [
      { name: 'title', type: 'string', label: 'Title', required: true },
      {
        name: 'contactId',
        type: 'lookup',
        label: 'Contact',
        required: true,
        lookupEntityKey: 'contacts',
      },
      {
        name: 'status',
        type: 'enum',
        label: 'Status',
        options: [
          { value: 'new', label: 'New' },
          { value: 'working', label: 'Working' },
          { value: 'qualified', label: 'Qualified' },
          { value: 'disqualified', label: 'Disqualified' },
          { value: 'converted', label: 'Converted' },
        ],
      },
      { name: 'source', type: 'string', label: 'Source' },
      { name: 'score', type: 'number', label: 'Score' },
      { name: 'estimatedValue', type: 'number', label: 'Estimated value' },
      { name: 'notes', type: 'string', label: 'Notes' },
    ],
  },
  {
    entityKey: 'sales',
    name: 'Sales',
    description: 'Opportunities and deals',
    icon: 'pi-dollar',
    sortOrder: 3,
    lookupDisplayProperty: 'name',
    properties: [
      { name: 'name', type: 'string', label: 'Name', required: true },
      {
        name: 'contactId',
        type: 'lookup',
        label: 'Contact',
        required: true,
        lookupEntityKey: 'contacts',
      },
      {
        name: 'leadId',
        type: 'lookup',
        label: 'Lead',
        lookupEntityKey: 'leads',
      },
      {
        name: 'stage',
        type: 'enum',
        label: 'Stage',
        options: [
          { value: 'prospecting', label: 'Prospecting' },
          { value: 'qualification', label: 'Qualification' },
          { value: 'proposal', label: 'Proposal' },
          { value: 'negotiation', label: 'Negotiation' },
          { value: 'closed-won', label: 'Closed won' },
          { value: 'closed-lost', label: 'Closed lost' },
        ],
      },
      { name: 'amount', type: 'number', label: 'Amount' },
      { name: 'expectedCloseDate', type: 'date', label: 'Expected close date' },
      {
        name: 'productId',
        type: 'lookup',
        label: 'Product',
        lookupEntityKey: 'products',
      },
      { name: 'quantity', type: 'number', label: 'Quantity' },
      { name: 'notes', type: 'string', label: 'Notes' },
      { name: 'ownerId', type: 'labUser', label: 'Deal owner' },
      {
        name: 'approvalStatus',
        type: 'enum',
        label: 'Approval status',
        options: [
          { value: 'pending', label: 'Pending approval' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ],
      },
    ],
  },
  {
    entityKey: 'service',
    name: 'Service',
    description: 'Support cases',
    icon: 'pi-wrench',
    sortOrder: 4,
    lookupDisplayProperty: 'subject',
    properties: [
      { name: 'subject', type: 'string', label: 'Subject', required: true },
      { name: 'description', type: 'string', label: 'Description' },
      {
        name: 'contactId',
        type: 'lookup',
        label: 'Contact',
        required: true,
        lookupEntityKey: 'contacts',
      },
      {
        name: 'saleId',
        type: 'lookup',
        label: 'Sale',
        lookupEntityKey: 'sales',
      },
      {
        name: 'status',
        type: 'enum',
        label: 'Status',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'in-progress', label: 'In progress' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'closed', label: 'Closed' },
        ],
      },
      {
        name: 'priority',
        type: 'enum',
        label: 'Priority',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' },
        ],
      },
      { name: 'category', type: 'string', label: 'Category' },
      { name: 'assignedTo', type: 'labUser', label: 'Assigned to' },
    ],
  },
  {
    entityKey: 'products',
    name: 'Products',
    description: 'Product catalog',
    icon: 'pi-box',
    sortOrder: 5,
    lookupDisplayProperty: 'name',
    properties: [
      { name: 'sku', type: 'string', label: 'SKU', required: true },
      { name: 'name', type: 'string', label: 'Name', required: true },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'unitPrice', type: 'number', label: 'Unit price' },
      { name: 'category', type: 'string', label: 'Category' },
      { name: 'isActive', type: 'boolean', label: 'Active' },
    ],
  },
  {
    entityKey: 'inventory',
    name: 'Inventory',
    description: 'Stock levels',
    icon: 'pi-database',
    sortOrder: 6,
    lookupDisplayProperty: 'location',
    properties: [
      {
        name: 'productId',
        type: 'lookup',
        label: 'Product',
        required: true,
        lookupEntityKey: 'products',
      },
      { name: 'quantityOnHand', type: 'number', label: 'Quantity on hand' },
      { name: 'reorderLevel', type: 'number', label: 'Reorder level' },
      { name: 'location', type: 'string', label: 'Location' },
      { name: 'lastCountedAt', type: 'date', label: 'Last counted' },
    ],
  },
  {
    entityKey: 'quotes',
    name: 'Quotes',
    description: 'Pre-sale quotes linked to contacts and products',
    icon: 'pi-file-edit',
    sortOrder: 7,
    lookupDisplayProperty: 'title',
    properties: [
      { name: 'title', type: 'string', label: 'Quote title', required: true },
      {
        name: 'contactId',
        type: 'lookup',
        label: 'Contact',
        required: true,
        lookupEntityKey: 'contacts',
      },
      {
        name: 'leadId',
        type: 'lookup',
        label: 'Source lead',
        lookupEntityKey: 'leads',
      },
      {
        name: 'productId',
        type: 'lookup',
        label: 'Primary product',
        lookupEntityKey: 'products',
      },
      {
        name: 'status',
        type: 'enum',
        label: 'Status',
        required: true,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'accepted', label: 'Accepted' },
          { value: 'rejected', label: 'Rejected' },
        ],
      },
      { name: 'amount', type: 'number', label: 'Amount' },
      { name: 'validUntil', type: 'date', label: 'Valid until' },
      { name: 'notes', type: 'string', label: 'Notes' },
      {
        name: 'approvalStatus',
        type: 'enum',
        label: 'Approval status',
        options: [
          { value: 'pending', label: 'Pending approval' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ],
      },
    ],
  },
  {
    entityKey: 'tasks',
    name: 'Tasks',
    description: 'CRM tasks (Task List backend; use Tasks nav, not entity list)',
    icon: 'pi-check-square',
    sortOrder: 99,
    properties: [
      { name: 'title', type: 'string', label: 'Title', required: true },
      { name: 'description', type: 'string', label: 'Description' },
    ],
  },
  {
    entityKey: 'tickets',
    name: 'Tickets',
    description: 'Help Desk tickets (bindings only; not shown in CRM entity nav)',
    icon: 'pi-ticket',
    sortOrder: 100,
    properties: [
      { name: 'subject', type: 'string', label: 'Subject', required: true },
      { name: 'description', type: 'string', label: 'Description' },
    ],
  },
];
