/** Maps THE-LAB registry app id to `src/apps/{folder}/db` folder name. */
export function resolveAppDatabaseFolderId(registryAppId: string): string {
  if (registryAppId.startsWith('app-')) {
    return registryAppId.slice('app-'.length);
  }
  return registryAppId;
}
