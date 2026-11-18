/**
 * Form Service - Handles form CRUD operations and business logic
 */

import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import type {
  FormSchema,
  FormSchemaOptions,
  FormSchemaDBReturn,
  FormsBuilderContract
} from '@/apps/lab-formsbuilder/shared/types';
import { FormsRepository } from '../../db/repositories';


export class FormService {
  private dbProxy: AppDatabaseServiceProxy;
  private formsRepository!: FormsRepository

  constructor() {
    this.dbProxy = AppDatabaseServiceProxy.getInstance();
    this.formsRepository = this.dbProxy.getFormsRepository()
  }

  /**
   * Get all forms with optional filtering and pagination.
   */
  async getAllForms(options?: FormSchemaOptions): Promise<FormSchemaDBReturn> {
    return await this.formsRepository.findAll(options)
  }

  /**
   * Get form by key.
   */
  async getFormByKey(key: string): Promise<FormSchema | null> {
    return await this.formsRepository.findByKey(key)
  }

  async getFormById(id: number): Promise<FormSchema | null> {
    return await this.formsRepository.findById(id)
  }

  /**
   * Create a new form.
   */
  async createForm(data: Partial<FormSchema>): Promise<FormSchema | null> {
    return await this.formsRepository.create(data as Omit<FormSchema, 'id' | 'created_at' | 'updated_at'>)
  }

  /**
   * Update an existing form by numeric id.
   */
  async updateForm(id: number, data: Partial<FormSchema>): Promise<FormSchema | null> {
    return await this.formsRepository.update(id, data)
  }

  /**
   * Update an existing form by form key (HTTP boundary).
   */
  async updateFormByKey(formKey: string, data: Partial<FormSchema>): Promise<FormSchema | null> {
    const existing = await this.formsRepository.findByKey(formKey);
    if (!existing?.id) {
      return null;
    }
    return await this.formsRepository.update(existing.id, data);
  }

  /**
   * Delete a form by numeric id.
   */
  async deleteForm(id: number): Promise<boolean> {
    const existing = await this.formsRepository.findById(id);
    if (!existing) {
      return false;
    }
    const key = existing.formKey != null ? String(existing.formKey) : '';
    if (key) {
      await this.dbProxy.getSubmissionsRepository().deleteByFormKey(key);
    }
    return await this.formsRepository.delete(id);
  }

  /**
   * Delete a form by form key (HTTP boundary).
   */
  async deleteFormByKey(formKey: string): Promise<boolean> {
    const existing = await this.formsRepository.findByKey(formKey);
    if (!existing) {
      return false;
    }
    await this.dbProxy.getSubmissionsRepository().deleteByFormKey(formKey);
    return await this.formsRepository.deleteByKey(formKey);
  }

  /**
   * Refresh form model from connected data connector.
   */
  async refreshFormModel(key: string): Promise<FormSchema | null> {
    // Get form by key
    const form = await this.formsRepository.findByKey(key)
    if (!form || !form.id) {
      return null;
    }

    if (!form.dataConnecter) {
      return null
    }


    // Fetch contract from connector discovery endpoint
    let contract: FormsBuilderContract | null = null;
    try {
      const axiosModule = await import('axios');
      const response = await axiosModule.default.get<FormsBuilderContract>(form.dataConnecter.discoveryUrl, {
        timeout: 10000,
        validateStatus: () => true, // Accept any status code
      });

      if (response.data && typeof response.data === 'object') {
        contract = response.data;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to fetch discovery endpoint for connector ${form.dataConnecter.id}:`, message);
    }

    // If we got a contract, update the form
    if (contract) {
      form.model = contract.entityModel

      await this.formsRepository.update(form.id, { model: contract.entityModel})

      return form;
    }

    return null;
  }
}