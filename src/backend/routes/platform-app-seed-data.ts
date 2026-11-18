import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { AppManager } from '../AppManager';

import { appsService } from '../db/Apps/apps-service';

import { requirePlatformOwnerOrAdmin } from '../middleware/platform-http-auth';

import {

  getAppSeedManifest,

  isPlatformLabSeedAppId,

  listAllSeedDataManifests,

  listSeedPackTargets,

  packAllowsRemove,

} from '@/shared/config/app-seed-data-registry';

import {

  applyLabDemoUsersPack,

  getLabDemoUsersPackStatus,

  removeLabDemoUsersPack,

} from '../platform/lab-demo-users-seed-service';

import { LAB_DEMO_USERS_PACK_ID } from '../db/Auth/seed-demo-users';

import { executeAppSeedPackDirect } from '../platform/app-seed-data-direct';
import {
  getCatalogDemoSeedStatus,
  isCatalogDemoSeedAppId,
} from '../platform/catalog-demo-seed-direct';
import { databaseManager } from '../db/DatabaseManager';
import { AppDatabaseManager } from '../AppDatabaseManager';
import { resolveAppDatabaseFolderId } from '../platform/app-seed-data-db-id';
import {
  executePlatformCatalogSeedPack,
  getPlatformCatalogSeedStatus,
  isPlatformCatalogAppId,
} from '../db/PlatformCatalog/platform-catalog-demo-seed';

import { PlatformAppServerService } from '../services/platform-app-server-service';

import { buildPlatformServiceAuthHeaders } from '@/shared/services/platform-user-client.node';

import type {

  AppSeedBulkAction,

  AppSeedBulkOperationResult,

  AppSeedBulkPackResult,

  AppSeedDataOverviewEntry,

  AppSeedOperationResult,

  AppSeedPackStatus,

} from '@/shared/types/app/app-seed-data';



async function isAppServerHealthy(appUrl: string): Promise<boolean> {

  try {

    const response = await fetch(`${appUrl}/health`, { signal: AbortSignal.timeout(2500) });

    return response.ok;

  } catch {

    return false;

  }

}



async function fetchAppSeedData(

  appUrl: string,

  actorUserId: number,

): Promise<{ ok: boolean; status?: AppSeedPackStatus[]; error?: string }> {

  try {

    const response = await fetch(`${appUrl}/api/admin/seed-data`, {

      headers: buildPlatformServiceAuthHeaders(actorUserId),

    });

    const text = await response.text();

    if (!response.ok) {

      return { ok: false, error: text || `HTTP ${response.status}` };

    }

    const body = JSON.parse(text) as { data?: { status?: AppSeedPackStatus[] } };

    return { ok: true, status: body.data?.status ?? [] };

  } catch (err) {

    return { ok: false, error: err instanceof Error ? err.message : 'Failed to reach app server' };

  }

}



export async function executePlatformSeedPackAction(

  appManager: AppManager,

  actorUserId: number,

  appId: string,

  packId: string,

  action: 'apply' | 'remove',

): Promise<{ httpStatus: number; result: AppSeedOperationResult }> {

  if (action === 'remove' && !packAllowsRemove(appId, packId)) {

    return {

      httpStatus: 403,

      result: {

        success: false,

        content: 'This pack is required platform infrastructure and cannot be removed.',

      },

    };

  }



  const manifest = getAppSeedManifest(appId);

  if (!manifest || !manifest.packs.some((p) => p.packId === packId)) {

    return { httpStatus: 404, result: { success: false, content: 'Unknown app or pack' } };

  }



  if (isPlatformLabSeedAppId(appId)) {

    if (packId !== LAB_DEMO_USERS_PACK_ID) {

      return { httpStatus: 404, result: { success: false, content: 'Unknown pack' } };

    }

    const result =

      action === 'apply' ? await applyLabDemoUsersPack() : await removeLabDemoUsersPack();

    return { httpStatus: result.success ? 200 : 400, result };

  }

  if (isPlatformCatalogAppId(appId)) {

    const result = executePlatformCatalogSeedPack(

      databaseManager.getDb(),

      appId,

      packId,

      action,

    );

    return { httpStatus: result.success ? 200 : 400, result };

  }



  const app = appsService.getAppById(appId);

  if (!app) {

    return { httpStatus: 404, result: { success: false, content: 'App not found' } };

  }

  try {

    const result = await executeAppSeedPackDirect(appId, packId, action);

    return { httpStatus: result.success ? 200 : 400, result };

  } catch (err) {

    return {

      httpStatus: 500,

      result: {

        success: false,

        content: err instanceof Error ? err.message : 'Seed action failed',

      },

    };

  }

}



function bulkTargetsForAction(bulkAction: AppSeedBulkAction): Array<{ appId: string; packId: string }> {

  if (bulkAction === 'repair-infrastructure') {

    return listSeedPackTargets('infrastructure').map((t) => ({ appId: t.appId, packId: t.packId }));

  }

  return listSeedPackTargets('demo').map((t) => ({ appId: t.appId, packId: t.packId }));

}



