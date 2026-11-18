/**
 * Registry specs for the catalogue apps that `seedApps` does not cover.
 *
 * `seedApps` only runs when the `apps` table is empty, and it never contained the catalogue
 * games or the Wave C catalog apps. Those were registered historically by one-off scripts —
 * which means a fresh clone had folders on disk and no rows, and the old `pre-bootstrap`
 * orphan sweeper then deleted the folders.
 *
 * This module is the single source of truth for both:
 *   - `AppsRepository.ensureCatalogAppsRegistered()` — inserts missing rows on every boot
 *   - `src/scripts/register-game-apps-once.ts` / `register-catalog-apps-once.ts`
 *
 * Kept as plain data so the repository can insert without importing app internals.
 */
import { solitaireAppInstructions } from '@/backend/db/Apps/app-instructions/solitaire-app-instructions';
import { wordTileAppInstructions } from '@/backend/db/Apps/app-instructions/word-tile-app-instructions';
import {
  battleshipAppInstructions,
  checkersAppInstructions,
  chessAppInstructions,
  connectFourAppInstructions,
  hangmanAppInstructions,
  pokerHoldemAppInstructions,
  ticTacToeAppInstructions,
  blackjackAppInstructions,
} from '@/backend/db/Apps/app-instructions/shared-games-app-instructions';
import { billiardsAppInstructions } from '@/backend/db/Apps/app-instructions/billiards-app-instructions';
import { okrGoalsAppInstructions } from '@/backend/db/Apps/app-instructions/okr-goals-app-instructions';
import { travelItineraryAppInstructions } from '@/backend/db/Apps/app-instructions/travel-itinerary-app-instructions';
import { projectCharterAppInstructions } from '@/backend/db/Apps/app-instructions/project-charter-app-instructions';
import { timeTrackingAppInstructions } from '@/backend/db/Apps/app-instructions/time-tracking-app-instructions';
import { jobApplicantTrackerAppInstructions } from '@/backend/db/Apps/app-instructions/job-applicant-tracker-app-instructions';
import { suggestionBoxAppInstructions } from '@/backend/db/Apps/app-instructions/suggestion-box-app-instructions';
import { expenseReportsAppInstructions } from '@/backend/db/Apps/app-instructions/expense-reports-app-instructions';
import { trainingQuizzesAppInstructions } from '@/backend/db/Apps/app-instructions/training-quizzes-app-instructions';
import { onboardingChecklistAppInstructions } from '@/backend/db/Apps/app-instructions/onboarding-checklist-app-instructions';
import { weatherDashboardAppInstructions } from '@/backend/db/Apps/app-instructions/weather-dashboard-app-instructions';
import { homeMaintenanceAppInstructions } from '@/backend/db/Apps/app-instructions/home-maintenance-app-instructions';
import { rentalPropertyAppInstructions } from '@/backend/db/Apps/app-instructions/rental-property-app-instructions';
import { eventRsvpAppInstructions } from '@/backend/db/Apps/app-instructions/event-rsvp-app-instructions';
import { pollsSurveysAppInstructions } from '@/backend/db/Apps/app-instructions/polls-surveys-app-instructions';

export interface CatalogAppRegistrationSpec {
  id: string;
  /** Folder under `src/apps/`; also the AppDatabaseService host id. */
  slug: string;
  name: string;
  description: string;
  order: number;
  faIcon: string;
  port: number;
  instructions: string;
  /** Platform catalogue tag id (`platform_app_tags`). */
  tag: string;
  /** Game apps use an immutable `games` tag and are grouped separately in the lobby. */
  isGame?: boolean;
}

/** Registry + catalog subtitle for Solitaire (no lab-wide leaderboard). */
export const SOLITAIRE_APP_DESCRIPTION =
  'Klondike solitaire — beat your personal best time and move count.';

export const GAME_APP_SPECS: CatalogAppRegistrationSpec[] = [
  {
    id: 'app-solitaire',
    slug: 'solitaire',
    name: 'Solitaire',
    description: SOLITAIRE_APP_DESCRIPTION,
    order: 21,
    faIcon: 'fa-clone',
    port: 4101,
    instructions: solitaireAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-word-tile',
    slug: 'word-tile',
    name: 'Word Tile',
    description: 'Turn-based tile word grid — vs Lab Assistant or invite a friend.',
    order: 22,
    faIcon: 'fa-table-cells-large',
    port: 4102,
    instructions: wordTileAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-checkers',
    slug: 'checkers',
    name: 'Checkers',
    description: 'Checkers — vs Lab Assistant or friend.',
    order: 23,
    faIcon: 'fa-chess-board',
    port: 4103,
    instructions: checkersAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-chess',
    slug: 'chess',
    name: 'Chess',
    description: 'Chess — vs Lab Assistant or friend.',
    order: 24,
    faIcon: 'fa-chess',
    port: 4104,
    instructions: chessAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-hangman',
    slug: 'hangman',
    name: 'Hangman',
    description: 'Hangman — guess the word.',
    order: 25,
    faIcon: 'fa-user-secret',
    port: 4105,
    instructions: hangmanAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-connect-four',
    slug: 'connect-four',
    name: 'Connect Four',
    description: 'Connect Four.',
    order: 26,
    faIcon: 'fa-circle',
    port: 4106,
    instructions: connectFourAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-battleship',
    slug: 'battleship',
    name: 'Battleship',
    description: 'Battleship — sink the fleet.',
    order: 27,
    faIcon: 'fa-ship',
    port: 4107,
    instructions: battleshipAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-poker-holdem',
    slug: 'poker-holdem',
    name: "Texas Hold'em",
    description: "Heads-up Texas Hold'em — play money.",
    order: 28,
    faIcon: 'fa-diamond',
    port: 4108,
    instructions: pokerHoldemAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-tic-tac-toe',
    slug: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Tic-Tac-Toe — local and vs friend.',
    order: 29,
    faIcon: 'fa-xmark',
    port: 4109,
    instructions: ticTacToeAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-blackjack',
    slug: 'blackjack',
    name: 'Blackjack',
    description: 'Blackjack — you vs the dealer, or heads-up vs a friend.',
    order: 30,
    faIcon: 'fa-heart',
    port: 4117,
    instructions: blackjackAppInstructions,
    tag: 'games',
    isGame: true,
  },
  {
    id: 'app-billiards',
    slug: 'billiards',
    name: 'Billiards',
    description: 'Practice table — rack, place balls, and shoot; 8-ball vs friend or Lab Assistant coming soon.',
    order: 31,
    faIcon: 'fa-circle',
    port: 4119,
    instructions: billiardsAppInstructions,
    tag: 'games',
    isGame: true,
  },
];

