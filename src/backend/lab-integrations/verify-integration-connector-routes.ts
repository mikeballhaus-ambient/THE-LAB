import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHART_BUILDER_INTEGRATION_MANIFEST,
  HELP_DESK_INTEGRATION_MANIFEST,
  TASK_LIST_INTEGRATION_MANIFEST,
} from '@/backend/db/Apps/integration-manifest-seeds';
import { CRM_INTEGRATION_MANIFEST } from '@/shared/lab-integrations/crm-integration-manifest-builder';
import {
  CATALOG_HOST_APP_IDS,
  CATALOG_MANIFEST_SEEDS,
  catalogHostDef,
} from '@/shared/lab-integrations/catalog-manifests';
import { PLATFORM_CATALOG_MANIFEST_SEEDS } from '@/shared/lab-integrations/platform-catalog-manifests';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import {
  LAB_CRM_APP_ID,
  LAB_HELP_DESK_APP_ID,
  LAB_TASK_LIST_APP_ID,
} from '@/shared/config/platform-lab-product-app-ids';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const CUSTOM_CONNECTOR_HOST_IDS = new Set([
  LAB_TASK_LIST_APP_ID,
  LAB_HELP_DESK_APP_ID,
  LAB_CRM_APP_ID,
]);

const MANIFEST_REGISTER_HOSTS: Array<[string, AppLabIntegrationManifestV1]> = [
  [CHART_BUILDER_APP_ID, CHART_BUILDER_INTEGRATION_MANIFEST],
];

const ALL_MANIFEST_HOSTS: Array<[string, AppLabIntegrationManifestV1]> = [
  [LAB_TASK_LIST_APP_ID, TASK_LIST_INTEGRATION_MANIFEST],
  [LAB_HELP_DESK_APP_ID, HELP_DESK_INTEGRATION_MANIFEST],
  [LAB_CRM_APP_ID, CRM_INTEGRATION_MANIFEST],
  ...MANIFEST_REGISTER_HOSTS,
  ...CATALOG_MANIFEST_SEEDS,
  ...PLATFORM_CATALOG_MANIFEST_SEEDS,
];

function connectorSegments(manifest: AppLabIntegrationManifestV1): string[] {
  const segments = new Set<string>();
  for (const service of manifest.integrationServices ?? []) {
    const segment = service.connector?.segment?.trim();
    if (segment) {
      segments.add(segment);
    }
  }
  return [...segments];
}

function serverFilePath(hostAppId: string): string {
  const folder = hostAppId.replace(/^app-/, '');
  return path.join(REPO_ROOT, 'src', 'apps', folder, 'back-end', 'server.ts');
}

function readServerSource(hostAppId: string): string | null {
  const filePath = serverFilePath(hostAppId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function verifyCatalogHostRegistration(hostAppId: string, source: string): string[] {
  const errors: string[] = [];
  if (!source.includes('registerCatalogConnectors')) {
    errors.push(`${hostAppId}: server must call registerCatalogConnectors (catalog host)`);
    return errors;
  }
  if (!catalogHostDef(hostAppId)) {
    errors.push(`${hostAppId}: registerCatalogConnectors used but host is not in CATALOG_HOST_DEFS`);
  }
  const literal = `registerCatalogConnectors(server, '${hostAppId}'`;
  const altLiteral = `registerCatalogConnectors(server, "${hostAppId}"`;
  if (!source.includes(literal) && !source.includes(altLiteral) && !source.includes(hostAppId)) {
    errors.push(
      `${hostAppId}: registerCatalogConnectors call should pass host id ${hostAppId} (or a constant equal to it)`,
    );
  }
  if (hostAppId === CHART_BUILDER_APP_ID) {
    errors.push(
      `${hostAppId}: must use registerHostIntegrationConnectors / registerIntegrationServiceConnectors, not registerCatalogConnectors alone`,
    );
  }
  return errors;
}

function verifyManifestHostRegistration(hostAppId: string, source: string): string[] {
  const errors: string[] = [];
  const ok =
    source.includes('registerHostIntegrationConnectors')
    || source.includes('registerIntegrationServiceConnectors');
  if (!ok) {
    errors.push(
      `${hostAppId}: integrationServices host must call registerHostIntegrationConnectors or registerIntegrationServiceConnectors`,
    );
  }
  if (source.includes('registerCatalogConnectors') && !CATALOG_HOST_APP_IDS.includes(hostAppId)) {
    errors.push(
      `${hostAppId}: registerCatalogConnectors is a no-op for non-catalog hosts — use manifest registration`,
    );
  }
  return errors;
}

function verifyCustomHostRegistration(
  hostAppId: string,
  source: string,
  segments: string[],
): string[] {
  const errors: string[] = [];
  if (hostAppId === LAB_CRM_APP_ID) {
    if (!source.includes('entityConnectorRoutes') || !source.includes("'/api/connector'")) {
      errors.push(`${hostAppId}: CRM must register entityConnectorRoutes under /api/connector`);
    }
    return errors;
  }
  for (const segment of segments) {
    const needle = `/api/connector/${segment}`;
    if (!source.includes(needle)) {
      errors.push(`${hostAppId}: server missing connector route prefix ${needle}`);
    }
  }
  return errors;
}

/**
 * Static gate: every golden integration host that exposes connector segments registers HTTP routes.
 * Catches defects like Chart Builder calling registerCatalogConnectors (no-op outside Wave C catalog).
 */
export function verifyIntegrationConnectorRoutes(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const [hostAppId, manifest] of ALL_MANIFEST_HOSTS) {
    if (seen.has(hostAppId)) {
      continue;
    }
    seen.add(hostAppId);

    const segments = connectorSegments(manifest);
    if (segments.length === 0) {
      continue;
    }

    const source = readServerSource(hostAppId);
    if (source == null) {
      if (PLATFORM_CATALOG_MANIFEST_SEEDS.some(([id]) => id === hostAppId)) {
        continue;
      }
      errors.push(`${hostAppId}: no back-end/server.ts — cannot serve integrationServices connectors`);
      continue;
    }

    if (CATALOG_HOST_APP_IDS.includes(hostAppId)) {
      errors.push(...verifyCatalogHostRegistration(hostAppId, source));
      continue;
    }

    if (MANIFEST_REGISTER_HOSTS.some(([id]) => id === hostAppId)) {
      errors.push(...verifyManifestHostRegistration(hostAppId, source));
      continue;
    }

    if (CUSTOM_CONNECTOR_HOST_IDS.has(hostAppId)) {
      errors.push(...verifyCustomHostRegistration(hostAppId, source, segments));
      continue;
    }

    errors.push(
      `${hostAppId}: has integrationServices connectors but no registered wiring strategy (catalog / manifest / custom)`,
    );
  }

  return errors;
}