export async function runPlatformSeedBulkAction(

  appManager: AppManager,

  actorUserId: number,

  bulkAction: AppSeedBulkAction,

): Promise<AppSeedBulkOperationResult> {

  const action: 'apply' | 'remove' = bulkAction === 'remove-demo' ? 'remove' : 'apply';

  const targets = bulkTargetsForAction(bulkAction);

  const results: AppSeedBulkPackResult[] = [];



  for (const { appId, packId } of targets) {

    const { httpStatus, result } = await executePlatformSeedPackAction(

      appManager,

      actorUserId,

      appId,

      packId,

      action,

    );

    const skipped = httpStatus === 502;

    results.push({

      appId,

      packId,

      action,

      success: result.success === true && httpStatus < 400,

      content: result.content,

      skipped,

    });

  }



  const failures = results.filter((r) => !r.success && !r.skipped);

  const skipped = results.filter((r) => r.skipped);

  const successes = results.filter((r) => r.success);



  const label =

    bulkAction === 'remove-demo'

      ? 'Remove all demo data'

      : bulkAction === 'apply-demo'

        ? 'Restore all demo data'

        : 'Repair infrastructure seeds';



  const content = `${label}: ${successes.length} succeeded, ${failures.length} failed, ${skipped.length} skipped (app not running).`;



  return {

    success: failures.length === 0,

    content,

    results,

  };

}



export function registerPlatformAppSeedDataRoutes(server: FastifyInstance, appManager: AppManager): void {

  server.get(

    '/api/platform/apps/seed-data',

    async (request: FastifyRequest, reply: FastifyReply) => {

      const caller = await requirePlatformOwnerOrAdmin(request, reply);

      if (!caller) {

        return;

      }



      const appManifests = listAllSeedDataManifests().filter((m) => !isPlatformLabSeedAppId(m.appId));

      const { apps: serverEntries } = PlatformAppServerService.getInstance().listServerUrls(

        appManager,

        appManifests.map((m) => m.appId),

      );

      const urlByAppId = new Map(serverEntries.map((e) => [e.appId, e]));



      const data: AppSeedDataOverviewEntry[] = [];



      for (const manifest of listAllSeedDataManifests()) {

        if (isPlatformLabSeedAppId(manifest.appId)) {

          const status = await getLabDemoUsersPackStatus();

          data.push({ manifest, status });

          continue;

        }

        if (isPlatformCatalogAppId(manifest.appId)) {

          const status = getPlatformCatalogSeedStatus(databaseManager.getDb(), manifest.appId);

          data.push({ manifest, status });

          continue;

        }

        // Catalog demo packs are applied straight to the app's SQLite file, so status is
        // readable without the app server being warm.
        if (isCatalogDemoSeedAppId(manifest.appId)) {
          const catalogDb = await AppDatabaseManager.getInstance().getConnection(
            resolveAppDatabaseFolderId(manifest.appId),
          );
          const status = await getCatalogDemoSeedStatus(catalogDb, manifest.appId);
          data.push({ manifest, status });
          continue;
        }



        const entry = urlByAppId.get(manifest.appId);

        const appUrl = entry?.url;

        const trackedRunning = entry?.isRunning === true;

        const healthy = appUrl ? await isAppServerHealthy(appUrl) : false;

        const reachable = trackedRunning || healthy;



        let status: AppSeedPackStatus[] = manifest.packs.map((p) => ({

          packId: p.packId,

          present: false,

          serverReachable: false,

          message: reachable ? undefined : 'Launch this app to refresh status',

        }));



        if (reachable && appUrl) {

          const fetched = await fetchAppSeedData(appUrl, caller.userId);

          if (fetched.ok && fetched.status) {

            status = fetched.status.map((s) => ({ ...s, serverReachable: true }));

          } else {

            status = manifest.packs.map((p) => ({

              packId: p.packId,

              present: false,

              serverReachable: false,

              message: fetched.error ?? 'Could not load status from app server',

            }));

          }

        }



        data.push({ manifest, status });

      }



      return reply.send({ success: true, data });

    },

  );



  server.post(

    '/api/platform/apps/seed-data/bulk/:bulkAction',

    async (

      request: FastifyRequest<{

        Params: { bulkAction: string };

        Body: { confirm?: boolean };

      }>,

      reply: FastifyReply,

    ) => {

      const caller = await requirePlatformOwnerOrAdmin(request, reply);

      if (!caller) {

        return;

      }

      if (request.body?.confirm !== true) {

        return reply.status(400).send({ success: false, error: 'Body must include { confirm: true }' });

      }

      const bulkAction = request.params.bulkAction as AppSeedBulkAction;

      if (

        bulkAction !== 'remove-demo' &&

        bulkAction !== 'apply-demo' &&

        bulkAction !== 'repair-infrastructure'

      ) {

        return reply.status(400).send({

          success: false,

          error: 'bulkAction must be remove-demo, apply-demo, or repair-infrastructure',

        });

      }



      const result = await runPlatformSeedBulkAction(appManager, caller.userId, bulkAction);

      return reply.status(result.success ? 200 : 207).send(result);

    },

  );



  server.post(

    '/api/platform/apps/:appId/seed-data/:packId/:action',

    async (

      request: FastifyRequest<{

        Params: { appId: string; packId: string; action: string };

        Body: { confirm?: boolean };

      }>,

      reply: FastifyReply,

    ) => {

      const caller = await requirePlatformOwnerOrAdmin(request, reply);

      if (!caller) {

        return;

      }



      const { appId, packId, action } = request.params;

      if (request.body?.confirm !== true) {

        return reply.status(400).send({ success: false, error: 'Body must include { confirm: true }' });

      }

      if (action !== 'apply' && action !== 'remove') {

        return reply.status(400).send({ success: false, error: 'action must be apply or remove' });

      }



      const { httpStatus, result } = await executePlatformSeedPackAction(

        appManager,

        caller.userId,

        appId,

        packId,

        action,

      );

      return reply.status(httpStatus).send(result);

    },

  );

}


