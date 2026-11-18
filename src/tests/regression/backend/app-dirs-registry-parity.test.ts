import { describe, expect, test } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Folder ↔ registry parity guard.
 *
 * The platform apps and the Wave C catalog apps were lost because `sync-app-dirs` ran as
 * `pre-bootstrap` and treated every `src/apps/*` directory absent from the `apps` table as an
 * orphan to delete. With a reset or partially-seeded registry, that was *all* of them.
 *
 * The delete path is now gone (`sync-app-dirs.ts` is report-only), but this guard covers the
 * other half: a directory on disk with no registry row is an app that cannot launch, and a
 * registry row with no directory is an app that fails at launch. Both are silent until someone
 * tries to open the app.
 *
 * Documented exceptions live in {@link IGNORED_DIRS} and must state why.
 */

const APPS_DIR = path.join(process.cwd(), 'src', 'apps');

/**
 * Directories that legitimately have no `apps` row.
 *
 * Keep this list empty unless a directory genuinely is not an app. Every entry needs a reason.
 */
const IGNORED_DIRS: Record<string, string> = {};

interface AppDirFacts {
  dir: string;
  /** Has a browser/hybrid entry (`front-end/App.vue`). */
  hasFrontEnd: boolean;
  /** Has a server entry (`back-end/entry.ts` or `back-end/server.ts`). */
  hasBackEnd: boolean;
}

function readAppDirs(): AppDirFacts[] {
  return fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = entry.name;
      const base = path.join(APPS_DIR, dir);
      return {
        dir,
        hasFrontEnd: fs.existsSync(path.join(base, 'front-end', 'App.vue')),
        hasBackEnd:
          fs.existsSync(path.join(base, 'back-end', 'entry.ts')) ||
          fs.existsSync(path.join(base, 'back-end', 'server.ts')),
      };
    })
    /** Only real apps: something must actually be launchable. */
    .filter((facts) => facts.hasFrontEnd || facts.hasBackEnd);
}

/**
 * Registry ids that are known to lack a row **and** are intentionally not registered yet.
 *
 * Populated deliberately, never to make a red test green without a decision — see
 * `plans/rm-64-lab-app-integrations/REMAINING-PROGRAM.md`.
 */
const KNOWN_UNREGISTERED: Record<string, string> = {};

describe('src/apps folder ↔ registry parity', () => {
  test('every launchable app directory has a registry row', async () => {
    const { AppsRepository } = await import('@/backend/db/Apps/apps-repository');
    const Database = (await import('better-sqlite3')).default;

    const db = new Database(':memory:');
    const repo = new AppsRepository();
    await repo.bootstrap(db);

    const registered = new Set(repo.getAllApps().map((app) => app.id));
    const dirs = readAppDirs();

    const unregistered = dirs
      .filter((facts) => !(facts.dir in IGNORED_DIRS))
      .filter((facts) => !(facts.dir in KNOWN_UNREGISTERED))
      .filter((facts) => !registered.has(`app-${facts.dir}`) && !registered.has(facts.dir))
      .map((facts) => facts.dir);

    db.close();

    // A folder on disk that nothing can launch is the exact condition that preceded the loss.
    expect(unregistered).toEqual([]);
  });

  test('every registry row pointing into src/apps has a directory', async () => {
    const { AppsRepository } = await import('@/backend/db/Apps/apps-repository');
    const Database = (await import('better-sqlite3')).default;

    const db = new Database(':memory:');
    const repo = new AppsRepository();
    await repo.bootstrap(db);

    // Checks the *component file* exists, not that the dir is in `readAppDirs()` — several
    // apps use a named component (dnd-examples → DragDropExamples.vue) rather than App.vue.
    const broken = repo
      .getAllApps()
      .filter((app) => app.componentPath?.includes('/src/apps/'))
      .map((app) => ({ appId: app.id, componentPath: app.componentPath as string }))
      .filter((row) => {
        const relative = row.componentPath.replace(/^\//, '');
        return !fs.existsSync(path.join(process.cwd(), relative));
      })
      .map((row) => ({ appId: row.appId, componentPath: row.componentPath }));

    db.close();

    // A registry row whose folder is gone fails at launch, not at boot.
    expect(broken).toEqual([]);
  });

  test('the parity scan reports rather than mutates (sync-app-dirs contract)', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src', 'scripts', 'sync-app-dirs.ts'),
      'utf8',
    );

    // Guard against the destructive implementation being reintroduced. Any live call to a
    // mutating fs primitive in this script is a regression, not a refactor.
    const mutatingCalls = [
      /fs\.rmSync\s*\(/,
      /fs\.unlinkSync\s*\(/,
      /fs\.rmdirSync\s*\(/,
      /fs\.mkdirSync\s*\(/,
      /fs\.renameSync\s*\(/,
      /fs\.writeFileSync\s*\(/,
      /fs\.copyFileSync\s*\(/,
    ].filter((pattern) => pattern.test(source));

    expect(mutatingCalls).toEqual([]);
  });
});
