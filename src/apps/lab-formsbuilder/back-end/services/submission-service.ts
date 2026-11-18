/**
 * Submission Service - Handles form submission CRUD operations and business logic
 */

import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import type { FormSubmission, FormSubmissionSchemaOptions, FormSubmissionDBReturn } from '@/apps/lab-formsbuilder/shared/types';
import { SubmissionsRepository } from '../../db/repositories';

export class SubmissionService {
  private dbProxy: AppDatabaseServiceProxy;
  private submissionsRepository!: SubmissionsRepository

  constructor() {
    this.dbProxy = AppDatabaseServiceProxy.getInstance();
    this.submissionsRepository = this.dbProxy.getSubmissionsRepository()
  }

  /**
   * Get all form submissions with optional filtering and pagination.
   */
  async getAllSubmissions(options?: FormSubmissionSchemaOptions): Promise<FormSubmissionDBReturn> {
    return await this.submissionsRepository.findAll(options)
  }

  /**
   * Get form submission by ID.
   */
  async getSubmissionById(id: number): Promise<FormSubmission | null> {
    const result = await this.submissionsRepository.findById(id);
    return result || null;
  }

  /**
   * Get form submission by form_key and data_connector_id.
   */
  async getSubmissionByFormKeyAndConnector(formKey: string, dataConnectorId: number): Promise<FormSubmission | null> {
    const result = await this.submissionsRepository.findByFormKeyAndConnector(formKey, dataConnectorId);
    return result || null;
  }

  /**
   * Create a new form submission.
   */
  async createSubmission(data: FormSubmission): Promise<FormSubmission | null> {
    return await this.submissionsRepository.create(data)
  }

  /**
   * Update an existing form submission.
   */
  async updateSubmission(id: number, data: Partial<FormSubmission>): Promise<FormSubmission | null> {
    const existing = await this.submissionsRepository.findById(id);
    if (!existing) {
      return null;
    }

    return this.submissionsRepository.update(id, data);
  }

  /**
   * Delete a form submission by ID.
   */
  async deleteSubmission(id: number): Promise<boolean> {
    // Check if submission exists
    const existing = await this.submissionsRepository.findById(id);
    if (!existing) {
      return false;
    }

    return this.submissionsRepository.delete(id);
  }

  /**
   * Delete form submissions by form_key.
   */
  async deleteSubmissionsByFormKey(formKey: string): Promise<boolean> {
    return await this.submissionsRepository.deleteByFormKey(formKey);
  }

  /**
   * Mark submission as submitted.
   */
  async markAsSubmitted(id: number): Promise<FormSubmission | null> {
    return await this.submissionsRepository.markAsSubmitted(id);
  }

  /**
   * Mark submission as failed.
   */
  async markAsFailed(id: number, errorMessage?: string): Promise<FormSubmission | null> {
    return await this.submissionsRepository.markAsFailed(id, errorMessage);
  }

  /**
   * Get count of submissions by status.
   */
  async getCountByStatus(status: string): Promise<number> {
    return await this.submissionsRepository.getCountByStatus(status);
  }

  /**
   * Get total submission count.
   */
  async getCount(): Promise<number> {
    return await this.submissionsRepository.getCount();
  }

  /**
   * Get submissions for a specific form key.
   */
  async getByFormKey(formKey: string): Promise<FormSubmission[]> {
    return await this.submissionsRepository.getByFormKey(formKey);
  }
}