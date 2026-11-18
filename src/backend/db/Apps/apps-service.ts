import { appsRepository } from './apps-repository';
import { appTagsService } from '../AppTags/app-tags-service';
import { IApp, AppType } from '../../../shared/types/app/app.d';
import {
  isAppDeletionProtected,
  protectedAppDeletionBlockedMessage,
} from '../../../shared/types/app/protected-apps';

export class AppsService {
  private static instance: AppsService | null = null;

  private constructor() { }

  public static getInstance(): AppsService {
    if (!AppsService.instance) {
      AppsService.instance = new AppsService();
    }
    return AppsService.instance;
  }

  //
  // QUERY METHODS
  //

  /**
   * Get app by ID, passing to repository for database lookup.
   * @param id - The app identifier
   * @returns The app object or undefined if not found
   */
  getAppById(id: string): IApp | undefined {
    return appsRepository.getAppsById(id);
  }

  /**
   * Get app by name, passing to repository for database lookup.
   * @param name - The app name to search for
   * @returns The app object or undefined if not found
   */
  getAppsByName(name: string): IApp | undefined {
    return appsRepository.getAppsByName(name);
  }

  /**
   * Get all apps, passing to repository for database retrieval.
   * @returns Array of all app objects
   */
  getAllApps(): IApp[] {
    return appsRepository.getAllApps();
  }

  /** Enabled registry apps with `catalogTagIds` (lab catalog + dashboard socket payloads). */
  getAllAppsWithCatalogTags(): IApp[] {
    const assignments = appTagsService.getCatalogTagAssignments();
    return this.getAllApps()
      .filter((app) => app.isEnabled)
      .map((app) => ({
        ...app,
        catalogTagIds: assignments[app.id] ?? [],
      }));
  }

  /**
   * Get all enabled apps, passing to repository for filtered retrieval.
   * @returns Array of enabled apps
   */
  getEnabledApps(): IApp[] {
    return appsRepository.getEnabledApps();
  }

  /**
   * Get apps by type, passing to repository for filtered retrieval.
   * @param type - The app type filter ('browser', 'server', 'hybrid')
   * @returns Array of apps matching the type
   */
  getAppsByType(type: AppType): IApp[] {
    return appsRepository.getAppsByType(type);
  }

  //
  // CRUD OPERATIONS
  //

  /**
   * Create a new app in the database, passing to repository for insert.
   * @param app - The app object to insert
   */
  createApp(app: IApp): void {
    appsRepository.insertApp(app);
  }

  /**
   * Update an existing app in the database, passing to repository for update.
   * @param id - The app identifier
   * @param app - The updated app object
   */
  updateApp(id: string, app: IApp): void {
    appsRepository.updateApp(id, app);
  }

  /**
   * Delete an app from the database, passing to repository for delete.
   * @param id - The app identifier
   */
  deleteApp(id: string): void {
    if (isAppDeletionProtected(id)) {
      throw new Error(protectedAppDeletionBlockedMessage(id));
    }
    const app = this.getAppById(id);
    if (app?.isSystem) {
      throw new Error(protectedAppDeletionBlockedMessage(id));
    }
    appsRepository.deleteApp(id);
  }

  reorderApps(appIds: string[]): { success: boolean; error?: string; apps?: IApp[] } {
    return appsRepository.reorderApps(appIds);
  }

  updateAppsEnabled(
    enabledByAppId: Record<string, boolean>,
  ): { success: boolean; error?: string } {
    return appsRepository.updateAppsEnabled(enabledByAppId);
  }

  //
  // METADATA HELPERS
  //
}

// Singleton instance
export const appsService = AppsService.getInstance();
export default appsService;