/** Wave C catalog apps (rm-64 phases 21–24). Ports match each app's own instructions. */
export const CATALOG_APP_SPECS: CatalogAppRegistrationSpec[] = [
  {
    id: 'app-okr-goals',
    slug: 'okr-goals',
    name: 'OKR / Goals',
    description: 'Objectives and key results with derived progress.',
    order: 30,
    faIcon: 'fa-bullseye',
    port: 4110,
    instructions: okrGoalsAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-travel-itinerary',
    slug: 'travel-itinerary',
    name: 'Travel Itinerary',
    description: 'Trips and their itinerary items.',
    order: 31,
    faIcon: 'fa-plane',
    port: 4111,
    instructions: travelItineraryAppInstructions,
    tag: 'utilities',
  },
  {
    id: 'app-project-charter',
    slug: 'project-charter',
    name: 'Project Charter',
    description: 'Project charters: scope, stakeholders and goals.',
    order: 32,
    faIcon: 'fa-scroll',
    port: 4112,
    instructions: projectCharterAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-time-tracking',
    slug: 'time-tracking',
    name: 'Time Tracking',
    description: 'Log time against projects with weekly summaries.',
    order: 33,
    faIcon: 'fa-clock',
    port: 4113,
    instructions: timeTrackingAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-job-applicant-tracker',
    slug: 'job-applicant-tracker',
    name: 'Job Applicant Tracker',
    description: 'Candidate pipeline from applied to hired.',
    order: 34,
    faIcon: 'fa-user-tie',
    port: 4114,
    instructions: jobApplicantTrackerAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-suggestion-box',
    slug: 'suggestion-box',
    name: 'Suggestion Box',
    description: 'Collect ideas, track status and count votes.',
    order: 35,
    faIcon: 'fa-lightbulb',
    port: 4115,
    instructions: suggestionBoxAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-expense-reports',
    slug: 'expense-reports',
    name: 'Expense Reports',
    description: 'Submit and track expenses through reimbursement.',
    order: 36,
    faIcon: 'fa-receipt',
    port: 4116,
    instructions: expenseReportsAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-training-quizzes',
    slug: 'training-quizzes',
    name: 'Training & Quizzes',
    description: 'Quizzes with questions and scored attempts.',
    order: 37,
    faIcon: 'fa-graduation-cap',
    port: 4118,
    instructions: trainingQuizzesAppInstructions,
    tag: 'learning',
  },
  {
    id: 'app-onboarding-checklist',
    slug: 'onboarding-checklist',
    name: 'Onboarding Checklist',
    description: 'Per-hire onboarding checklists with task progress.',
    order: 38,
    faIcon: 'fa-list-check',
    port: 4119,
    instructions: onboardingChecklistAppInstructions,
    tag: 'learning',
  },
  {
    id: 'app-weather-dashboard',
    slug: 'weather-dashboard',
    name: 'Weather Dashboard',
    description: 'Live current conditions for your saved locations.',
    order: 39,
    faIcon: 'fa-cloud-sun',
    port: 4120,
    instructions: weatherDashboardAppInstructions,
    tag: 'utilities',
  },
  {
    id: 'app-home-maintenance',
    slug: 'home-maintenance',
    name: 'Home Maintenance',
    description: 'Household assets and their maintenance tasks.',
    order: 40,
    faIcon: 'fa-house-chimney',
    port: 4121,
    instructions: homeMaintenanceAppInstructions,
    tag: 'utilities',
  },
  {
    id: 'app-rental-property',
    slug: 'rental-property',
    name: 'Rental Property',
    description: 'Properties, leases and rent payments.',
    order: 41,
    faIcon: 'fa-building',
    port: 4122,
    instructions: rentalPropertyAppInstructions,
    tag: 'utilities',
  },
  {
    id: 'app-event-rsvp',
    slug: 'event-rsvp',
    name: 'Event RSVP',
    description: 'Events and guest responses with headcounts.',
    order: 42,
    faIcon: 'fa-calendar-check',
    port: 4123,
    instructions: eventRsvpAppInstructions,
    tag: 'creative',
  },
  {
    id: 'app-polls-surveys',
    slug: 'polls-surveys',
    name: 'Polls & Surveys',
    description: 'Polls with options and votes, single or multi choice.',
    order: 43,
    faIcon: 'fa-square-poll-vertical',
    port: 4124,
    instructions: pollsSurveysAppInstructions,
    tag: 'creative',
  },
];

export const ALL_CATALOG_APP_SPECS: CatalogAppRegistrationSpec[] = [
  ...GAME_APP_SPECS,
  ...CATALOG_APP_SPECS,
];
