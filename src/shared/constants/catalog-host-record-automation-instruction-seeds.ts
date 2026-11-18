import type { CatalogHostRecordAutomationDoc } from '@/shared/constants/format-catalog-record-automation-instructions';

/** rm-68.2 — catalog hosts with `labRecordActionButtonPt` on primary row edit/delete. */
export const CATALOG_HOST_RECORD_AUTOMATION_INSTRUCTION_SEEDS: readonly CatalogHostRecordAutomationDoc[] =
  [
    {
      appId: 'app-polls-surveys',
      displayName: 'Polls & Surveys',
      contextAreaClass: 'polls-surveys-app',
      primaryRecordLabel: 'poll question',
      extraBullets: [
        'Nested **poll options** use the same data attrs; `data-lab-record-name` is the option label.',
      ],
    },
    {
      appId: 'app-expense-reports',
      displayName: 'Expense Reports',
      contextAreaClass: 'expense-reports-app',
      primaryRecordLabel: 'expense title',
    },
    {
      appId: 'app-suggestion-box',
      displayName: 'Suggestion Box',
      contextAreaClass: 'suggestion-box-app',
      primaryRecordLabel: 'suggestion title',
    },
    {
      appId: 'app-event-rsvp',
      displayName: 'Event RSVP',
      contextAreaClass: 'event-rsvp-app',
      primaryRecordLabel: 'event title',
      extraBullets: [
        '**RSVP responses** under an event use guest name on `data-lab-record-name` (`rsvp-response` prefix).',
      ],
    },
    {
      appId: 'app-onboarding-checklist',
      displayName: 'Onboarding Checklist',
      contextAreaClass: 'onboarding-checklist-app',
      primaryRecordLabel: 'checklist (new hire name)',
      extraBullets: [
        'Nested **tasks** use task title as `data-lab-record-name` (`onboarding-task` id prefix).',
      ],
    },
    {
      appId: 'app-project-charter',
      displayName: 'Project Charter',
      contextAreaClass: 'project-charter-app',
      primaryRecordLabel: 'charter title',
    },
    {
      appId: 'app-rental-property',
      displayName: 'Rental Property',
      contextAreaClass: 'rental-property-app',
      primaryRecordLabel: 'property address',
      extraBullets: [
        'Nested **leases** use tenant name on `data-lab-record-name` (`rental-lease` prefix).',
      ],
    },
    {
      appId: 'app-weather-dashboard',
      displayName: 'Weather Dashboard',
      contextAreaClass: 'weather-dashboard-app',
      primaryRecordLabel: 'city name',
    },
    {
      appId: 'app-training-quizzes',
      displayName: 'Training & Quizzes',
      contextAreaClass: 'training-quizzes-app',
      primaryRecordLabel: 'quiz title',
      extraBullets: [
        '**Quiz questions** in the accordion use `data-lab-record-name` = question prompt (`quiz-question` id prefix).',
      ],
    },
    {
      appId: 'app-okr-goals',
      displayName: 'OKR Goals',
      contextAreaClass: 'okr-goals-app',
      primaryRecordLabel: 'objective title',
      extraBullets: [
        '**Key results** under an objective use the same attrs; `data-lab-record-name` is the KR title.',
      ],
    },
    {
      appId: 'app-travel-itinerary',
      displayName: 'Travel Itinerary',
      contextAreaClass: 'travel-itinerary-app',
      primaryRecordLabel: 'trip name',
      extraBullets: ['Itinerary **line items** use attrs with the item title as `data-lab-record-name`.'],
    },
    {
      appId: 'app-home-maintenance',
      displayName: 'Home Maintenance',
      contextAreaClass: 'home-maintenance-app',
      primaryRecordLabel: 'asset name',
      extraBullets: ['Maintenance **tasks** on an asset use attrs with the task title.'],
    },
    {
      appId: 'app-time-tracking',
      displayName: 'Time Tracking',
      contextAreaClass: 'time-tracking-app',
      primaryRecordLabel: 'time entry project name',
    },
    {
      appId: 'app-knowledge-base',
      displayName: 'Knowledge Base',
      contextAreaClass: 'knowledge-base-app',
      primaryRecordLabel: 'article title',
      extraBullets: [
        'Reader **Edit** / **Delete** (when an article is selected) use the selected article id and title.',
      ],
    },
  ];
