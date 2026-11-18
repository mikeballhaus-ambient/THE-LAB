import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LAB_DOMAIN_EVENT_CATALOG } from '@/shared/lab-domain-events/aggregate-domain-event-catalog';
import { LAB_DOMAIN_EVENT_MANIFESTS } from '@/shared/lab-domain-events/domain-event-manifest-index';

/**
 * A catalog entry is a promise that something emits it. This guard is what makes that promise
 * breakable only in CI rather than silently in production.
 *
 * The failure it prevents is the one no other layer can see: a workflow built on a declared event
 * saves cleanly, validates cleanly (the type *is* in the catalog), and then never fires. There is no
 * runtime error to grep for — only absence.
 *
 * The check is deliberately textual and narrow. It looks in the owning app's `back-end/` for a
 * `publishLabDomainEvent` call whose `type:` is built from the entry's three segments. That is
 * exactly the shape every publisher uses, so a false negative means the publisher does not follow
 * the convention — which is also worth failing on.
 */

// Jest runs from the repo root (see jest.env.setup.ts, which pins DATABASE_PATH the same way).
const APPS_ROOT = join(process.cwd(), 'src', 'apps');

/**
 * Registry ids carry an `app-` prefix that app folders do not (`app-okr-goals` →
 * `src/apps/okr-goals`). Try both so a future app that keeps the prefix still resolves.
 */
function resolveAppBackendDir(appId: string): string | null {
  const candidates = [join(APPS_ROOT, appId, 'back-end'), join(APPS_ROOT, appId.replace(/^app-/, ''), 'back-end')];
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** Source files under `dir`, recursively. */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      out.push(...collectSourceFiles(full));
      continue;
    }
    if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** `app-expense-reports.expense.approved` → `['app-expense-reports', 'expense', 'approved']`. */
function splitEventType(eventType: string): [string, string, string] {
  const firstDot = eventType.indexOf('.');
  const lastDot = eventType.lastIndexOf('.');
  return [
    eventType.slice(0, firstDot),
    eventType.slice(firstDot + 1, lastDot),
    eventType.slice(lastDot + 1),
  ];
}

interface PublisherScan {
  appId: string;
  source: string;
}

function readAppBackendSource(appId: string): PublisherScan {
  const backendDir = resolveAppBackendDir(appId);
  const source = backendDir
    ? collectSourceFiles(backendDir)
        .map((file) => readFileSync(file, 'utf8'))
        .join('\n')
    : '';
  return { appId, source };
}

const backendSourceByApp = new Map<string, string>();

function publishersFor(appId: string): string {
  const cached = backendSourceByApp.get(appId);
  if (cached !== undefined) {
    return cached;
  }
  const { source } = readAppBackendSource(appId);
  backendSourceByApp.set(appId, source);
  return source;
}

function assertCatalogAppPublishers(entries: readonly (typeof LAB_DOMAIN_EVENT_CATALOG)[number][]): string[] {
  const missing: string[] = [];
  for (const entry of entries) {
    if (entry.publisherKind === 'platform') {
      continue;
    }
    const [sourceAppId, entity, action] = splitEventType(entry.eventType);
    const source = publishersFor(entry.sourceAppId);
    const buildsType =
      source.includes(`buildLabEventType('${sourceAppId}', '${entity}', '${action}')`) ||
      source.includes(`buildLabEventType("${sourceAppId}", "${entity}", "${action}")`) ||
      source.includes(`'${entry.eventType}'`) ||
      source.includes(`"${entry.eventType}"`);
    if (!buildsType || !source.includes('publishLabDomainEvent(')) {
      missing.push(entry.eventType);
    }
  }
  return missing;
}

describe('lab domain event publishers', () => {
  test.each(LAB_DOMAIN_EVENT_MANIFESTS.map((manifest, index) => [index, manifest] as const))(
    'manifest %i catalog-app entries have backend publishers',
    (_index, manifest) => {
      expect(assertCatalogAppPublishers(manifest)).toEqual([]);
    },
  );

  test('every catalog entry has a publisher in its owning app back-end', () => {
    expect(assertCatalogAppPublishers(LAB_DOMAIN_EVENT_CATALOG)).toEqual([]);
  });

  test('a time-derived event is catalogued as a platform publisher, never as an app publisher', () => {
    // These are delivered by the requirement sweep. Cataloguing one as `catalog-app` would make the
    // publisher guard above demand a `publishLabDomainEvent` call that no route can make, and would
    // invite the next person to add a per-app clock.
    const timeDerived = [
      'app-home-maintenance.maintenance.due',
      'app-home-maintenance.maintenance.overdue',
      'app-rental-property.rent.late',
      'app-rental-property.lease.expiring',
      'app-knowledge-base.article.review_due',
      'app-onboarding-checklist.task.overdue',
      'app-training-quizzes.cert.expiring',
    ];
    const byType = new Map(LAB_DOMAIN_EVENT_CATALOG.map((entry) => [entry.eventType, entry]));

    for (const eventType of timeDerived) {
      expect(byType.get(eventType)?.publisherKind).toBe('platform');
    }
  });

  test('the guard resolves a real app directory for every catalog-app entry', () => {
    // Guards against a typo in `sourceAppId` silently passing the scan above against an empty
    // string — an empty source would otherwise look like "no publisher" and mask the real problem.
    for (const entry of LAB_DOMAIN_EVENT_CATALOG) {
      if (entry.publisherKind === 'platform') {
        continue;
      }
      expect(publishersFor(entry.sourceAppId).length).toBeGreaterThan(0);
    }
  });
});
