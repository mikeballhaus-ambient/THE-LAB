import { describe, test, expect } from '@jest/globals';
import { resolveRepoFilesTemplate } from '@/backend/utils/template-resolvers/repo-files-resolver';
import type { TemplateResolverContext } from '@/backend/utils/template-resolvers/types';

const emptyCtx: TemplateResolverContext = {
  userId: 1,
  user: null,
  personas: [],
  commands: [],
  nativeToolCalls: false,
};

describe('template resolvers (4.4)', () => {
  test('resolveRepoFilesTemplate uses providerData.repoFiles without walking disk', async () => {
    const template = `
FE: {{REPO_FILE_LIST_FRONTEND}}
BE: {{REPO_FILE_LIST_BACKEND}}
SH: {{REPO_FILE_LIST_SHARED}}
TE: {{REPO_FILE_LIST_TEST}}
`;
    const result = await resolveRepoFilesTemplate(
      emptyCtx,
      'session-1',
      'Chat',
      false,
      {
        aiProviders: [],
        repoFiles: ['./src/backend/server.ts', './src/shared/types/index.ts', './src/tests/foo.test.ts'],
        sysMsg: '',
        apps: [],
      },
      template,
      {} as never,
    );

    expect(result).toContain('./src/backend/server.ts');
    expect(result).toContain('./src/shared/types/index.ts');
    expect(result).toContain('./src/tests/foo.test.ts');
    expect(result).toContain('./index.html');
    expect(result).not.toContain('{{REPO_FILE_LIST_FRONTEND}}');
  });
});
