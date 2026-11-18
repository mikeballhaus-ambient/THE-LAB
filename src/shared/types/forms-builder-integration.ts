/**
 * FormsBuilderContract Interface
 * Defines the contract for data connectors to expose to the Forms Builder
 */
export type FormsBuilderCapability = 'CRUD' | 'Lookups' | 'Search' | 'Batch';

export interface FormsBuilderContract {
  appName: string;
  entityName: string;
  entityModel: FormBuilderContractModel;
  endpoints: FormBuilderContractEndpoints;
  /** Declared connector capabilities; omitted values are inferred from endpoints on register/verify */
  capabilities?: FormsBuilderCapability[];
}

export interface FormBuilderContractModel {
  id: 'string' | 'number';
  name: string;
  description: string;
  status: 'active' | 'inactive';
  properties: FormBuilderContractModelProperty[];
}

export interface FormBuilderContractEndpoints {
  baseUrl: string,
  crud: {
    getAll: FormBuilderContractActionItemWithOptions;
    get: FormBuilderContractActionItem;
    create: FormBuilderContractActionItem;
    update: FormBuilderContractActionItem;
    delete: FormBuilderContractActionItem;
  };
  lookups: LookupContract[];
}

/**
 * How a property's options are resolved.
 *
 * - `enum` — inline `options` list (status, priority, stage).
 * - `lab-user` — active THE-LAB users via `/api/platform/users/lookup`.
 * - `provider-entity` — another app's entity via its connector lookups
 *   (`lookupProvider` names the provider app, `lookupEntityKey` the segment).
 * - `self-entity` — a record in this same app (parent/child links).
 */
export type IntegrationLookupProvider =
  | 'enum'
  | 'lab-user'
  | 'provider-entity'
  | 'self-entity';

export interface FormBuilderContractModelProperty {
  name: string,
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array',
  label?: string,
  /**
   * Omit from connector autopopulate UI (e.g. id, metadata, context-injected keys like taskListId).
   * Host integration context still supplies hidden values at submit time.
   */
  hidden?: boolean,
  /** When true, autopopulate sets required + validation on visible form fields. */
  required?: boolean,
  /**
   * For `type: 'date'`, use calendar-only DatePicker (no time). Default integration date fields include time.
   */
  dateOnly?: boolean,
  /**
   * Forms runtime control type (FormField registry), e.g. `LabApprovalPolicySteps`.
   * When set, overrides inferred InputText/Textarea mapping.
   */
  controlType?: string,
  /**
   * Set when this property references records elsewhere, so discovery can emit a
   * `LookupContract` for it. Without this, a `string` field renders as free text.
   */
  lookupProvider?: IntegrationLookupProvider,
  /** Inline choices for `lookupProvider: 'enum'`. */
  options?: Array<{ value: string; label: string }>,
  /** Provider app registry id for `lookupProvider: 'provider-entity'` (e.g. `app-lab-crm`). */
  lookupProviderAppId?: string,
  /** Connector entity segment on the provider for `provider-entity` / `self-entity`. */
  lookupEntityKey?: string,
  /** Property on the target record used as the option label (defaults to the target's display format). */
  lookupLabelProperty?: string,
  /**
   * Number field storage/display: `usd-cents` shows dollars (2 dp) in the form while the connector stores integer cents.
   */
  numberScale?: 'usd-cents',
  /**
   * Workflow designer: pre-wire this field from the trigger payload and explain it in plain language
   * instead of showing a confusing mapper row.
   */
  workflowDesignerBinding?: {
    summary: string;
    /** Event payload path without the `payload.` prefix */
    defaultPayloadPath: string;
    hideFromMapper?: boolean;
  };
}

export interface FormBuilderContractActionItem {
  url: string,
  type: 'GET' | 'POST' | 'DELETE',
  data?: unknown
}

export interface FormBuilderContractActionItemWithOptions extends FormBuilderContractActionItem {
  filter?: string,
  limit?: number,
  offset?: number
}

export interface LookupContract {
  forProperty: string;
  endpoint: {
    url: string;
    type: 'GET' | 'POST';
    data: Record<string, unknown>;
    response: Array<{ id: string | number; value: unknown; label?: string }>;
  };
}
