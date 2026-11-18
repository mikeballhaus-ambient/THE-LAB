import { contextSettingsRepository } from './context-settings-repository';
import { IContextSettings } from '../../../shared/types/context-settings';

export class ContextSettingsService {
  private static instance: ContextSettingsService | null = null

  private constructor() {}

  public static getInstance(): ContextSettingsService {
    if (!ContextSettingsService.instance) {
      ContextSettingsService.instance = new ContextSettingsService();
    }
    return ContextSettingsService.instance;
  }

  /**
   * Get the context settings configuration for a specific user.
   * @param userId - Optional user ID to filter by (defaults to all)
   * @returns The context settings object or undefined if not found
   */
  getContextSettings(userId?: number): IContextSettings | undefined {
    return contextSettingsRepository.get(userId);
  }

  /**
   * Get all users' context settings.
   * @returns Array of all context settings
   */
  getAllUsersContextSettings(): IContextSettings[] {
    return contextSettingsRepository.getAll();
  }

  /**
   * Update the context settings configuration for a specific user.
   * @param userId - User ID to update
   * @param contextSettings - The updated settings object
   */
  updateContextSettingsForUser(userId: number, contextSettings: IContextSettings): void {
    contextSettingsRepository.update(userId, contextSettings);
  }

  ensureUserHasDefaultContextSettings(userId: number): void {
    contextSettingsRepository.ensureUserDefaultSettings(userId);
  }

  /**
   * Update the context settings configuration (backward compatible).
   * For backward compatibility, this method uses userId = 0 as default.
   * @param contextSettings - The updated settings object
   */
  updateContextSettings(contextSettings: IContextSettings): void {
    // Backward compatible: use userId 0 for global updates
    contextSettingsRepository.update(0, contextSettings);
  }

  /**
   * Delete the context settings configuration for a specific user.
   * @param userId - User ID to delete
   */
  deleteContextSettingsForUser(userId: number): void {
    contextSettingsRepository.deleteByUserId(userId);
  }

  /**
   * Delete the context settings configuration (legacy method).
   */
  deleteContextSettings(): void {
    contextSettingsRepository.delete();
  }
}

// Singleton instance
export const contextSettingsService = ContextSettingsService.getInstance();
export default contextSettingsService;
