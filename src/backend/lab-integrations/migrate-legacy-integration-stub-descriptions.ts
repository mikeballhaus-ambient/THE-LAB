import { AppDatabaseServiceProxy as FormsBuilderDbProxy } from '@/apps/lab-formsbuilder/db/app-db-service';
import { AppDatabaseServiceProxy as ChartBuilderDbProxy } from '@/apps/lab-chartbuilder/db/app-db-service';
import {
  buildIntegrationStubFormDescription,
  INTEGRATION_STUB_DESCRIPTION_MARKER,
  LEGACY_RM64_STUB_DESCRIPTION_MARKER,
} from '@/shared/lab-integrations/integration-stub-markers';

export type MigrateLegacyStubDescriptionsResult = {
  formsScanned: number;
  formsUpdated: number;
  chartsScanned: number;
  chartsUpdated: number;
  dryRun: boolean;
};

/**
 * Rewrite user-visible stub descriptions that still embed roadmap ids (rm-67.1).
 * Returns `null` when no change is needed.
 */
export function rewriteLegacyStubDescription(description: string | null | undefined): string | null {
  const d = (description ?? '').trim();
  if (!d) {
    return null;
  }

  const hasLegacyParen = d.includes(LEGACY_RM64_STUB_DESCRIPTION_MARKER);
  const hasRoadmapParen = /\(\s*rm-\d+(?:\.\d+)?\s*\)/i.test(d);
  if (!hasLegacyParen && !hasRoadmapParen) {
    return null;
  }

  const stubFormMatch = /^Stub form for (.+) \(rm-64\)$/i.exec(d);
  if (stubFormMatch) {
    return buildIntegrationStubFormDescription(stubFormMatch[1].trim());
  }

  if (hasLegacyParen) {
    return d.replaceAll(LEGACY_RM64_STUB_DESCRIPTION_MARKER, INTEGRATION_STUB_DESCRIPTION_MARKER);
  }

  return d.replace(/\(\s*rm-\d+(?:\.\d+)?\s*\)/gi, INTEGRATION_STUB_DESCRIPTION_MARKER);
}

type FormRow = { id: number; description: string | null };
type ChartRow = { chart_key: string; description: string | null };

export async function migrateLegacyIntegrationStubDescriptions(options?: {
  dryRun?: boolean;
}): Promise<MigrateLegacyStubDescriptionsResult> {
  const dryRun = options?.dryRun ?? false;
  const result: MigrateLegacyStubDescriptionsResult = {
    formsScanned: 0,
    formsUpdated: 0,
    chartsScanned: 0,
    chartsUpdated: 0,
    dryRun,
  };

  await FormsBuilderDbProxy.getInstance().initialize();
  const formsProxy = FormsBuilderDbProxy.getInstance();
  const formsRepo = formsProxy.getFormsRepository();
  const formsDb = formsProxy.getDb();

  const formRows = formsDb
    .prepare(`SELECT id, description FROM forms WHERE description LIKE '%rm-%'`)
    .all() as FormRow[];
  result.formsScanned = formRows.length;

  for (const row of formRows) {
    const next = rewriteLegacyStubDescription(row.description);
    if (!next || next === (row.description ?? '').trim()) {
      continue;
    }
    if (dryRun) {
      result.formsUpdated += 1;
      continue;
    }
    await formsRepo.update(row.id, { description: next });
    result.formsUpdated += 1;
  }

  try {
    await ChartBuilderDbProxy.getInstance().initialize();
    const chartsDb = ChartBuilderDbProxy.getInstance().getDb();
    const chartsRepo = ChartBuilderDbProxy.getInstance().getChartsRepository();

    const chartRows = chartsDb
      .prepare(`SELECT chart_key, description FROM charts WHERE description LIKE '%rm-%'`)
      .all() as ChartRow[];
    result.chartsScanned = chartRows.length;

    for (const row of chartRows) {
      const next = rewriteLegacyStubDescription(row.description);
      if (!next || next === (row.description ?? '').trim()) {
        continue;
      }
      if (dryRun) {
        result.chartsUpdated += 1;
        continue;
      }
      chartsRepo.update(row.chart_key, { description: next });
      result.chartsUpdated += 1;
    }
  } catch (err) {
    console.warn('[migrate-legacy-stub-descriptions] Chart Builder skipped:', err);
  }

  return result;
}
