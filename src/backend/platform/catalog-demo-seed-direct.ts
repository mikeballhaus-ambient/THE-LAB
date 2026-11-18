import type { Database } from 'better-sqlite3';
import type { AppSeedOperationResult, AppSeedPackStatus } from '@/shared/types/app/app-seed-data';
import { catalogDemoSeedPackFor } from '@/shared/config/catalog-demo-seed-packs';
import { syncAppSeedBootFlagForPack } from '@/shared/config/app-seed-boot-flags';

/**
 * Settings → App demo data dispatcher for the 15 Wave C catalog demo packs.
 *
 * Each app's `seed-*-demo.ts` exposes the same four-function shape:
 * `has*`, `seed*IfMissing`, `remove*` and a pack-id constant. This module is the single
 * place that maps a registry app id onto those functions, so
 * `app-seed-data-direct.ts` stays a thin switch and the per-app modules never import
 * platform code.
 *
 * Runs against the on-disk app SQLite file — no app server required.
 */

export interface CatalogDemoSeedAdapter {
  has(db: Database): boolean;
  seed(db: Database, options?: { adminApply?: boolean }): { inserted: number };
  remove(db: Database): number;
}

let adaptersPromise: Promise<Map<string, CatalogDemoSeedAdapter>> | null = null;

/**
 * Load the adapters lazily.
 *
 * Static imports would pull all 15 app modules into every backend start; the dynamic
 * import keeps Settings-only code paths off the boot path. Cached for the process.
 */
async function loadAdapters(): Promise<Map<string, CatalogDemoSeedAdapter>> {
  if (!adaptersPromise) {
    adaptersPromise = (async () => {
      const [
        okr,
        travel,
        charter,
        timeTracking,
        applicant,
        suggestion,
        expense,
        knowledgeBase,
        quiz,
        onboarding,
        weather,
        home,
        rental,
        rsvp,
        polls,
      ] = await Promise.all([
        import('@/apps/okr-goals/back-end/db/seed-okr-goals-demo'),
        import('@/apps/travel-itinerary/back-end/db/seed-travel-demo'),
        import('@/apps/project-charter/back-end/db/seed-charter-demo'),
        import('@/apps/time-tracking/back-end/db/seed-time-tracking-demo'),
        import('@/apps/job-applicant-tracker/back-end/db/seed-applicant-demo'),
        import('@/apps/suggestion-box/back-end/db/seed-suggestion-demo'),
        import('@/apps/expense-reports/back-end/db/seed-expense-demo'),
        import('@/apps/knowledge-base/back-end/db/seed-kb-demo'),
        import('@/apps/training-quizzes/back-end/db/seed-quiz-demo'),
        import('@/apps/onboarding-checklist/back-end/db/seed-onboarding-demo'),
        import('@/apps/weather-dashboard/back-end/db/seed-weather-demo'),
        import('@/apps/home-maintenance/back-end/db/seed-home-demo'),
        import('@/apps/rental-property/back-end/db/seed-rental-demo'),
        import('@/apps/event-rsvp/back-end/db/seed-rsvp-demo'),
        import('@/apps/polls-surveys/back-end/db/seed-polls-demo'),
      ]);

      const entries: Array<[string, CatalogDemoSeedAdapter]> = [
        [
          'app-okr-goals',
          {
            has: okr.hasOkrGoalsDemoDataset,
            seed: okr.seedOkrGoalsDemoIfMissing,
            remove: okr.removeOkrGoalsDemo,
          },
        ],
        [
          'app-travel-itinerary',
          {
            has: travel.hasTravelDemoDataset,
            seed: travel.seedTravelDemoIfMissing,
            remove: travel.removeTravelDemo,
          },
        ],
        [
          'app-project-charter',
          {
            has: charter.hasCharterDemoDataset,
            seed: charter.seedCharterDemoIfMissing,
            remove: charter.removeCharterDemo,
          },
        ],
        [
          'app-time-tracking',
          {
            has: timeTracking.hasTimeTrackingDemoDataset,
            seed: timeTracking.seedTimeTrackingDemoIfMissing,
            remove: timeTracking.removeTimeTrackingDemo,
          },
        ],
        [
          'app-job-applicant-tracker',
          {
            has: applicant.hasApplicantDemoDataset,
            seed: applicant.seedApplicantDemoIfMissing,
            remove: applicant.removeApplicantDemo,
          },
        ],
        [
          'app-suggestion-box',
          {
            has: suggestion.hasSuggestionDemoDataset,
            seed: suggestion.seedSuggestionDemoIfMissing,
            remove: suggestion.removeSuggestionDemo,
          },
        ],
        [
          'app-expense-reports',
          {
            has: expense.hasExpenseDemoDataset,
            seed: expense.seedExpenseDemoIfMissing,
            remove: expense.removeExpenseDemo,
          },
        ],
        [
          'app-knowledge-base',
          {
            has: knowledgeBase.hasKbDemoDataset,
            seed: knowledgeBase.seedKbDemoIfMissing,
            remove: knowledgeBase.removeKbDemo,
          },
        ],
        [
          'app-training-quizzes',
          {
            has: quiz.hasQuizDemoDataset,
            seed: quiz.seedQuizDemoIfMissing,
            remove: quiz.removeQuizDemo,
          },
        ],
        [
          'app-onboarding-checklist',
          {
            has: onboarding.hasOnboardingDemoDataset,
            seed: onboarding.seedOnboardingDemoIfMissing,
            remove: onboarding.removeOnboardingDemo,
          },
        ],
        [
          'app-weather-dashboard',
          {
            has: weather.hasWeatherDemoDataset,
            seed: weather.seedWeatherDemoIfMissing,
            remove: weather.removeWeatherDemo,
          },
        ],
        [
          'app-home-maintenance',
          {
            has: home.hasHomeDemoDataset,
            seed: home.seedHomeDemoIfMissing,
            remove: home.removeHomeDemo,
          },
        ],
        [
          'app-rental-property',
          {
            has: rental.hasRentalDemoDataset,
            seed: rental.seedRentalDemoIfMissing,
            remove: rental.removeRentalDemo,
          },
        ],
        [
          'app-event-rsvp',
          {
            has: rsvp.hasRsvpDemoDataset,
            seed: rsvp.seedRsvpDemoIfMissing,
            remove: rsvp.removeRsvpDemo,
          },
        ],
        [
          'app-polls-surveys',
          {
            has: polls.hasPollsDemoDataset,
            seed: polls.seedPollsDemoIfMissing,
            remove: polls.removePollsDemo,
          },
        ],
      ];

      return new Map(entries);
    })();
  }
  return adaptersPromise;
}

