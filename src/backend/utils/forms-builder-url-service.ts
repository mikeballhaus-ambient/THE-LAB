import type { IApp } from '@/shared/types/app/app.d';
import {
  resolveFormsBuilderUrlFromApps,
  type FormsBuilderAppLike,
} from '@/shared/config/forms-builder-url';

/**
 * Resolved once at main THE-LAB backend startup from the apps registry (`app-lab-formsbuilder`).
 */
export class FormsBuilderUrlService {
  private static instance: FormsBuilderUrlService | null = null;
  private url: string | null = null;

  public static getInstance(): FormsBuilderUrlService {
    if (!FormsBuilderUrlService.instance) {
      FormsBuilderUrlService.instance = new FormsBuilderUrlService();
    }
    return FormsBuilderUrlService.instance;
  }

  /** Call after main DB + apps repository are ready. */
  public initialize(apps: IApp[]): string {
    const host = (process.env.VITE_API_BASE_URL ?? 'http://localhost').replace(/\/$/, '');
    this.url = resolveFormsBuilderUrlFromApps(apps as FormsBuilderAppLike[], host);
    return this.url;
  }

  public getUrl(): string {
    if (this.url) {
      return this.url;
    }
    const fromEnv = process.env.FORMS_BUILDER_URL?.trim();
    if (fromEnv) {
      return fromEnv.replace(/\/$/, '');
    }
    throw new Error(
      'FormsBuilderUrlService not initialized. Main server must call initialize() after database bootstrap.',
    );
  }

  /** Safe read before initialize (e.g. tests); falls back to env only. */
  public tryGetUrl(): string | null {
    if (this.url) {
      return this.url;
    }
    const fromEnv = process.env.FORMS_BUILDER_URL?.trim();
    return fromEnv ? fromEnv.replace(/\/$/, '') : null;
  }
}
