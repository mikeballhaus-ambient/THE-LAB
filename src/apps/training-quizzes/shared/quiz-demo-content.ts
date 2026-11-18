/**
 * Demo quiz catalog — three training tracks (3+ quizzes each). Question topics still
 * align with About THE-LAB and Knowledge Base articles.
 */

export interface QuizDemoQuestionSpec {
  prompt: string;
  options: readonly string[];
  correctIndex: number;
}

export interface QuizDemoSpec {
  title: string;
  category: QuizDemoCategory;
  description: string;
  passingScore: number;
  dayOffset: number;
  questions: readonly QuizDemoQuestionSpec[];
}

/** Training tracks for the demo pack (~3 categories, 3+ quizzes each). */
export type QuizDemoCategory =
  | 'Platform basics'
  | 'Settings & personas'
  | 'Apps, team & support';

export const QUIZ_DEMO_CATEGORY_ORDER: readonly QuizDemoCategory[] = [
  'Platform basics',
  'Settings & personas',
  'Apps, team & support',
];

/** Story B anchor — onboarding demo references this quiz title. */
export const QUIZ_DEMO_SUPPORT_TITLE = 'Support Fundamentals';

export const QUIZ_DEMO_SPECS: readonly QuizDemoSpec[] = [
  {
    title: 'THE-LAB essentials',
    category: 'Platform basics',
    description: 'What the platform is, how to sign in, and who can launch apps (About + KB signing-in).',
    passingScore: 70,
    dayOffset: -45,
    questions: [
      {
        prompt: 'THE-LAB combines which two primary surfaces?',
        options: [
          'Laboratory chat and an apps workspace',
          'Email and calendar only',
          'A single browser tab with no apps',
          'Git and CI pipelines only',
        ],
        correctIndex: 0,
      },
      {
        prompt: 'Local sign-in is handled by which platform service?',
        options: ['LabSessionService', 'AppManager', 'ChromaDB', 'AppDatabaseService'],
        correctIndex: 0,
      },
      {
        prompt: 'Which role cannot launch apps?',
        options: ['owner', 'admin', 'member', 'viewer'],
        correctIndex: 3,
      },
    ],
  },
  {
    title: 'Workspace navigation',
    category: 'Platform basics',
    description: 'Apps home, Laboratory focus, Sidecar, and Messages vs AI chat (About Navigation).',
    passingScore: 70,
    dayOffset: -42,
    questions: [
      {
        prompt: 'When Laboratory is focused, the apps workspace is…',
        options: [
          'removed from the DOM',
          'still present but visually de-emphasized (blur/opacity)',
          'replaced by Settings',
          'only available to owners',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Quick nav **Messages** is for…',
        options: [
          'full-screen AI chat with personas',
          'human team direct messages',
          'app server logs',
          'MCP tool configuration',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Hybrid app APIs should target…',
        options: [
          'main backend port 3000 only',
          'props.serverUrl (app port 4000–4999)',
          'Vite dev server only',
          'ChromaDB',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Chat & personas',
    category: 'Platform basics',
    description: 'Sidecar vs Laboratory, slash commands, and attachments (About Chat Interface).',
    passingScore: 70,
    dayOffset: -39,
    questions: [
      {
        prompt: 'The Lab Sidecar on the apps workspace shows…',
        options: [
          'every MCP tool call in the transcript',
          'user and assistant messages without tool chips',
          'only system logs',
          'team DMs',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'In Laboratory, typing `@` lets you…',
        options: [
          'mention other humans in team chat',
          'attach repository files to the conversation',
          'edit SQLite directly',
          'change your platform role',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Slash commands are invoked by typing…',
        options: ['`/` at the start of a message', '`#` in Settings only', '`@` in team chat', 'a double click on the persona'],
        correctIndex: 0,
      },
    ],
  },
  {
    title: 'Managing chat sessions',
    category: 'Platform basics',
    description: 'Multiple sessions, switching, and deletion rules (About Session Management).',
    passingScore: 70,
    dayOffset: -36,
    questions: [
      {
        prompt: 'Each chat session keeps…',
        options: [
          'one shared transcript for all personas',
          'its own history and persona pairing',
          'only the last user message',
          'no persistence',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Where can you create or delete chat sessions?',
        options: [
          'Laboratory (and Settings for history management)',
          'only inside catalog apps',
          'team Messages panel',
          'Workflow Studio',
        ],
        correctIndex: 0,
      },
      {
        prompt: 'The active session tab is protected from deletion to…',
        options: [
          'save disk space',
          'prevent accidental loss of an in-progress conversation',
          'hide MCP tools',
          'block viewers',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Settings & platform security',
    category: 'Settings & personas',
    description: 'Administration, SSO, MCP servers, and production profile (About Settings + KB platform).',
    passingScore: 75,
    dayOffset: -33,
    questions: [
      {
        prompt: 'Enterprise SSO IdPs are configured in…',
        options: [
          'Settings → Auth Providers (not runtime `.env`)',
          'each app’s `.env` file',
          'Laboratory slash commands only',
          'the app registry SQL table by hand',
        ],
        correctIndex: 0,
      },
      {
        prompt: 'When `LAB_PRODUCTION_PROFILE=1`, MCP execution is…',
        options: [
          'unrestricted',
          'enforced by production enforcers',
          'disabled entirely',
          'log-only with no blocking',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Only which roles can delete users?',
        options: ['viewer', 'member', 'admin', 'owner'],
        correctIndex: 3,
      },
    ],
  },
  {
    title: 'Platform themes',
    category: 'Settings & personas',
    description: 'Presets, live draft, and who may save (About Themes & Look + docs/platform/platform-theming).',
    passingScore: 70,
    dayOffset: -30,
    questions: [
      {
        prompt: 'How many built-in theme presets ship with THE-LAB?',
        options: ['4', '10', '20 (10 dark + 10 light)', 'Unlimited custom only'],
        correctIndex: 2,
      },
      {
        prompt: 'Unsaved theme edits show…',
        options: [
          'no preview until restart',
          'a live draft on the real UI with Save or Discard',
          'only in Laboratory chat',
          'per-user copies that never sync',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Who can save the platform theme for all users?',
        options: ['any signed-in member', 'owners and admins', 'viewers only', 'app servers on port 4118'],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Integration basics',
    category: 'Apps, team & support',
    description: 'Manifests, bindings, and connector lookups (About Apps & integrations + KB Integrations).',
    passingScore: 70,
    dayOffset: -27,
    questions: [
      {
        prompt: 'Which file describes entities and slots a catalog host exposes?',
        options: ['The catalog manifest', 'package.json', 'vite.config only', 'The app favicon'],
        correctIndex: 0,
      },
      {
        prompt: 'A chart binding connects a host report slot to…',
        options: ['a workflow graph', 'a chart definition in Chart Builder', 'a persona', 'a demo pack id'],
        correctIndex: 1,
      },
      {
        prompt: 'Lookups let one app…',
        options: [
          'delete another app’s database',
          'resolve values owned by another integration service',
          'bypass JWT auth',
          'skip the connector contract',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Workflow automation intro',
    category: 'Apps, team & support',
    description: 'Workflow Studio, domain events, and connector steps (About + KB workflow-studio article).',
    passingScore: 70,
    dayOffset: -24,
    questions: [
      {
        prompt: 'Workflow Studio graphs react primarily to…',
        options: [
          'only manual button clicks in CRM',
          'domain events and triggers on the lab event bus',
          'Vite hot reload',
          'browser localStorage',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'An integration step in a workflow typically calls…',
        options: [
          'random ports on the client',
          'app connector APIs with mapped fields',
          'only Chroma embeddings',
          'the Windows registry',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Schedule timing on a trigger node is authored by…',
        options: [
          'editing the graph trigger and saving (single source of truth)',
          'a separate hidden SQL table only',
          'emailing an admin',
          'launching Time Tracking',
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    title: 'Team messaging',
    category: 'Apps, team & support',
    description: 'Human DMs vs AI chat (About Messages + docs/platform/lab-messaging).',
    passingScore: 70,
    dayOffset: -21,
    questions: [
      {
        prompt: 'Team direct messages use which socket namespace?',
        options: ['/lab-comms', 'platform SOCKET_EVENTS chat', '/vite-hmr', 'app catalog-host only'],
        correctIndex: 0,
      },
      {
        prompt: 'Lab messaging v1 is…',
        options: [
          'socket-only (no REST send/history)',
          'email-backed only',
          'the same channel as Laboratory personas',
          'available only to owners',
        ],
        correctIndex: 0,
      },
      {
        prompt: 'Laboratory and Sidecar are for…',
        options: [
          'human-to-human chat',
          'AI personas with MCP tools',
          'posting ledger entries',
          'editing theme presets',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Working with personas',
    category: 'Settings & personas',
    description: 'Developer mode and persona strengths (About Pro Tips + KB Agents category).',
    passingScore: 70,
    dayOffset: -18,
    questions: [
      {
        prompt: 'Developer Mode changes…',
        options: [
          'your platform role to owner',
          'how technical vs simple AI responses read',
          'which apps appear in the catalog',
          'Chroma collection names',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Each persona’s available MCP tools come from…',
        options: [
          'Persona Configuration in Settings',
          'the app SQLite file only',
          'team Messages',
          'random assignment per message',
        ],
        correctIndex: 0,
      },
      {
        prompt: 'For repo-wide changes with full tool visibility, prefer…',
        options: ['Laboratory focus', 'team Messages only', 'turning off auth', 'viewer role'],
        correctIndex: 0,
      },
    ],
  },
  {
    title: QUIZ_DEMO_SUPPORT_TITLE,
    category: 'Apps, team & support',
    description: 'Tickets, requesters, and platform identity on catalog rows (KB Help Desk + demo pack).',
    passingScore: 70,
    dayOffset: -15,
    questions: [
      {
        prompt: 'What should every person column store alongside the display name?',
        options: ['an email address only', 'the platform user id', 'a UUID in localStorage', 'a CRM slug'],
        correctIndex: 1,
      },
      {
        prompt: 'A ticket that a CRM contact also raised should be linked by…',
        options: [
          'copying the whole CRM database',
          'storing the contact email on the ticket',
          'merging SQLite files',
          'creating a duplicate contact',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Catalog host apps should broadcast live data changes on…',
        options: [
          'platform port 3000 chat sockets only',
          'their app Socket.IO server (`catalog-host:data-changed`)',
          'email notifications only',
          'the About dialog',
        ],
        correctIndex: 1,
      },
    ],
  },
];

export function quizDemoCategoryOptions(): Array<{ value: string; label: string }> {
  return QUIZ_DEMO_CATEGORY_ORDER.map((value) => ({ value, label: value }));
}
