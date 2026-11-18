/**
 * Agent instructions for the Training & Quizzes catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const trainingQuizzesAppInstructions = `# App System Instructions: Training & Quizzes

## Overview

\`app-training-quizzes\` is a **hybrid** learning catalog app for building quizzes and tracking training completion. UI: \`src/apps/training-quizzes/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4118**).

## Data model

- **Quizzes** — title, **category** (About THE-LAB topic / KB theme), description, passing score % (\`quizzes\`).
- **Questions** — belong to a quiz; prompt, options (JSON), correct index, order (\`quiz_questions\`).
- **Attempts** — quiz, learner, score %, passed (\`quiz_attempts\`). Scoring is done server-side.
- **Certifications** — learner, **category** (About/KB theme), title, icon (from definitions), expiry, status (\`active\` | \`revoked\`) (\`learner_certifications\`). **Category certification:** when a learner has a **passing attempt on every quiz** in a category, the server issues or renews a one-year active certification for that **category** (not per-quiz). Default titles and PrimeIcons live in \`category_certification_definitions\` (synced at server boot).

## API (app server, REST)

- \`GET /api/quizzes\` — quizzes with nested questions.
- \`POST/DELETE /api/quizzes[/:id]\`; \`GET /api/quizzes/:id/attempts\`.
- \`POST/DELETE /api/quiz-questions[/:id]\`.
- \`POST /api/quiz-attempts\` — body \`{ quizId, learnerId, answers: number[] }\`; returns graded attempt and whether a **category** cert was newly issued.
- \`GET /api/category-progress?learnerId=\` — per-category quiz pass counts vs totals and earned cert state.
- \`GET /api/certifications/badges?userIds=\` — compact badge rows for messaging (also exposed on main backend as \`GET /api/platform/training-certifications/badges\`).

## Integration (rm-64)

Host \`app-training-quizzes\`, surface \`training-quizzes.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

| Entity | \`entityKey\` | Segment | UI |
|--------|---------------|---------|-----|
| Quiz (primary) | \`quiz\` | \`quizzes\` | \`openPrimary*\` |
| Quiz question | \`quiz-question\` | \`quiz-questions\` | \`openEntity*('quiz-question', { quizId })\` |
| Certification | \`certification\` | \`certifications\` | \`openEntity*('certification', { category })\` — manual rows; learners normally earn certs by completing all quizzes in a category |

### Chart Builder

\`reports.quizzes-overview\`, \`reports.certifications-by-status\`.

### Inline (non-FB)

Take quiz / \`POST /api/quiz-attempts\` (graded attempt; not FB).

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-training-quizzes.quiz.passed\` | a submitted attempt scores at or above the quiz pass mark | \`POST /api/quiz-attempts\` |
| \`app-training-quizzes.cert.expiring\` | active certification enters the 30-day expiry window | **platform requirement sweep** (not a route) |

A failed attempt is still recorded but publishes nothing — the event says "passed", so it must not fire otherwise. Payload includes \`score\` and \`learnerId\`. After a pass, the server may upsert \`learner_certifications\` when **all quizzes in that quiz's category** are passed.

## UI layout

Reports (two charts) → **three category sections** (Platform basics, Settings & personas, Apps team & support) with quiz cards, **category progress / earned cert icon** in section headers, and accordion **Questions & attempt**. Demo pack: 11 quizzes / 33 questions in \`shared/quiz-demo-content.ts\` (4 + 3 + 4 per track). **Owners/admins** author; **members/viewers** take attempts only.

**Certification:** earned automatically per category (all quizzes passed). Owners/admins may still add or edit certification rows via Forms Builder. **Lab Messages** shows earned category cert icons next to display names (user list, thread header, and above each DM bubble).

See \`docs/apps/catalog-workspace-ui-pattern.md\`.

## Automation scope

- Root class \`training-quizzes-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-training-quizzes',
  displayName: 'Training & Quizzes',
  contextAreaClass: 'training-quizzes-app',
  primaryRecordLabel: 'quiz title',
  extraBullets: [
    "**Quiz questions** in the accordion use `data-lab-record-name` = question prompt (`quiz-question` id prefix).",
  ],
})}

User doc: \`docs/apps/training-quizzes.md\` (create/update when UX changes).
`;
