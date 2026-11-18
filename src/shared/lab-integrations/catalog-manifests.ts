import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import {
  buildCatalogHostManifest,
  catalogServiceDescriptorByServiceId,
  type CatalogEntityDef,
  type CatalogHostDef,
} from './catalog-manifest-builder';

const idHidden = { name: 'id', type: 'number' as const, label: 'ID', hidden: true };

/** Title-cases a kebab/snake enum value for display (`not-started` → `Not started`). */
function enumOptions(values: readonly string[]): Array<{ value: string; label: string }> {
  return values.map((value) => {
    const spaced = value.replace(/[-_]/g, ' ');
    return { value, label: spaced.charAt(0).toUpperCase() + spaced.slice(1) };
  });
}

const KEY_RESULT_STATUSES = enumOptions(['not-started', 'on-track', 'at-risk', 'done']);
const ITINERARY_KINDS = enumOptions(['flight', 'hotel', 'activity', 'transport', 'other']);
const CHARTER_STATUSES = enumOptions(['draft', 'active', 'on-hold', 'complete']);
const HIRING_STAGES = enumOptions(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']);
const SUGGESTION_STATUSES = enumOptions(['open', 'planned', 'in-progress', 'done', 'declined']);
const EXPENSE_CATEGORIES = enumOptions(['travel', 'meals', 'supplies', 'software', 'other']);
const ARTICLE_STATUSES = enumOptions(['draft', 'published', 'archived']);
const ONBOARDING_TASK_STATUSES = enumOptions(['todo', 'doing', 'done']);
const MAINTENANCE_PRIORITIES = enumOptions(['low', 'normal', 'high']);
const PROPERTY_STATUSES = enumOptions(['vacant', 'occupied', 'maintenance']);
const LEASE_STATUSES = enumOptions(['active', 'ended', 'pending']);
const RENT_STATUSES = enumOptions(['due', 'paid', 'late']);
const RSVP_RESPONSES = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'maybe', label: 'Maybe' },
];
const POLL_KINDS = enumOptions(['single', 'multi']);
const POLL_STATUSES = enumOptions(['draft', 'open', 'closed']);

function entity(def: Omit<CatalogEntityDef, 'properties'> & {
  properties: IntegrationServiceDescriptor['properties'];
}): CatalogEntityDef {
  return def;
}

