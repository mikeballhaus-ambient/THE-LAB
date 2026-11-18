export const APP_BUILDER_CONSULTATION_MARKER = '[THE-LAB App Builder — new app consultation]';

export const APP_BUILDER_CATALOG_TAG_ASSISTANT = 'assistant_recommend';

export type AppBuilderCatalogTagChoice =
  | { mode: 'assistant_recommend' }
  | { mode: 'user_selected'; tagId: string; tagLabel: string };

export interface AppBuilderConsultationDraft {
  displayName: string;
  description: string;
  faIcon: string;
  catalogTag: AppBuilderCatalogTagChoice;
}

function formatCatalogTagLine(catalogTag: AppBuilderCatalogTagChoice): string {
  if (catalogTag.mode === 'assistant_recommend') {
    return '**Catalog section:** I chose **Recommend for me** — propose primary (and optional secondary) platform catalog tag **ids** (lowercase slugs, e.g. `examples`, `demo-training`) and get my confirmation before scaffold.';
  }
  return `**Catalog section (primary tag):** \`${catalogTag.tagId}\` (${catalogTag.tagLabel})`;
}

function formatCatalogTagCreateRequirements(catalogTag: AppBuilderCatalogTagChoice): string {
  const shared = `On **\`app_management_create_app\`** you **must** include **\`catalogTagIds\`** (primary first) or **\`catalogTags\`** with \`id\` (+ optional \`label\`, \`description\`, \`sortOrder\`). Omitting them leaves the app in **Other apps** on the home grid. Do **not** rely on a separate tag API after create — tags belong on the **same** \`create_app\` call.`;

  if (catalogTag.mode === 'assistant_recommend') {
    return `## Catalog tags — required on \`create_app\` (I asked you to recommend)

${shared}

Because I chose **Recommend for me**:
1. During consultation, recommend tag id(s) from existing platform sections (or propose a new slug) and **wait for my explicit approval** of the primary tag.
2. In your **written plan before scaffold**, list the agreed tag ids in order (primary first).
3. When I approve scaffold, call \`app_management_create_app\` with **\`catalogTagIds: ["<primary>", ...]\`** (or \`catalogTags\` objects) **in that same tool call** — not in chat prose, not in a follow-up step.`;
  }

  return `## Catalog tags — required on \`create_app\`

${shared}

Use my wizard choice: primary tag \`${catalogTag.tagId}\` (pass \`catalogTagIds: ["${catalogTag.tagId}"]\` or equivalent \`catalogTags\` on \`create_app\`).`;
}

export function formatAppBuilderConsultationMessage(draft: AppBuilderConsultationDraft): string {
  const name = draft.displayName.trim();
  const description = draft.description.trim();
  const icon = draft.faIcon.trim();
  const catalogTagLine = formatCatalogTagLine(draft.catalogTag);
  const catalogTagRequirements = formatCatalogTagCreateRequirements(draft.catalogTag);

  return `${APP_BUILDER_CONSULTATION_MARKER}

I completed the App Builder wizard and would like help creating a new THE-LAB app.

## Proposed app (draft)
- **Display name:** ${name}
- **Catalog icon:** \`${icon}\`
- ${catalogTagLine}
- **Description:** ${description}

## What I need from you
This Sidecar tab should be on the **Code** persona (the shell sets that on handoff) so App Management scaffold tools work — **not Chat**.

Please **do not** call App Management tools yet. Start a short consultation:
1. Confirm or refine the display name, description, icon, and **catalog tag id(s)** (see **Catalog tags** section below).
2. Ask what the app should do for users day-to-day (screens, data, integrations).
3. **Check existing THE-LAB apps** (\`app_management_get_apps\`) and **lab-app-integrations** patterns so we reuse Forms Builder, Chart Builder, Task List, CRM, Help Desk, Ledger, etc. instead of reinventing them.
4. Recommend **browser**, **server**, or **hybrid** and explain why in plain language.
5. Propose a registry **app id** (kebab-case) and check for collisions with \`app_management_get_apps\`.
6. When we both agree on scope, summarize the plan — **including agreed \`catalogTagIds\` (primary first)** — and which provider apps / integration slots we will use; ask for explicit approval to scaffold.

${catalogTagRequirements}

After I approve, use App Management to create the app and system instructions (**with catalog tags on the \`create_app\` call** as above). For implementation after scaffold:
- **Forms / CRUD UI** → **Forms Builder** + rm-64 bindings (not inline Vue forms in the host).
- **Charts / reports** → **Chart Builder** + chart bindings (not ad-hoc Chart.js in the host).
- Guide me to **Open Laboratory** (same **Code** persona) for \`src/apps/**\` source work — Sidecar App Builder cannot edit files.`;
}
