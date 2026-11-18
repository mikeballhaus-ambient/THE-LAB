#!/usr/bin/env node

/**
 * sync-app-dirs — folder ↔ registry parity **report**.
 *
 * ## History (do not re-enable deletion casually)
 *
 * This script originally deleted every `src/apps/*` directory absent from the `apps` table.
 * That ran as `pre-bootstrap`, so a reset, stale or partially-seeded registry classified
 * **every** app directory as an orphan and recursively `fs.rmSync`'d them, bypassing the
 * Recycle Bin. This is how the platform apps and the Wave C catalog apps were lost.
 *
 * Deletion was disabled 2026-10-17 (`DISABLED 2026-10-17` block below). It is now made
 * structurally impossible: the destructive code has been **removed**, not commented out, so no
 * future edit can resurrect it by uncommenting.
 *
 * ## Behaviour
 *
 * Read-only. Reports:
 *   - **orphan dirs** — on disk, no registry row (i.e. what the old script would have deleted)
 *   - **missing dirs** — registry row, no directory (a launch would fail)
 *
 * Exit code is always 0 for a successful *scan*. Wire this into a test if you want it to
 * gate CI; do not wire it into a delete.
 */

import fs from "fs";
import { fileHelpers } from '../../src/backend/utils/file-helpers';
import { VSCodeLogger } from '../../src/backend/utils/logger';
import { appsService } from '../../src/backend/db/Apps/apps-service';
import { databaseManager } from '../../src/backend/db/DatabaseManager';
import { IApp, IServerConfig } from "../shared/types";

/**
 * Sync app directories with the database
 * Removes any physical directories in src/apps/ that are not registered in the database
 */