const CATALOG_HOST_DEFS: CatalogHostDef[] = [
  {
    hostAppId: 'app-okr-goals',
    slug: 'okr-goals',
    surfaceId: 'okr-goals.workspace',
    surfaceLabel: 'OKR workspace',
    entities: [
      entity({
        entityName: 'Objective',
        entityKey: 'objective',
        connectorSegment: 'objectives',
        discoveryEntityKey: 'objective',
        idContextKey: 'objectiveId',
        properties: [
          idHidden,
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'ownerName', type: 'string', label: 'Owner', lookupProvider: 'lab-user' },
          { name: 'quarter', type: 'string', label: 'Quarter' },
          { name: 'createdAt', type: 'date', label: 'Created', hidden: true },
        ],
      }),
      entity({
        entityName: 'KeyResult',
        entityKey: 'key-result',
        connectorSegment: 'key-results',
        discoveryEntityKey: 'key-result',
        idContextKey: 'keyResultId',
        parentContextKeys: ['objectiveId'],
        properties: [
          idHidden,
          {
            name: 'objectiveId',
            type: 'number',
            label: 'Objective',
            required: true,
            hidden: true,
            lookupProvider: 'self-entity',
            lookupEntityKey: 'objectives',
          },
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'metric', type: 'string', label: 'Metric' },
          { name: 'baseline', type: 'number', label: 'Baseline' },
          { name: 'target', type: 'number', label: 'Target' },
          { name: 'current', type: 'number', label: 'Current' },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: KEY_RESULT_STATUSES,
          },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.kr-by-status',
        label: 'Key results by status',
        requiresServiceId: 'okr-goals.key-results',
      },
      {
        slot: 'reports.objectives-by-quarter',
        label: 'Objectives by quarter',
        requiresServiceId: 'okr-goals.objectives',
      },
    ],
  },
  {
    hostAppId: 'app-travel-itinerary',
    slug: 'travel-itinerary',
    surfaceId: 'travel-itinerary.workspace',
    surfaceLabel: 'Travel workspace',
    entities: [
      entity({
        entityName: 'Trip',
        entityKey: 'trip',
        connectorSegment: 'trips',
        discoveryEntityKey: 'trip',
        idContextKey: 'tripId',
        properties: [
          idHidden,
          { name: 'name', type: 'string', label: 'Name', required: true },
          { name: 'destination', type: 'string', label: 'Destination' },
          { name: 'startDate', type: 'date', label: 'Start date', dateOnly: true },
          { name: 'endDate', type: 'date', label: 'End date', dateOnly: true },
          { name: 'notes', type: 'string', label: 'Notes' },
        ],
      }),
      entity({
        entityName: 'ItineraryItem',
        entityKey: 'itinerary-item',
        connectorSegment: 'itinerary-items',
        discoveryEntityKey: 'itinerary-item',
        idContextKey: 'itineraryItemId',
        parentContextKeys: ['tripId'],
        properties: [
          idHidden,
          {
            name: 'tripId',
            type: 'number',
            label: 'Trip',
            required: true,
            hidden: true,
            lookupProvider: 'self-entity',
            lookupEntityKey: 'trips',
          },
          {
            name: 'kind',
            type: 'string',
            label: 'Kind',
            lookupProvider: 'enum',
            options: ITINERARY_KINDS,
          },
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'startAt', type: 'date', label: 'Starts' },
          { name: 'endAt', type: 'date', label: 'Ends' },
          { name: 'location', type: 'string', label: 'Location' },
          { name: 'confirmation', type: 'string', label: 'Confirmation' },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.trips-by-destination',
        label: 'Trips by destination',
        requiresServiceId: 'travel-itinerary.trips',
      },
      {
        slot: 'reports.itinerary-by-kind',
        label: 'Itinerary by kind',
        requiresServiceId: 'travel-itinerary.itinerary-items',
      },
    ],
  },
  {
    hostAppId: 'app-project-charter',
    slug: 'project-charter',
    surfaceId: 'project-charter.workspace',
    surfaceLabel: 'Charter workspace',
    entities: [
      entity({
        entityName: 'Charter',
        entityKey: 'charter',
        connectorSegment: 'charters',
        discoveryEntityKey: 'charter',
        idContextKey: 'charterId',
        properties: [
          idHidden,
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'sponsor', type: 'string', label: 'Sponsor', lookupProvider: 'lab-user' },
          { name: 'purpose', type: 'string', label: 'Purpose' },
          { name: 'scope', type: 'string', label: 'Scope', controlType: 'Textarea' },
          { name: 'outOfScope', type: 'string', label: 'Out of scope', controlType: 'Textarea' },
          {
            name: 'stakeholders',
            type: 'array',
            label: 'Stakeholders',
            lookupProvider: 'lab-user',
          },
          { name: 'goals', type: 'string', label: 'Goals', controlType: 'Textarea' },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: CHARTER_STATUSES,
          },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.charters-by-status',
        label: 'Charters by status',
        requiresServiceId: 'project-charter.charters',
      },
      {
        slot: 'reports.charters-by-sponsor',
        label: 'Charters by sponsor',
        requiresServiceId: 'project-charter.charters',
      },
    ],
  },
  {
    hostAppId: 'app-time-tracking',
    slug: 'time-tracking',
    surfaceId: 'time-tracking.workspace',
    surfaceLabel: 'Time tracking workspace',
    entities: [
      entity({
        entityName: 'TimeEntry',
        entityKey: 'time-entry',
        connectorSegment: 'time-entries',
        discoveryEntityKey: 'time-entry',
        idContextKey: 'timeEntryId',
        properties: [
          idHidden,
          {
            name: 'teamMember',
            type: 'string',
            label: 'Team member',
            lookupProvider: 'lab-user',
          },
          { name: 'userName', type: 'string', label: 'Team member name', hidden: true },
          { name: 'project', type: 'string', label: 'Project', required: true },
          { name: 'task', type: 'string', label: 'Task' },
          { name: 'date', type: 'date', label: 'Date', dateOnly: true },
          { name: 'minutes', type: 'number', label: 'Minutes' },
          { name: 'billable', type: 'boolean', label: 'Billable' },
          { name: 'notes', type: 'string', label: 'Notes' },
          { name: 'weekKey', type: 'string', label: 'Week key' },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'submitted', label: 'Submitted' },
            ],
          },
        ],
      }),
      entity({
        entityName: 'Timesheet',
        entityKey: 'timesheet',
        connectorSegment: 'timesheets',
        discoveryEntityKey: 'timesheet',
        idContextKey: 'timesheetWeekKey',
        properties: [
          { name: 'id', type: 'string', label: 'Week key', hidden: true },
          {
            name: 'weekKey',
            type: 'string',
            label: 'Week key',
            required: true,
          },
          {
            name: 'approvalStatus',
            type: 'string',
            label: 'Approval status',
            lookupProvider: 'enum',
            options: [
              { value: 'pending', label: 'Pending approval' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ],
          },
          { name: 'requesterUserId', type: 'number', label: 'Requester user id', hidden: true },
          { name: 'submittedAt', type: 'string', label: 'Submitted at', hidden: true },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.hours-by-project',
        label: 'Minutes by project',
        requiresServiceId: 'time-tracking.time-entries',
      },
      {
        slot: 'reports.hours-by-user',
        label: 'Hours by team member',
        requiresServiceId: 'time-tracking.time-entries',
      },
    ],
  },
  {
    hostAppId: 'app-job-applicant-tracker',
    slug: 'job-applicant-tracker',
    surfaceId: 'job-applicant-tracker.workspace',
    surfaceLabel: 'Applicant tracker workspace',
    entities: [
      entity({
        entityName: 'Applicant',
        entityKey: 'applicant',
        connectorSegment: 'applicants',
        discoveryEntityKey: 'applicant',
        idContextKey: 'applicantId',
        properties: [
          idHidden,
          { name: 'name', type: 'string', label: 'Name', required: true },
          { name: 'role', type: 'string', label: 'Role' },
          { name: 'email', type: 'string', label: 'Email' },
          {
            name: 'stage',
            type: 'string',
            label: 'Stage',
            lookupProvider: 'enum',
            options: HIRING_STAGES,
          },
          { name: 'notes', type: 'string', label: 'Notes' },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.applicants-by-stage',
        label: 'Applicants by stage',
        requiresServiceId: 'job-applicant-tracker.applicants',
      },
      {
        slot: 'reports.applicants-stage-breakdown',
        label: 'Stage breakdown',
        requiresServiceId: 'job-applicant-tracker.applicants',
      },
    ],
  },
  {
    hostAppId: 'app-suggestion-box',
    slug: 'suggestion-box',
    surfaceId: 'suggestion-box.workspace',
    surfaceLabel: 'Suggestion box workspace',
    entities: [
      entity({
        entityName: 'Suggestion',
        entityKey: 'suggestion',
        connectorSegment: 'suggestions',
        discoveryEntityKey: 'suggestion',
        idContextKey: 'suggestionId',
        properties: [
          idHidden,
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'body', type: 'string', label: 'Body' },
          { name: 'author', type: 'string', label: 'Author', lookupProvider: 'lab-user' },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: SUGGESTION_STATUSES,
          },
          { name: 'votes', type: 'number', label: 'Votes' },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.suggestions-by-status',
        label: 'Suggestions by status',
        requiresServiceId: 'suggestion-box.suggestions',
      },
      {
        slot: 'reports.suggestions-by-vote',
        label: 'Suggestions by vote',
        requiresServiceId: 'suggestion-box.suggestions',
      },
    ],
  },
  {
    hostAppId: 'app-expense-reports',
    slug: 'expense-reports',
    surfaceId: 'expense-reports.workspace',
    surfaceLabel: 'Expense reports workspace',
    entities: [
      entity({
        entityName: 'Expense',
        entityKey: 'expense',
        connectorSegment: 'expenses',
        discoveryEntityKey: 'expense',
        idContextKey: 'expenseId',
        properties: [
          idHidden,
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'submitter', type: 'string', label: 'Submitter', lookupProvider: 'lab-user' },
          { name: 'amountCents', type: 'number', label: 'Amount (cents)' },
          { name: 'currency', type: 'string', label: 'Currency' },
          {
            name: 'category',
            type: 'string',
            label: 'Category',
            lookupProvider: 'enum',
            options: EXPENSE_CATEGORIES,
          },
          { name: 'spentOn', type: 'date', label: 'Spent on', dateOnly: true },
          { name: 'receiptUrl', type: 'string', label: 'Receipt URL' },
          { name: 'notes', type: 'string', label: 'Notes' },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'submitted', label: 'Submitted' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'reimbursed', label: 'Reimbursed' },
            ],
          },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.expenses-by-status',
        label: 'Expenses by status',
        requiresServiceId: 'expense-reports.expenses',
      },
      {
        slot: 'reports.expenses-by-category',
        label: 'Expenses by category',
        requiresServiceId: 'expense-reports.expenses',
      },
    ],
  },
  {
    hostAppId: 'app-knowledge-base',
    slug: 'knowledge-base',
    surfaceId: 'knowledge-base.workspace',
    surfaceLabel: 'Knowledge base workspace',
    entities: [
      entity({
        entityName: 'Article',
        entityKey: 'article',
        connectorSegment: 'articles',
        discoveryEntityKey: 'article',
        idContextKey: 'articleId',
        properties: [
          idHidden,
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'category', type: 'string', label: 'Category' },
          { name: 'tags', type: 'string', label: 'Tags' },
          { name: 'body', type: 'string', label: 'Body', controlType: 'Textarea' },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: ARTICLE_STATUSES,
          },
          { name: 'author', type: 'string', label: 'Author', lookupProvider: 'lab-user' },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.articles-by-category',
        label: 'Articles by category',
        requiresServiceId: 'knowledge-base.articles',
      },
      {
        slot: 'reports.articles-by-status',
        label: 'Articles by status',
        requiresServiceId: 'knowledge-base.articles',
      },
    ],
  },
  {
    hostAppId: 'app-training-quizzes',
    slug: 'training-quizzes',
    surfaceId: 'training-quizzes.workspace',
    surfaceLabel: 'Training workspace',
    entities: [
      entity({
        entityName: 'Quiz',
        entityKey: 'quiz',
        connectorSegment: 'quizzes',
        discoveryEntityKey: 'quiz',
        idContextKey: 'quizId',
        properties: [
          idHidden,
          { name: 'title', type: 'string', label: 'Title', required: true },
          {
            name: 'category',
            type: 'string',
            label: 'Category',
            lookupProvider: 'enum',
            options: [
              { value: 'Platform basics', label: 'Platform basics' },
              { value: 'Settings & personas', label: 'Settings & personas' },
              { value: 'Apps, team & support', label: 'Apps, team & support' },
            ],
          },
          { name: 'description', type: 'string', label: 'Description' },
          { name: 'passingScore', type: 'number', label: 'Passing score' },
        ],
      }),
      entity({
        entityName: 'QuizQuestion',
        entityKey: 'quiz-question',
        connectorSegment: 'quiz-questions',
        discoveryEntityKey: 'quiz-question',
        idContextKey: 'quizQuestionId',
        parentContextKeys: ['quizId'],
        properties: [
          idHidden,
          {
            name: 'quizId',
            type: 'number',
            label: 'Quiz',
            required: true,
            hidden: true,
            lookupProvider: 'self-entity',
            lookupEntityKey: 'quizzes',
          },
          { name: 'prompt', type: 'string', label: 'Prompt', required: true },
          { name: 'options', type: 'string', label: 'Options (JSON)' },
          { name: 'correctIndex', type: 'number', label: 'Correct index' },
          { name: 'order', type: 'number', label: 'Order' },
        ],
      }),
      entity({
        entityName: 'Certification',
        entityKey: 'certification',
        connectorSegment: 'certifications',
        discoveryEntityKey: 'certification',
        idContextKey: 'certificationId',
        properties: [
          idHidden,
          {
            name: 'category',
            type: 'string',
            label: 'Category',
            required: true,
            lookupProvider: 'enum',
            options: [
              { value: 'Platform basics', label: 'Platform basics' },
              { value: 'Settings & personas', label: 'Settings & personas' },
              { value: 'Apps, team & support', label: 'Apps, team & support' },
            ],
          },
          { name: 'learner', type: 'string', label: 'Learner', lookupProvider: 'lab-user' },
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'expiresAt', type: 'date', label: 'Expires', required: true, dateOnly: true },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'revoked', label: 'Revoked' },
            ],
          },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.quizzes-overview',
        label: 'Quizzes',
        requiresServiceId: 'training-quizzes.quizzes',
      },
      {
        slot: 'reports.certifications-by-status',
        label: 'Certifications by status',
        requiresServiceId: 'training-quizzes.certifications',
      },
    ],
  },
  {
    hostAppId: 'app-onboarding-checklist',
    slug: 'onboarding-checklist',
    surfaceId: 'onboarding-checklist.workspace',
    surfaceLabel: 'Onboarding workspace',
    entities: [
      entity({
        entityName: 'Checklist',
        entityKey: 'checklist',
        connectorSegment: 'checklists',
        discoveryEntityKey: 'checklist',
        idContextKey: 'checklistId',
        properties: [
          idHidden,
          { name: 'newHire', type: 'string', label: 'New hire', required: true, lookupProvider: 'lab-user' },
          { name: 'role', type: 'string', label: 'Role' },
          { name: 'startDate', type: 'date', label: 'Start date', dateOnly: true },
        ],
      }),
      entity({
        entityName: 'OnboardingTask',
        entityKey: 'onboarding-task',
        connectorSegment: 'onboarding-tasks',
        discoveryEntityKey: 'onboarding-task',
        idContextKey: 'onboardingTaskId',
        parentContextKeys: ['checklistId'],
        properties: [
          idHidden,
          {
            name: 'checklistId',
            type: 'number',
            label: 'Checklist',
            required: true,
            hidden: true,
            lookupProvider: 'self-entity',
            lookupEntityKey: 'checklists',
          },
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'owner', type: 'string', label: 'Owner', lookupProvider: 'lab-user' },
          { name: 'dueDate', type: 'date', label: 'Due date', dateOnly: true },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: ONBOARDING_TASK_STATUSES,
          },
          { name: 'order', type: 'number', label: 'Order' },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.checklists-by-role',
        label: 'Checklists by role',
        requiresServiceId: 'onboarding-checklist.checklists',
      },
      {
        slot: 'reports.tasks-by-status',
        label: 'Tasks by status',
        requiresServiceId: 'onboarding-checklist.onboarding-tasks',
      },
    ],
  },
  {
    hostAppId: 'app-weather-dashboard',
    slug: 'weather-dashboard',
    surfaceId: 'weather-dashboard.workspace',
    surfaceLabel: 'Weather workspace',
    entities: [
      entity({
        entityName: 'Location',
        entityKey: 'location',
        connectorSegment: 'locations',
        discoveryEntityKey: 'location',
        idContextKey: 'locationId',
        properties: [
          idHidden,
          { name: 'name', type: 'string', label: 'Name', required: true },
          { name: 'latitude', type: 'number', label: 'Latitude' },
          { name: 'longitude', type: 'number', label: 'Longitude' },
        ],
      }),
      // No `weather-observation` entity: conditions are always live and never persisted.
    ],
    // No charts: the single "observations by condition" pie restated a handful of
    // user-entered rows and added no signal. New installs get no stub or binding;
    // existing installs are pruned via `OBSOLETE_CATALOG_SLOTS`.
  },
  {
    hostAppId: 'app-home-maintenance',
    slug: 'home-maintenance',
    surfaceId: 'home-maintenance.workspace',
    surfaceLabel: 'Home maintenance workspace',
    entities: [
      entity({
        entityName: 'MaintenanceTask',
        entityKey: 'maintenance-task',
        connectorSegment: 'maintenance-tasks',
        discoveryEntityKey: 'maintenance-task',
        idContextKey: 'maintenanceTaskId',
        properties: [
          idHidden,
          {
            name: 'assetId',
            type: 'number',
            label: 'Asset',
            required: true,
            lookupProvider: 'self-entity',
            lookupEntityKey: 'home-assets',
          },
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'dueDate', type: 'date', label: 'Due date', dateOnly: true },
          {
            name: 'priority',
            type: 'string',
            label: 'Priority',
            lookupProvider: 'enum',
            options: MAINTENANCE_PRIORITIES,
          },
          { name: 'notes', type: 'string', label: 'Notes' },
          { name: 'cost', type: 'number', label: 'Cost (USD)' },
        ],
      }),
      entity({
        entityName: 'HomeAsset',
        entityKey: 'home-asset',
        connectorSegment: 'home-assets',
        discoveryEntityKey: 'home-asset',
        idContextKey: 'homeAssetId',
        properties: [
          idHidden,
          { name: 'name', type: 'string', label: 'Name', required: true },
          { name: 'category', type: 'string', label: 'Category' },
          { name: 'location', type: 'string', label: 'Location' },
          { name: 'notes', type: 'string', label: 'Notes' },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.tasks-by-status',
        label: 'Tasks by status',
        requiresServiceId: 'home-maintenance.maintenance-tasks',
      },
      {
        slot: 'reports.tasks-by-priority',
        label: 'Tasks by priority',
        requiresServiceId: 'home-maintenance.maintenance-tasks',
      },
      {
        slot: 'reports.cost-by-asset',
        label: 'Cost by asset',
        requiresServiceId: 'home-maintenance.maintenance-tasks',
      },
    ],
  },
  {
    hostAppId: 'app-rental-property',
    slug: 'rental-property',
    surfaceId: 'rental-property.workspace',
    surfaceLabel: 'Rental workspace',
    entities: [
      entity({
        entityName: 'RentalProperty',
        entityKey: 'property',
        formEntityLabel: 'property',
        connectorSegment: 'properties',
        discoveryEntityKey: 'property',
        idContextKey: 'propertyId',
        properties: [
          idHidden,
          { name: 'name', type: 'string', label: 'Name', required: true },
          { name: 'address', type: 'string', label: 'Address' },
          { name: 'monthlyRentCents', type: 'number', label: 'Monthly rent (USD)', numberScale: 'usd-cents' },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: PROPERTY_STATUSES,
          },
          { name: 'notes', type: 'string', label: 'Notes' },
        ],
      }),
      entity({
        entityName: 'Lease',
        entityKey: 'lease',
        formEntityLabel: 'lease',
        connectorSegment: 'leases',
        discoveryEntityKey: 'lease',
        idContextKey: 'leaseId',
        parentContextKeys: ['propertyId'],
        properties: [
          idHidden,
          {
            name: 'propertyId',
            type: 'number',
            label: 'Property',
            required: true,
            hidden: true,
            lookupProvider: 'self-entity',
            lookupEntityKey: 'properties',
            lookupLabelProperty: 'name',
          },
          { name: 'tenant', type: 'string', label: 'Tenant name', required: true },
          { name: 'startDate', type: 'date', label: 'Start date', dateOnly: true },
          { name: 'endDate', type: 'date', label: 'End date', dateOnly: true },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: LEASE_STATUSES,
          },
        ],
      }),
      entity({
        entityName: 'RentPayment',
        entityKey: 'rent-payment',
        formEntityLabel: 'rent payment',
        connectorSegment: 'rent-payments',
        discoveryEntityKey: 'rent-payment',
        idContextKey: 'rentPaymentId',
        parentContextKeys: ['leaseId', 'propertyId'],
        properties: [
          idHidden,
          {
            name: 'leaseId',
            type: 'number',
            label: 'Lease',
            required: true,
            hidden: true,
            lookupProvider: 'self-entity',
            lookupEntityKey: 'leases',
            lookupLabelProperty: 'tenant',
          },
          { name: 'periodMonth', type: 'string', label: 'Billing period (YYYY-MM)', required: true },
          { name: 'amountCents', type: 'number', label: 'Amount (USD)', required: true, numberScale: 'usd-cents' },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: RENT_STATUSES,
          },
          { name: 'paidAt', type: 'string', label: 'Paid at', hidden: true },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.properties-by-status',
        label: 'Properties by status',
        requiresServiceId: 'rental-property.properties',
      },
      {
        slot: 'reports.payments-by-status',
        label: 'Payments by status',
        requiresServiceId: 'rental-property.rent-payments',
      },
    ],
  },
  {
    hostAppId: 'app-event-rsvp',
    slug: 'event-rsvp',
    surfaceId: 'event-rsvp.workspace',
    surfaceLabel: 'Event RSVP workspace',
    entities: [
      entity({
        entityName: 'Event',
        entityKey: 'event',
        formEntityLabel: 'event',
        connectorSegment: 'events',
        discoveryEntityKey: 'event',
        idContextKey: 'eventId',
        properties: [
          idHidden,
          { name: 'title', type: 'string', label: 'Title', required: true },
          { name: 'description', type: 'string', label: 'Description' },
          { name: 'startsAt', type: 'date', label: 'Starts' },
          { name: 'endsAt', type: 'date', label: 'Ends' },
          { name: 'location', type: 'string', label: 'Location' },
          { name: 'capacity', type: 'number', label: 'Capacity (0 = unlimited)' },
        ],
      }),
      entity({
        entityName: 'RsvpResponse',
        entityKey: 'rsvp-response',
        formEntityLabel: 'RSVP response',
        connectorSegment: 'rsvp-responses',
        discoveryEntityKey: 'rsvp-response',
        idContextKey: 'rsvpResponseId',
        parentContextKeys: ['eventId'],
        properties: [
          idHidden,
          {
            name: 'eventId',
            type: 'number',
            label: 'Event',
            required: true,
            hidden: true,
            lookupProvider: 'self-entity',
            lookupEntityKey: 'events',
          },
          {
            name: 'guestName',
            type: 'string',
            label: 'Guest name',
            required: true,
            lookupProvider: 'lab-user',
          },
          {
            name: 'response',
            type: 'string',
            label: 'Response',
            required: true,
            lookupProvider: 'enum',
            options: RSVP_RESPONSES,
          },
          { name: 'headcount', type: 'number', label: 'Headcount' },
          { name: 'note', type: 'string', label: 'Note' },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.rsvps-by-response',
        label: 'RSVPs by response',
        requiresServiceId: 'event-rsvp.rsvp-responses',
      },
      {
        slot: 'reports.events-by-location',
        label: 'Events by location',
        requiresServiceId: 'event-rsvp.events',
      },
    ],
  },
  {
    hostAppId: 'app-polls-surveys',
    slug: 'polls-surveys',
    surfaceId: 'polls-surveys.workspace',
    surfaceLabel: 'Polls workspace',
    entities: [
      entity({
        entityName: 'Poll',
        entityKey: 'poll',
        connectorSegment: 'polls',
        discoveryEntityKey: 'poll',
        idContextKey: 'pollId',
        properties: [
          idHidden,
          { name: 'question', type: 'string', label: 'Question', required: true },
          {
            name: 'kind',
            type: 'string',
            label: 'Kind',
            lookupProvider: 'enum',
            options: POLL_KINDS,
          },
          {
            name: 'status',
            type: 'string',
            label: 'Status',
            lookupProvider: 'enum',
            options: POLL_STATUSES,
          },
          { name: 'allowAnonymous', type: 'boolean', label: 'Allow anonymous' },
          {
            name: 'allowMultipleVotes',
            type: 'boolean',
            label: 'Allow multiple votes',
          },
        ],
      }),
      entity({
        entityName: 'PollOption',
        formEntityLabel: 'poll option',
        entityKey: 'poll-option',
        connectorSegment: 'poll-options',
        discoveryEntityKey: 'poll-option',
        idContextKey: 'pollOptionId',
        parentContextKeys: ['pollId'],
        properties: [
          idHidden,
          {
            name: 'pollId',
            type: 'number',
            label: 'Poll',
            required: true,
            hidden: true,
            lookupProvider: 'self-entity',
            lookupEntityKey: 'polls',
          },
          { name: 'label', type: 'string', label: 'Label', required: true },
          { name: 'order', type: 'number', label: 'Order' },
        ],
      }),
    ],
    charts: [
      {
        slot: 'reports.polls-by-status',
        label: 'Polls by status',
        requiresServiceId: 'polls-surveys.polls',
      },
      {
        slot: 'reports.polls-by-kind',
        label: 'Polls by kind',
        requiresServiceId: 'polls-surveys.polls',
      },
    ],
  },
];

/**
 * Slots that existed in a released manifest and have since been removed.
 *
 * Binding-sync only ever *inserts* (`insertBindingIfMissing`), so dropping a slot from a
 * manifest leaves the old row behind forever on installed databases — the Reports region kept
 * rendering a chart that no longer has an upstream definition. Listing the slot here lets the
 * sync prune it instead of orphaning it.
 */
export const OBSOLETE_CATALOG_SLOTS: ReadonlyArray<{ hostAppId: string; slot: string }> = [
  // The "observations by condition" pie was removed — it restated a handful of
  // user-entered observations and added no signal over the location cards.
  { hostAppId: 'app-weather-dashboard', slot: 'reports.observations-by-condition' },
  // Observation logging was removed: conditions are always live and never persisted, so the
  // `weather-observation` entity — and its three form slots — no longer exist.
  { hostAppId: 'app-weather-dashboard', slot: 'weather-observation.create.dialog' },
  { hostAppId: 'app-weather-dashboard', slot: 'weather-observation.edit.dialog' },
  { hostAppId: 'app-weather-dashboard', slot: 'weather-observation.delete.dialog' },
  { hostAppId: 'app-job-applicant-tracker', slot: 'reports.applicants-by-role' },
  { hostAppId: 'app-suggestion-box', slot: 'reports.suggestions-by-author' },
];

export const CATALOG_MANIFEST_SEEDS: Array<[string, AppLabIntegrationManifestV1]> =
  CATALOG_HOST_DEFS.map((def) => [def.hostAppId, buildCatalogHostManifest(def)]);

export const CATALOG_HOST_APP_IDS = CATALOG_HOST_DEFS.map((def) => def.hostAppId);

export function catalogServiceDescriptor(serviceId: string): IntegrationServiceDescriptor | null {
  return catalogServiceDescriptorByServiceId(CATALOG_MANIFEST_SEEDS, serviceId);
}

export function catalogHostDef(hostAppId: string): CatalogHostDef | undefined {
  return CATALOG_HOST_DEFS.find((row) => row.hostAppId === hostAppId);
}
