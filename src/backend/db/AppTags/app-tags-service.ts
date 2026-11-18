import { appTagsRepository, type AppTagUsage, type PlatformAppTagRow } from './app-tags-repository';

export class AppTagsService {
  private static instance: AppTagsService | null = null;

  static getInstance(): AppTagsService {
    if (!AppTagsService.instance) {
      AppTagsService.instance = new AppTagsService();
    }
    return AppTagsService.instance;
  }

  listTags(): PlatformAppTagRow[] {
    return appTagsRepository.listTags();
  }

  createTag(input: { id: string; label: string; description?: string; sortOrder?: number }): void {
    appTagsRepository.createTag(input);
  }

  updateTag(
    id: string,
    patch: { label?: string; description?: string; sortOrder?: number },
  ): void {
    appTagsRepository.updateTag(id, patch);
  }

  deleteTag(tagId: string): { success: true } | { success: false; apps: AppTagUsage[] } {
    const result = appTagsRepository.deleteTag(tagId);
    if (result.blocked) {
      return { success: false, apps: result.apps };
    }
    return { success: true };
  }

  setAppTags(appId: string, orderedTagIds: string[]): void {
    appTagsRepository.setAssignmentsForApp(appId, orderedTagIds);
  }

  getAppTags(appId: string): string[] {
    return appTagsRepository.getAssignmentsForApp(appId);
  }

  listAppsUsingTag(tagId: string): AppTagUsage[] {
    return appTagsRepository.listAppsUsingTag(tagId);
  }

  getCatalogTagAssignments(): Record<string, string[]> {
    const map = appTagsRepository.getAssignmentsForAllApps();
    const out: Record<string, string[]> = {};
    for (const [appId, tagIds] of map) {
      out[appId] = tagIds;
    }
    return out;
  }
}

export const appTagsService = AppTagsService.getInstance();