async function syncAppDirectories() {
  const logger = await VSCodeLogger.getInstance();
  
  try {
    // Use fileHelpers for consistent path handling across platforms
    const appsDir = fileHelpers.toForwardPath('src/apps');
    
    logger.info(`[SYNC-DIRS] Starting sync process. appsDir: ${appsDir}`);
    console.log(`[SYNC-DIRS] Starting sync process. appsDir: ${appsDir}`);

    // Initialize database - this script runs before the app loads
    logger.info(`[SYNC-DIRS] Initializing database`);
    console.log(`[SYNC-DIRS] Initializing database`);
    await databaseManager.initialize();
    logger.info(`[SYNC-DIRS] Database initialized`);

    // Validate apps directory exists
    logger.info(`[SYNC-DIRS] Checking if apps directory exists`);
    if (!fs.existsSync(appsDir)) {
      logger.warn(`[SYNC-DIRS] Apps directory does not exist: ${appsDir}`);
      console.log(`[SYNC-DIRS] Apps directory does not exist: ${appsDir}`);
      return { success: true, message: "Apps directory not found" };
    }
    logger.info(`[SYNC-DIRS] Apps directory exists: ${appsDir}`);

    // Get all app paths from the database
    // The directory name is derived from either component_path (browser/hybrid) or server_config.entry (server)
    logger.info(`[SYNC-DIRS] Fetching app data from services`);
    const allApps = appsService.getAllApps();
    logger.info(`[SYNC-DIRS] Retrieved ${allApps.length} apps from database`);
    console.log(`[SYNC-DIRS] Retrieved ${allApps.length} apps from database`);

    const expectedDirs = allApps
      .map((app: IApp) => {
        logger.info(`[SYNC-DIRS] Processing app: ${app.name || 'unnamed'}, type: ${app.type}`);
        
        let dirPath: string = '';
        
        if ((app.type === 'browser' || app.type === 'hybrid') && app.componentPath) {
          // For browser or hybrid apps, component_path will be something like '/src/apps/{dir}/front-end/App.vue'
          dirPath = app.componentPath;
          logger.info(`[SYNC-DIRS] Browser/hybrid app, component_path: ${dirPath}`);
        } else if (app.type === 'server') {
          // For server apps, server_config.entry is e.g. '/src/apps/{dir}/back-end/entry.ts'
          const serverConfig = app.server as IServerConfig;
          dirPath = serverConfig.entry;
          logger.info(`[SYNC-DIRS] Server app, server_config.entry: ${dirPath}`);
        } else {
          // Unknown type, skip
          logger.warn(`[SYNC-DIRS] Skipping app with unknown type: ${app.type}`);
          return null;
        }

        if (dirPath == '') return null;

        // Extract directory name from path (e.g., '/src/apps/{dir}/front-end/App.vue' -> '{dir}')
        // The directory name is the substring between '/src/apps/' and the next '/'
        const prefix = '/src/apps/';
        if (dirPath.startsWith(prefix)) {
          const extractedDir = dirPath.substring(prefix.length).split('/')[0];
          logger.info(`[SYNC-DIRS] Extracted directory: ${extractedDir} from path: ${dirPath}`);
          return extractedDir;
        }
        logger.warn(`[SYNC-DIRS] Invalid path format, skipping: ${dirPath}`);
        return null;
      })
      .filter(dirPath => dirPath !== null);

    const expectedDirSet = new Set(expectedDirs);

    logger.info(`[SYNC-DIRS] Expected directories from database (${expectedDirs.length}): ${expectedDirs.join(', ')}`);
    console.log(`[SYNC-DIRS] Expected directories from database (${expectedDirs.length}): ${expectedDirs.join(', ')}`);

    // Scan for all subdirectories in src/apps/
    logger.info(`[SYNC-DIRS] Scanning physical directories in ${appsDir}`);
    const files = fs.readdirSync(appsDir);
    const physicalDirs = files
      .filter(item => {
        try {
          const fullPath = fileHelpers.toForwardPath(`${appsDir}/${item}`);
          return fs.statSync(fullPath).isDirectory();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`[SYNC-DIRS] Error checking item "${item}": ${message}`);
          return false;
        }
      })
      .map(dir => fileHelpers.toForwardPath(`${appsDir}/${dir}`).split('/').pop());

    logger.info(`[SYNC-DIRS] Found physical directories (${physicalDirs.length}): ${physicalDirs.join(', ')}`);
    console.log(`[SYNC-DIRS] Found physical directories (${physicalDirs.length}): ${physicalDirs.join(', ')}`);

    // Physical directories with no registry row. A launch would fail for these, and the
    // historical script deleted them. **Reported only — this script never mutates disk.**
    const orphanDirs = physicalDirs.filter(dir => dir && !expectedDirSet.has(dir));
    // Registry rows with no directory. A launch would fail immediately.
    const missingDirs = [...expectedDirSet].filter(dir => !physicalDirs.includes(dir));

    if (orphanDirs.length === 0 && missingDirs.length === 0) {
      logger.info(`[SYNC-DIRS] Folder/registry parity OK (${expectedDirs.length} apps)`);
      console.log(`[SYNC-DIRS] Folder/registry parity OK (${expectedDirs.length} apps)`);
      return { success: true, message: 'All directories synchronized', orphanDirs: [], missingDirs: [] };
    }

    for (const dirName of orphanDirs) {
      logger.warn(`[SYNC-DIRS] ORPHAN directory (no registry row): ${dirName}`);
      console.log(`[SYNC-DIRS] ORPHAN (not deleted): ${dirName}`);
    }
    for (const dirName of missingDirs) {
      logger.warn(`[SYNC-DIRS] MISSING directory (registry row, no folder): ${dirName}`);
      console.log(`[SYNC-DIRS] MISSING: ${dirName}`);
    }

    console.log(
      `[SYNC-DIRS] ${orphanDirs.length} orphan(s), ${missingDirs.length} missing. ` +
        'Nothing was modified — this script is report-only by design.',
    );

    return {
      success: true,
      message: `Reported ${orphanDirs.length} orphan(s) and ${missingDirs.length} missing (no changes made)`,
      orphanDirs,
      missingDirs,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[SYNC-DIRS] Sync failed: ${message}`);
    console.error(`[SYNC-DIRS] Sync failed: ${message}`);
    console.error(`[SYNC-DIRS] Full error:`, err);
    return { success: false, message };
  }
}

// Run the sync
const logger = await VSCodeLogger.getInstance();
void syncAppDirectories().then(result => {
  logger.info(`[SYNC-DIRS] Final result: ${JSON.stringify(result)}`);
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  logger.error(`[SYNC-DIRS] Unexpected error: ${err.message}`);
  console.error(`[SYNC-DIRS] Unexpected error:`, err);
  process.exit(1);
});
