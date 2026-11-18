/**
 * In-memory repo file list with generation-based invalidation (rm-46 Phase 2.2).
 * Full tree scans run only when the index is stale.
 */

let cachedFiles: string[] | null = null;
let generation = 0;
let generationAtLastScan = -1;

export function getRepoFileIndexGeneration(): number {
  return generation;
}

export function invalidateRepoFileIndex(): void {
  generation += 1;
}

export function resetRepoFileIndexForTests(): void {
  cachedFiles = null;
  generation = 0;
  generationAtLastScan = -1;
}

export function isRepoFileIndexFresh(): boolean {
  return cachedFiles !== null && generationAtLastScan === generation;
}

export async function getCachedRepoFiles(scan: () => Promise<string[]>): Promise<string[]> {
  if (isRepoFileIndexFresh() && cachedFiles) {
    return cachedFiles;
  }
  cachedFiles = await scan();
  generationAtLastScan = generation;
  return cachedFiles;
}

/** Paths under `dirPrefix` (e.g. `./src/backend` or `src/shared`). */
export function filterRepoFilesByDirectoryPrefix(allFiles: string[], dirPrefix: string): string[] {
  const base = dirPrefix.replace(/^\.\//, '').replace(/\\/g, '/').replace(/\/$/, '');
  return allFiles
    .filter((f) => {
      const rel = f.replace(/^\.\//, '').replace(/\\/g, '/');
      return rel === base || rel.startsWith(`${base}/`);
    })
    .map((f) => (f.startsWith('./') ? f : `./${f.replace(/\\/g, '/')}`));
}
