import type { KbDocCategory, KbDocSeed } from './seed-kb-docs';

/** Target minimum length for human-facing KB bodies (roughly one screen+ of prose). */
export const KB_HUMAN_BODY_MIN_CHARS = 1_600;

/** Markdown `##` with optional reader icon snippet (see `parseKbSectionHeading`). */
export function kbSectionHeading(title: string, icon?: string): string {
  const suffix = icon?.trim() ? `{{${icon.trim()}}}` : '';
  return `## ${title}${suffix}`;
}

function normalizeHeadings(body: string): string {
  return body.replace(/^### /gm, '## ');
}

function leadForArticle(article: KbDocSeed): string {
  switch (article.category) {
    case 'Getting started':
      return (
        `This guide explains **${article.title}** for people using THE-LAB day to day. ` +
        'It complements the in-product UI and the agent tools — you do not need to read source code to follow it.'
      );
    case 'Apps':
      return (
        `**${article.title}** is a launchable THE-LAB app. This article covers what it is for, ` +
        'how you reach it in the shell, and how it connects to Forms Builder, Chart Builder, and other hosts through integration bindings.'
      );
    case 'Integrations':
      return (
        `**${article.title}** describes how THE-LAB apps share UI and data through the integration layer ` +
        '(manifests, bindings, connectors, and provider apps). Use it when wiring or debugging a host slot.'
      );
    case 'Platform':
      return (
        `**${article.title}** is platform behaviour that applies across apps — shell chrome, auth, ` +
        'messaging, theming, or seed data. Platform docs change with releases; check Settings when numbers differ.'
      );
    case 'Operations':
      return (
        `**${article.title}** covers running and maintaining your lab stack locally or in CI. ` +
        'Keep terminal commands handy when onboarding teammates or recovering from a failed start.'
      );
    case 'Agents':
      return (
        `**${article.title}** is written for people who configure personas and MCP tools. ` +
        'Agents still read structured `agent_view` JSON via `lab_kb_get`; this prose is the human-readable companion.'
      );
    case 'Reference':
      return (
        `**${article.title}** is a reference note — definitions, naming rules, and cross-app contracts. ` +
        'Skim it when you need a precise term or id, then follow links to deeper guides.'
      );
    default:
      return `This article documents **${article.title}** in the lab knowledge base.`;
  }
}

function whoSection(category: KbDocCategory): string {
  const map: Record<KbDocCategory, string> = {
    'Getting started': [
      kbSectionHeading('Who should read this', 'pi pi-users'),
      '',
      'New lab members, demo presenters, and anyone launching apps for the first time. If you are automating workflows, pair this with **Agents** articles and `lab_kb_app_context` for live registry data.',
    ].join('\n'),
    Apps: [
      kbSectionHeading('Who should read this', 'pi pi-users'),
      '',
      'Product owners validating a catalog or platform app, integrators binding forms/charts, and support engineers tracing a record across CRM, Task List, or Help Desk.',
    ].join('\n'),
    Integrations: [
      kbSectionHeading('Who should read this', 'pi pi-users'),
      '',
      'Developers and agents authoring or reviewing `lab_integrations_*` bindings, connector routes, and discovery contracts.',
    ].join('\n'),
    Platform: [
      kbSectionHeading('Who should read this', 'pi pi-users'),
      '',
      'Admins configuring auth, themes, or seed packs, and developers building shell features that must honour lab tokens.',
    ].join('\n'),
    Operations: [
      kbSectionHeading('Who should read this', 'pi pi-users'),
      '',
      'Anyone running `npm run lab:start`, debugging port conflicts, or aligning local setup with CI smoke tests.',
    ].join('\n'),
    Agents: [
      kbSectionHeading('Who should read this', 'pi pi-users'),
      '',
      'Persona authors, workflow designers, and engineers extending MCP tools or system instructions.',
    ].join('\n'),
    Reference: [
      kbSectionHeading('Who should read this', 'pi pi-users'),
      '',
      'Readers who already know the feature area and need exact vocabulary, ids, or data-shape rules.',
    ].join('\n'),
  };
  return map[category];
}

function practiceSection(article: KbDocSeed): string {
  const registry =
    article.appId != null
      ? `Open the app from the catalog (registry id \`${article.appId}\`). Hybrid apps expose HTTP on \`props.serverUrl\` — not port **3000**.`
      : 'Open related apps from the catalog when this guide references connectors or bindings.';
  return [
    kbSectionHeading('In practice', 'pi pi-play'),
    '',
    registry,
    '',
    '1. Read the **Overview** sections above.',
    '2. Launch the app (or host) and confirm `GET /health` succeeds if the article mentions a server process.',
    '3. For dialogs or charts, open **Settings → Integrations** (or use `lab_integrations_list_bindings`) and confirm the slot is bound — an unbound slot renders nothing.',
    '4. If behaviour disagrees with this article, prefer **live** `app_system_instructions` via `lab_kb_app_context` over stale prose.',
  ].join('\n');
}

function troubleshootingSection(): string {
  return [
    kbSectionHeading('Troubleshooting', 'pi pi-wrench'),
    '',
    '| Symptom | What to check |',
    '| --- | --- |',
    '| Dialog or chart missing | Binding exists, provider app running, stub asset provisioned |',
    '| 401 on connector or discovery | Signed in to THE-LAB; hybrid app server running |',
    '| Stale instructions | Run `lab_kb_app_context` instead of quoting old article text |',
    '| Demo data looks wrong | Settings → App demo data — re-apply or remove the relevant pack |',
  ].join('\n');
}

function relatedSection(article: KbDocSeed): string {
  const related = article.agentView?.relatedSlugs?.slice(0, 4) ?? [];
  if (related.length === 0) {
    return [
      kbSectionHeading('Related reading', 'pi pi-book'),
      '',
      '- **How form and chart bindings work** — integration overview',
      '- **The connector model** — discovery and lookups',
      '- **Glossary** — shell terminology',
    ].join('\n');
  }
  const links = related.map((slug) => `- \`${slug}\``).join('\n');
  return [kbSectionHeading('Related reading', 'pi pi-book'), '', links].join('\n');
}

function accountModelExpansion(): string {
  return [
    '## Account and contact rules',
    '',
    'Treat **accounts** as companies and **contacts** as people. Every contact should store:',
    '',
    '- `company` — display text you show in lists and charts.',
    '- `companyId` — foreign key into `accounts` when the picker resolved a row.',
    '',
    'Downstream catalog apps (Task List metadata, Help Desk ticket notes, expense lines) often store the **company name as text** because they do not share CRM’s database file. That is intentional: the lab simulates loosely coupled products, not one monolithic schema.',
    '',
    '## Hero accounts in demo data',
    '',
    '**Northwind Labs** and **Summit Health** are the narrative anchors in CRM demo seeds. When you see those names in Help Desk or Task List samples, they should match CRM account names exactly.',
    '',
    '## When not to create an account',
    '',
    'Applicants, tenants, vendors, and anonymous voters should stay in their own entities. Promoting them to CRM accounts blurs reporting and breaks chart dimensions that expect CRM semantics.',
  ].join('\n');
}

function supplementalForSlug(slug: string): string | null {
  if (slug === 'the-account-and-contact-model') {
    return accountModelExpansion();
  }
  return null;
}

/**
 * Ensures seeded `body` markdown is long and well-structured for human readers.
 * Agent JSON (`agentView`) is unchanged.
 */
export function enrichKbHumanBody(article: KbDocSeed): string {
  const core = normalizeHeadings(article.body.trim());
  const extra = supplementalForSlug(article.slug);
  const blocks = [
    kbSectionHeading('Overview', 'pi pi-info-circle'),
    '',
    leadForArticle(article),
    '',
    core,
    '',
    extra ?? '',
    whoSection(article.category),
    '',
    practiceSection(article),
    '',
    troubleshootingSection(),
    '',
    relatedSection(article),
  ].filter((block) => block.trim().length > 0);

  let body = blocks.join('\n');
  if (body.length < KB_HUMAN_BODY_MIN_CHARS) {
    body += `\n\n${kbSectionHeading('Source', 'pi pi-file')}\n\nDerived from \`${article.sourcePath}\` in the repository. Update the seed when the source doc changes, then restart the Knowledge Base app to reconcile rows tagged \`docs:\`.`;
  }
  return body;
}

export function enrichKbDocSeed(article: KbDocSeed): KbDocSeed {
  return {
    ...article,
    body: enrichKbHumanBody(article),
  };
}
