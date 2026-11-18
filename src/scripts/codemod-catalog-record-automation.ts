/**
 * One-shot rm-68.2 codemod — catalog host App.vue primary edit/delete attrs.
 * Safe to re-run (skips when import already present).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IMPORT_SNIPPET = `import {
  labRecordActionButtonPt,
  labRecordRowContainerAttrs,
} from '@/shared/constants/lab-record-automation';`;

type Patch = { file: string; importAnchor: string; replacements: [string, string][] };

const PATCHES: Patch[] = [
  {
    file: 'src/apps/expense-reports/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`expense-edit-${expense.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'expense\', \'edit\', expense.id, expense.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`expense-del-${expense.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'expense\', \'delete\', expense.id, expense.title)"',
      ],
    ],
  },
  {
    file: 'src/apps/suggestion-box/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`suggestion-edit-${s.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'suggestion\', \'edit\', s.id, s.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`suggestion-del-${s.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'suggestion\', \'delete\', s.id, s.title)"',
      ],
    ],
  },
  {
    file: 'src/apps/event-rsvp/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`rsvp-edit-${ev.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'rsvp\', \'edit\', ev.id, ev.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`rsvp-del-${ev.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'rsvp\', \'delete\', ev.id, ev.title)"',
      ],
    ],
  },
  {
    file: 'src/apps/onboarding-checklist/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`onboarding-edit-${c.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'onboarding\', \'edit\', c.id, c.newHire)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`onboarding-del-${c.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'onboarding\', \'delete\', c.id, c.newHire)"',
      ],
    ],
  },
  {
    file: 'src/apps/project-charter/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`charter-edit-${charter.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'charter\', \'edit\', charter.id, charter.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`charter-del-${charter.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'charter\', \'delete\', charter.id, charter.title)"',
      ],
    ],
  },
  {
    file: 'src/apps/rental-property/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`rental-edit-${p.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'rental\', \'edit\', p.id, p.address)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`rental-del-${p.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'rental\', \'delete\', p.id, p.address)"',
      ],
    ],
  },
  {
    file: 'src/apps/weather-dashboard/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`weather-edit-${loc.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'weather\', \'edit\', loc.id, loc.city)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`weather-del-${loc.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'weather\', \'delete\', loc.id, loc.city)"',
      ],
    ],
  },
  {
    file: 'src/apps/training-quizzes/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`quiz-edit-${quiz.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'quiz\', \'edit\', quiz.id, quiz.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`quiz-del-${quiz.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'quiz\', \'delete\', quiz.id, quiz.title)"',
      ],
    ],
  },
  {
    file: 'src/apps/okr-goals/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`okr-edit-objective-${objective.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'okr-objective\', \'edit\', objective.id, objective.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`okr-del-objective-${objective.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'okr-objective\', \'delete\', objective.id, objective.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`okr-edit-kr-${kr.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'okr-kr\', \'edit\', kr.id, kr.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`okr-del-kr-${kr.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'okr-kr\', \'delete\', kr.id, kr.title)"',
      ],
    ],
  },
  {
    file: 'src/apps/travel-itinerary/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`travel-edit-trip-${trip.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'travel-trip\', \'edit\', trip.id, trip.name)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`travel-del-trip-${trip.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'travel-trip\', \'delete\', trip.id, trip.name)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`travel-edit-item-${item.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'travel-item\', \'edit\', item.id, item.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`travel-del-item-${item.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'travel-item\', \'delete\', item.id, item.title)"',
      ],
    ],
  },
  {
    file: 'src/apps/home-maintenance/front-end/App.vue',
    importAnchor: "import * as api from './api';",
    replacements: [
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`home-edit-asset-${asset.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'home-asset\', \'edit\', asset.id, asset.name)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`home-del-asset-${asset.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'home-asset\', \'delete\', asset.id, asset.name)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`home-edit-task-${t.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'home-task\', \'edit\', t.id, t.title)"',
      ],
      [
        ':pt="{ root: { attrs: { id: generateUniqueId(`home-del-task-${t.id}`) } } }"',
        ':pt="labRecordActionButtonPt(generateUniqueId, \'home-task\', \'delete\', t.id, t.title)"',
      ],
    ],
  },
];

for (const patch of PATCHES) {
  const full = path.join(ROOT, patch.file);
  if (!fs.existsSync(full)) {
    console.warn('skip missing', patch.file);
    continue;
  }
  let text = fs.readFileSync(full, 'utf8');
  if (!text.includes('labRecordActionButtonPt')) {
    if (!text.includes(patch.importAnchor)) {
      console.warn('skip import anchor', patch.file);
      continue;
    }
    text = text.replace(patch.importAnchor, `${patch.importAnchor}\n${IMPORT_SNIPPET}`);
  }
  for (const [from, to] of patch.replacements) {
    if (text.includes(from)) {
      text = text.replace(from, to);
    }
  }
  fs.writeFileSync(full, text);
  console.log('patched', patch.file);
}
