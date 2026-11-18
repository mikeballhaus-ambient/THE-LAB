// ============================================================================
// Form Submission Type Definitions
// ============================================================================

import { DataConnector } from './connector-types'
import { FormSchema } from './form-types'


export interface FormSubmissionBase {
  is_active?: boolean,
  formKey?: string 
  data_connector_id?: number;
  status?: string;
}

/**
 * Base interface for form submission with optional joined columns
 */
export interface FormSubmission extends FormSubmissionBase {
  id?: number;
  form?: FormSchema;
  dataConnector?: DataConnector;
  data: Record<string, unknown> | string;
  created_at?: string;
  updated_at?: string;
}

export interface FormSubmissionSchemaOptions extends FormSubmissionBase {
  limit?: number,
  offset?: number
}

/**
 * Database return type with all joined columns (snake_case)
 */
export interface FormSubmissionDBReturn extends FormSubmissionSchemaOptions {
  total: number,
  formSubmissions: FormSubmission[]
}