/** True when the app id owns a catalog demo pack (and therefore a direct handler). */
export function isCatalogDemoSeedAppId(appId: string): boolean {
  return catalogDemoSeedPackFor(appId) !== undefined;
}

/** Status for the Settings UI. */
export async function getCatalogDemoSeedStatus(
  db: Database,
  appId: string,
): Promise<AppSeedPackStatus[]> {
  const pack = catalogDemoSeedPackFor(appId);
  if (!pack) {
    return [];
  }
  const adapters = await loadAdapters();
  const adapter = adapters.get(appId);
  const present = adapter ? adapter.has(db) : false;
  return [
    {
      packId: pack.packId,
      present,
      rowCount: present ? 1 : 0,
      serverReachable: true,
      message: present
        ? undefined
        : 'Demo pack not applied — use Apply to add sample records (your records are kept).',
    },
  ];
}

/** Apply or remove a catalog demo pack against the on-disk app DB. */
export async function executeCatalogDemoSeedPack(
  db: Database,
  appId: string,
  packId: string,
  action: 'apply' | 'remove',
): Promise<AppSeedOperationResult> {
  const pack = catalogDemoSeedPackFor(appId);
  if (!pack || pack.packId !== packId) {
    return { success: false, content: `Unknown pack: ${packId}` };
  }

  const adapters = await loadAdapters();
  const adapter = adapters.get(appId);
  if (!adapter) {
    return { success: false, content: `No demo seed adapter registered for ${appId}` };
  }

  try {
    if (action === 'remove') {
      const removed = adapter.remove(db);
      syncAppSeedBootFlagForPack(db, appId, packId, true);
      return {
        success: true,
        content:
          removed > 0
            ? `Removed ${removed} demo record(s). Your own records were not changed.`
            : 'No demo dataset was present.',
      };
    }

    // Admin apply is an explicit intent — clear the suppression flag first.
    syncAppSeedBootFlagForPack(db, appId, packId, false);
    const { inserted } = adapter.seed(db, { adminApply: true });
    const present = adapter.has(db);
    if (present) {
      syncAppSeedBootFlagForPack(db, appId, packId, false);
    }
    return {
      success: present,
      content: inserted > 0
        ? `Inserted ${inserted} demo record(s).`
        : present
          ? 'Demo data is already present.'
          : 'Demo seed did not apply — check server logs.',
    };
  } catch (err) {
    return {
      success: false,
      content: err instanceof Error ? err.message : 'Demo seed action failed',
    };
  }
}
