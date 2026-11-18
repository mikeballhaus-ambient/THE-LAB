/**
 * file-helpers.ts
 * File I/O helper utilities
 *
 * Provides centralized file system operations with cross-platform path handling.
 */

import * as fs from 'fs';
import * as path from 'path';
import { VSCodeLogger } from './logger';
import { isExcludedDir } from '../../shared/types';
import {
  getCachedRepoFiles,
  invalidateRepoFileIndex,
  resetRepoFileIndexForTests,
} from './repo-file-index';

export {
  invalidateRepoFileIndex,
  resetRepoFileIndexForTests,
  getRepoFileIndexGeneration,
  isRepoFileIndexFresh,
  filterRepoFilesByDirectoryPrefix,
} from './repo-file-index';

let fetchRepoFilesCallCount = 0;

/** rm-46 Phase 0.2 — count full-repo scans (reset in tests if needed). */
export function getFetchRepoFilesCallCount(): number {
  return fetchRepoFilesCallCount;
}

export function resetFetchRepoFilesCallCount(): void {
  fetchRepoFilesCallCount = 0;
  resetRepoFileIndexForTests();
}

/** Object containing file helper functions */
export const fileHelpers = {
  invalidateRepoFileIndex,

  /**
   * Converts a path to forward slashes for cross-platform compatibility
   */
  toForwardPath: (filePath: string | undefined): string => {
    return filePath ? filePath.replace(/\\/g, '/') : '';
  },

  /** Resolve agent/tool paths relative to repo root; preserve OS-absolute paths (Linux CI). */
  resolveWorkspacePath: (inputPath: string): string => {
    const trimmed = inputPath.trim();
    if (!trimmed) {
      return process.cwd();
    }
    if (path.isAbsolute(trimmed)) {
      return path.normalize(trimmed);
    }
    return path.resolve(process.cwd(), trimmed);
  },

  /**
   * Reads a JSON file and parses it
   * @param relativePath - Path relative to backend root
   * @returns Parsed JSON content
   */
  async readJsonFile<T>(relativePath: string): Promise<T> {
    const data = await this.readFile(relativePath);
    const parsed = JSON.parse(data) as T;
    return parsed;
  },

  async readFile(relativePath: string): Promise<string> {
    const rootPath = process.cwd();
    const toForwardPath = fileHelpers.toForwardPath(relativePath)
    const fullPath = path.join(rootPath, toForwardPath);
    try {
      const data = await fs.promises.readFile(fullPath, 'utf8');
      return data;
    } catch (err) {
      throw new Error(`Cannot read file: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  /**
   * Writes data to a JSON file
   * @param relativePath - Path relative to backend root
   * @param data - Data to write
   */
  async writeJsonFile(relativePath: string, data: unknown): Promise<void> {
    await this.writeFile(relativePath, JSON.stringify(data, null, 2));
  },

  async writeFile(relativePath: string, data: string): Promise<void> {
    const rootPath = process.cwd();
    const fullPath = path.join(rootPath, fileHelpers.toForwardPath(relativePath));
    await fs.promises.writeFile(fullPath, data, 'utf8');
  },

  async ensureDirExists(dirPath: string): Promise<boolean> {
    const log = await VSCodeLogger.getInstance();
    log.info(`[FILE-HELPER] ensureDirExists("${dirPath}"): cwd="${process.cwd()}"`);
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      log.info(`[FILE-HELPER] ensureDirExists("${dirPath}"): OK`);
      return true;
    } catch (err) {
      log.error(`[FILE-HELPER] ensureDirExists("${dirPath}"): FAILED - ${err}`);
      // Ignore if directory already exists
      const errnoErr = err as NodeJS.ErrnoException;
      if (errnoErr.code !== 'EEXIST') {
        return false;
      }
      return true;
    }
  },

  /**
   * Deletes a file, handling cases where file doesn't exist
   * Uses fs.promises.rm with force:true to avoid errors for missing files
   * @returns true if file was deleted or didn't exist, false on other errors
   */
  async deleteFile(relativePath: string, logDeletion: boolean = false): Promise<boolean> {
    const rootPath = process.cwd();
    const fullPath = path.join(rootPath, fileHelpers.toForwardPath(relativePath));

    try {
      if (logDeletion) {
        const log = await VSCodeLogger.getInstance();
        log.info(`[FILE-HELPER] deleteFile("${fullPath}"): attempting deletion. ..`);
      }

      // use fs.promises.rm with force option to handle missing files gracefully
      await fs.promises.rm(fullPath, { force: true });

      if (logDeletion) {
        const log = await VSCodeLogger.getInstance();
        log.info(`[FILE-HELPER] deleteFile("${fullPath}"): OK`);
      }
      return true;
    } catch (err) {
      const logErr = err as NodeJS.ErrnoException;

      if (logDeletion) {
        const log = await VSCodeLogger.getInstance();
        const errorMsg = logErr.code === 'ENOENT' ? 'File not found' : `${logErr.code}: ${logErr.message}`;
        log.warn(`[FILE-HELPER] deleteFile("${fullPath}"): FAILED - ${errorMsg}`);
      }
      return false;
    }
  },

  /**
   * Traverses directory recursively and yields file paths
   * @private
   */
  async *traverseDirectory(dirPath: string): AsyncGenerator<string> {
    const isExcluded = (name: string) => isExcludedDir(name) || name === '.' || name === '..';

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (isExcluded(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        yield this.toForwardPath(fullPath);
      } else if (entry.isDirectory()) {
        yield* this.traverseDirectory(fullPath);
      }
    }
  },

  /**
   * Fetches all files in the repository recursively
   * @returns Promise resolving to array of relative file paths (forward slashes)
   */
  async fetchRepoFiles(): Promise<string[]> {
    return getCachedRepoFiles(async () => {
      fetchRepoFilesCallCount += 1;
      const log = await VSCodeLogger.getInstance();
      const filePaths: string[] = [];

      log.info(`[FILE-HELPER] fetchRepoFiles(): scanning repository (call #${fetchRepoFilesCallCount})..`);

      for await (const filePath of this.traverseDirectory(process.cwd())) {
        const relativePath = path.relative(process.cwd(), filePath);
        filePaths.push(fileHelpers.toForwardPath(relativePath));
      }

      log.info(`[FILE-HELPER] fetchRepoFiles(): loaded ${filePaths.length} files`);
      return filePaths;
    });
  },
};
