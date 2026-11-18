export type EntityPropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'lookup'
  | 'labUser'
  | 'array';

export interface EntityProperty {
  name: string;
  type: EntityPropertyType;
  label: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  lookupEntityKey?: string;
  lookupLabelProperty?: string;
  validation?: Record<string, unknown>;
}

export interface EntityDefinition {
  id: number;
  entityKey: string;
  name: string;
  description?: string;
  /** PrimeIcons class suffix, e.g. `pi-users` (shown in CRM navigation and admin). */
  icon?: string;
  sortOrder: number;
  properties: EntityProperty[];
  /** When this entity is a lookup target, which property value to show (optional). */
  lookupDisplayProperty?: string;
  /** Template for lookup labels, e.g. `{{ firstName }} {{ lastName }}` (overrides single property when set). */
  lookupDisplayFormat?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EntityRecord {
  id: number;
  entityDefinitionId: number;
  entityKey?: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** CRM entity → Forms Builder form key (create/edit/view). */
export type FormBindingPurpose = 'create' | 'edit' | 'view';

export interface EntityFormBinding {
  id: number;
  entityDefinitionId: number;
  entityKey?: string;
  purpose: FormBindingPurpose;
  formKey: string;
  isDefault: boolean;
}

/** Flat connector record: id + data fields */
export type ConnectorEntityRecord = Record<string, unknown> & { id: number };

/** Resolved display strings for lookup fields: field name → record id → label */
export type LookupLabelsByField = Record<string, Record<number, string>>;
