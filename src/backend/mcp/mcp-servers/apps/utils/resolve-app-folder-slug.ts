import type { IApp } from '../../../../../shared/types';

const APPS_PATH_PREFIX = '/src/apps/';

/** Folder name under `src/apps/` derived from componentPath or server entry. */
export function resolveAppFolderSlugFromRecord(app: IApp): string | null {
  let appDir = '';
  if (app.type === 'browser' || app.type === 'hybrid') {
    appDir = app.componentPath ?? '';
  } else if (app.server?.entry) {
    appDir = app.server.entry;
  }
  if (!appDir.startsWith(APPS_PATH_PREFIX)) {
    return null;
  }
  const slug = appDir.substring(APPS_PATH_PREFIX.length).split('/')[0];
  return slug || null;
}
