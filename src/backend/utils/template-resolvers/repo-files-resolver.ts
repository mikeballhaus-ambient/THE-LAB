import { fileHelpers, filterRepoFilesByDirectoryPrefix } from '../file-helpers';
import type { TemplateResolverFn } from './types';

/** Resolves `{{REPO_FILE_LIST_*}}` placeholders (rm-46 **4.4**). */
export const resolveRepoFilesTemplate: TemplateResolverFn = async (
  _ctx,
  _sessionId,
  _persona,
  _isDeveloperMode,
  providerData,
  templateData,
) => {
  const allRepoFiles = providerData.repoFiles?.length
    ? providerData.repoFiles
    : await fileHelpers.fetchRepoFiles();

  const frontEndFiles: string[] = [
    './index.html',
    './src/App.vue',
    './src/main.ts',
    './src/shims-vue.d.ts',
    ...filterRepoFilesByDirectoryPrefix(allRepoFiles, './src/dashboard'),
  ];

  const backEndFiles: string[] = [
    './src/backend-entry.ts',
    ...filterRepoFilesByDirectoryPrefix(allRepoFiles, './src/backend'),
    ...filterRepoFilesByDirectoryPrefix(allRepoFiles, './src/services'),
  ];

  const sharedFiles = filterRepoFilesByDirectoryPrefix(allRepoFiles, './src/shared');
  const testFiles = filterRepoFilesByDirectoryPrefix(allRepoFiles, './src/tests');

  return templateData
    .replace(/{{REPO_FILE_LIST_FRONTEND}}/, frontEndFiles.join('\n'))
    .replace(/{{REPO_FILE_LIST_BACKEND}}/, backEndFiles.join('\n'))
    .replace(/{{REPO_FILE_LIST_SHARED}}/, sharedFiles.join('\n'))
    .replace(/{{REPO_FILE_LIST_TEST}}/, testFiles.join('\n'));
};
