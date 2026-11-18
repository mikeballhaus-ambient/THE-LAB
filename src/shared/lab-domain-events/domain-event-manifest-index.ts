import { LAB_DOMAIN_EVENTS_MANIFEST as platformLabDomainEvents } from './platform-lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as homeMaintenanceEvents } from '@/apps/home-maintenance/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as rentalPropertyEvents } from '@/apps/rental-property/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as knowledgeBaseEvents } from '@/apps/knowledge-base/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as onboardingChecklistEvents } from '@/apps/onboarding-checklist/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as trainingQuizzesEvents } from '@/apps/training-quizzes/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as labTasklistEvents } from '@/apps/lab-tasklist/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as labCrmEvents } from '@/apps/lab-crm/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as okrGoalsEvents } from '@/apps/okr-goals/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as projectCharterEvents } from '@/apps/project-charter/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as timeTrackingEvents } from '@/apps/time-tracking/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as expenseReportsEvents } from '@/apps/expense-reports/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as jobApplicantTrackerEvents } from '@/apps/job-applicant-tracker/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as suggestionBoxEvents } from '@/apps/suggestion-box/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as eventRsvpEvents } from '@/apps/event-rsvp/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as pollsSurveysEvents } from '@/apps/polls-surveys/shared/lab-domain-events.manifest';
import { LAB_DOMAIN_EVENTS_MANIFEST as travelItineraryEvents } from '@/apps/travel-itinerary/shared/lab-domain-events.manifest';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

/** Registered manifests in merge order (platform first, then apps alphabetically by import). */
export const LAB_DOMAIN_EVENT_MANIFESTS: readonly (readonly LabDomainEventCatalogEntry[])[] = [
  platformLabDomainEvents,
  homeMaintenanceEvents,
  rentalPropertyEvents,
  knowledgeBaseEvents,
  onboardingChecklistEvents,
  trainingQuizzesEvents,
  labTasklistEvents,
  labCrmEvents,
  okrGoalsEvents,
  projectCharterEvents,
  timeTrackingEvents,
  expenseReportsEvents,
  jobApplicantTrackerEvents,
  suggestionBoxEvents,
  eventRsvpEvents,
  pollsSurveysEvents,
  travelItineraryEvents,
] as const;

export function mergeLabDomainEventManifests(
  manifests: readonly (readonly LabDomainEventCatalogEntry[])[] = LAB_DOMAIN_EVENT_MANIFESTS,
): readonly LabDomainEventCatalogEntry[] {
  const merged: LabDomainEventCatalogEntry[] = [];
  const seen = new Set<string>();
  for (const manifest of manifests) {
    for (const entry of manifest) {
      if (seen.has(entry.eventType)) {
        throw new Error(`Duplicate domain event type across manifests: ${entry.eventType}`);
      }
      seen.add(entry.eventType);
      merged.push(entry);
    }
  }
  return merged;
}