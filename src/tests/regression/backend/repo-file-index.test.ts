import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
  filterRepoFilesByDirectoryPrefix,
  getRepoFileIndexGeneration,
  invalidateRepoFileIndex,
  isRepoFileIndexFresh,
} from '@/backend/utils/repo-file-index';
import {
  fileHelpers,
  getFetchRepoFilesCallCount,
  resetFetchRepoFilesCallCount,
} from '@/backend/utils/file-helpers';

describe('repo-file-index (2.2)', () => {
  afterEach(() => {
    resetFetchRepoFilesCallCount();
  });

  test('filterRepoFilesByDirectoryPrefix keeps paths under prefix', () => {
    const all = ['./src/backend/server.ts', './src/shared/types/index.ts', './README.md'];
    const backend = filterRepoFilesByDirectoryPrefix(all, './src/backend');
    expect(backend).toEqual(['./src/backend/server.ts']);
  });

  test('fetchRepoFiles scans once until invalidateRepoFileIndex', async () => {
    const traverseSpy = jest.spyOn(fileHelpers, 'traverseDirectory').mockImplementation(async function* () {
      yield 'src/mock-file.ts';
    });

    const first = await fileHelpers.fetchRepoFiles();
    const second = await fileHelpers.fetchRepoFiles();
    expect(first).toEqual(['src/mock-file.ts']);
    expect(second).toEqual(first);
    expect(getFetchRepoFilesCallCount()).toBe(1);
    expect(isRepoFileIndexFresh()).toBe(true);

    const genBefore = getRepoFileIndexGeneration();
    invalidateRepoFileIndex();
    expect(getRepoFileIndexGeneration()).toBe(genBefore + 1);
    expect(isRepoFileIndexFresh()).toBe(false);

    await fileHelpers.fetchRepoFiles();
    expect(getFetchRepoFilesCallCount()).toBe(2);

    traverseSpy.mockRestore();
  });

  test('resetFetchRepoFilesCallCount clears index for tests', async () => {
    const traverseSpy = jest.spyOn(fileHelpers, 'traverseDirectory').mockImplementation(async function* () {
      yield 'a.ts';
    });
    await fileHelpers.fetchRepoFiles();
    resetFetchRepoFilesCallCount();
    expect(getFetchRepoFilesCallCount()).toBe(0);
    expect(isRepoFileIndexFresh()).toBe(false);
    traverseSpy.mockRestore();
  });
});
