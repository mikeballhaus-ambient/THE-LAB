import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  discoverDomainEventManifests,
  parseManifestIndexImportPaths,
} from './discover-domain-event-manifests';
import {
  LAB_DOMAIN_EVENT_MANIFESTS,
  mergeLabDomainEventManifests,
} from './domain-event-manifest-index';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

export interface VerifyDomainEventManifestPackResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    manifestFiles: number;
    catalogEntries: number;
  };
}

function validateEntryShape(entry: LabDomainEventCatalogEntry, context: string): string[] {
  const issues: string[] = [];
  if (!entry.eventType.startsWith(`${entry.sourceAppId}.`)) {
    issues.push(`${context}: eventType must start with sourceAppId prefix (${entry.eventType})`);
  }
  if (entry.eventType.split('.').length < 3) {
    issues.push(`${context}: eventType must have at least three segments (${entry.eventType})`);
  }
  if (!entry.label.trim() || !entry.description.trim()) {
    issues.push(`${context}: label and description are required (${entry.eventType})`);
  }
  return issues;
}

export function verifyDomainEventManifestPack(repoRoot: string = process.cwd()): VerifyDomainEventManifestPackResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const discovered = discoverDomainEventManifests(repoRoot);
  const discoveredPaths = new Set(discovered.map((d) => d.repoPath));

  const indexPath = join(repoRoot, 'src/shared/lab-domain-events/domain-event-manifest-index.ts');
  const indexSource = readFileSync(indexPath, 'utf8');
  const indexedPaths = new Set(parseManifestIndexImportPaths(indexSource));

  for (const path of discoveredPaths) {
    if (!indexedPaths.has(path)) {
      errors.push(`Manifest on disk is not registered in domain-event-manifest-index.ts: ${path}`);
    }
  }
  for (const path of indexedPaths) {
    if (!discoveredPaths.has(path)) {
      errors.push(`domain-event-manifest-index.ts imports missing file: ${path}`);
    }
  }

  if (LAB_DOMAIN_EVENT_MANIFESTS.length !== discovered.length) {
    errors.push(
      `LAB_DOMAIN_EVENT_MANIFESTS length (${LAB_DOMAIN_EVENT_MANIFESTS.length}) != discovered files (${discovered.length})`,
    );
  }

  let merged: readonly LabDomainEventCatalogEntry[];
  try {
    merged = mergeLabDomainEventManifests();
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { ok: false, errors, warnings, stats: { manifestFiles: discovered.length, catalogEntries: 0 } };
  }

  for (const manifest of LAB_DOMAIN_EVENT_MANIFESTS) {
    for (const entry of manifest) {
      errors.push(...validateEntryShape(entry, 'manifest entry'));
    }
  }

  for (const row of discovered) {
    if (row.ownerId === 'platform') {
      continue;
    }
    const manifest = LAB_DOMAIN_EVENT_MANIFESTS.find((m) =>
      m.some((e) => e.sourceAppId === row.ownerId),
    );
    if (!manifest) {
      warnings.push(`No manifest entries for ${row.ownerId} (${row.repoPath})`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      manifestFiles: discovered.length,
      catalogEntries: merged.length,
    },
  };
}