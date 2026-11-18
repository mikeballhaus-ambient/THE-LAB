import { LAB_CATALOG_SECTION_PREVIEW_LIMIT } from '@/shared/constants/lab-catalog-ui';

export type LabSidecarCatalogAppEntry = {
  id: string;
  name: string;
  description: string;
  type: string;
  /** Human-readable catalog category labels (primary tag first). */
  categories: string[];
};

export type LabSidecarCatalogRegistryLayout = 'full-grid' | 'compact-sidebar';

export function formatAppsHomeCatalogRegistry(
  apps: LabSidecarCatalogAppEntry[],
  layout: LabSidecarCatalogRegistryLayout = 'full-grid',
): string {
  if (!apps.length) {
    return '\n### Apps catalog — full registry (enabled)\nNo enabled apps in registry.\n';
  }

  const byCategory = new Map<string, LabSidecarCatalogAppEntry[]>();
  for (const app of apps) {
    const key = app.categories[0] ?? 'Other';
    const bucket = byCategory.get(key) ?? [];
    bucket.push(app);
    byCategory.set(key, bucket);
  }

  const layoutIntro =
    layout === 'compact-sidebar'
      ? [
          'While workspace apps are running, the **full grid is hidden**. Launch targets live in the **app launcher sidebar** (`lab-app-catalog-sidebar` inside `app-list-container`) — scrollable **Launch** rows (`lab-catalog-sidebar-launch`, same `data-app-id` / `searchPattern` as the grid).',
          'If the launcher is collapsed, click **Open app launcher** (`lab-catalog-sidebar-rail`) before discover.',
          '**Minimized/parked** apps use the **running apps rail** (`lab-running-apps-rail`) — **Restore**, not Launch.',
          'Use **exact `name` or registry `id`** from this table in `searchPattern` (or `contextArea: "lab-app-catalog-sidebar"`).',
        ]
      : [
          `The grid shows **at most ${LAB_CATALOG_SECTION_PREVIEW_LIMIT} apps per category** until the user expands **Show all**.`,
          'Cards off-screen still exist — use **exact `name` or registry `id`** from this list in `searchPattern`.',
          'Optional: type the name into **Search apps…** (`contextArea: app-list-container`, toolbar `input.lab-catalog-search`) then discover Launch with `searchPattern`.',
        ];

  const lines: string[] = [
    '',
    '### Apps catalog — full registry (enabled)',
    '',
    ...layoutIntro,
    '',
  ];

  const sortedCategories = [...byCategory.keys()].sort((a, b) => a.localeCompare(b));
  for (const category of sortedCategories) {
    const rows = byCategory.get(category) ?? [];
    rows.sort((a, b) => a.name.localeCompare(b.name));
    lines.push(`#### ${category} (${rows.length})`);
    lines.push('| Display name | Registry id | Type | Description |');
    lines.push('| --- | --- | --- | --- |');
    for (const app of rows) {
      const desc = app.description.replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, 140);
      lines.push(`| ${app.name} | \`${app.id}\` | ${app.type} | ${desc || '—'} |`);
    }
    if (rows.length > LAB_CATALOG_SECTION_PREVIEW_LIMIT) {
      lines.push(
        `> Only the first **${LAB_CATALOG_SECTION_PREVIEW_LIMIT}** are visible in the category row until expanded — launch via **searchPattern** using the table above.`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
