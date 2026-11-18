/**

 * Default platform app tag catalog (seed ids)

 */

export const PLATFORM_APP_TAG_CATALOG = [

  { id: 'platform', label: 'Platform', description: 'Core platform tools and utilities', sortOrder: 1, isSystem: true },

  { id: 'productivity', label: 'Productivity', description: 'Apps for getting work done', sortOrder: 2, isSystem: true },

  { id: 'builder', label: 'Builder', description: 'App builders and form creators', sortOrder: 3, isSystem: true },

  { id: 'games', label: 'Games', description: 'Fun and entertainment apps', sortOrder: 4, isSystem: true },

  { id: 'utilities', label: 'Utilities', description: 'Helper tools and utilities', sortOrder: 5, isSystem: true },

  { id: 'examples', label: 'Examples', description: 'Example apps and demos', sortOrder: 6, isSystem: true },

  { id: 'learning', label: 'Learning', description: 'Knowledge, training and onboarding apps', sortOrder: 7, isSystem: true },

  { id: 'creative', label: 'Creative', description: 'Events, polls and expressive apps', sortOrder: 8, isSystem: true },

] as const;



export type PlatformAppTagId = (typeof PLATFORM_APP_TAG_CATALOG)[number]['id'];



/**

 * Seed data for platform app tags - used during repository initialization

 */

export const PLATFORM_APP_TAG_SEEDS = PLATFORM_APP_TAG_CATALOG.map((tag) => ({

  id: tag.id,

  label: tag.label,

  description: tag.description,

  sortOrder: tag.sortOrder,

}));



/**

 * Default app-to-tag assignments (position 0 = primary tag).

 * Keys must match `apps.id` in SQLite (e.g. `app-word-tile`).

 * @see plans/rm-51-5/IMPLEMENTATION-PLAN.md

 */

export const SEEDED_APP_TAG_ASSIGNMENTS: Record<string, Record<number, PlatformAppTagId>> = {

  'app-lab-crm': { 0: 'platform', 1: 'productivity' },

  'app-lab-helpdesk': { 0: 'platform', 1: 'productivity' },

  'app-lab-tasklist': { 0: 'platform', 1: 'productivity' },

  'app-lab-chartbuilder': { 0: 'platform', 1: 'builder' },

  'app-lab-formsbuilder': { 0: 'platform', 1: 'builder' },

  'app-solitaire': { 0: 'games' },

  'app-word-tile': { 0: 'games' },

  'app-checkers': { 0: 'games' },

  'app-chess': { 0: 'games' },

  'app-hangman': { 0: 'games' },

  'app-connect-four': { 0: 'games' },

  'app-battleship': { 0: 'games' },

  'app-poker-holdem': { 0: 'games' },

  'app-tic-tac-toe': { 0: 'games' },

  'app-blackjack': { 0: 'games' },
  'app-billiards': { 0: 'games' },

  'app-ai-tunes': { 0: 'utilities' },

  'app-dnd-examples': { 0: 'examples' },

  'app-ui-component-gallery': { 0: 'examples' },

  'app-example-server': { 0: 'examples' },

  'app-lab-workflow-studio': { 0: 'platform' },
  'app-lab-approvals-policies': { 0: 'platform' },
  'app-lab-financial-ledger': { 0: 'platform' },
  'app-lab-app-builder': { 0: 'platform', 1: 'builder' },

  'app-weather-dashboard': { 0: 'utilities' },
  'app-home-maintenance': { 0: 'utilities' },
  'app-rental-property': { 0: 'utilities' },

  'app-okr-goals': { 0: 'productivity' },
  'app-travel-itinerary': { 0: 'productivity' },
  'app-project-charter': { 0: 'productivity' },
  'app-time-tracking': { 0: 'productivity' },
  'app-job-applicant-tracker': { 0: 'productivity' },
  'app-suggestion-box': { 0: 'productivity' },
  'app-expense-reports': { 0: 'productivity' },

  'app-knowledge-base': { 0: 'learning' },
  'app-training-quizzes': { 0: 'learning' },
  'app-onboarding-checklist': { 0: 'learning' },

  'app-event-rsvp': { 0: 'creative' },
  'app-polls-surveys': { 0: 'creative' },
};
