# rm-67.2 — Executor closeout (2026-11-11)

Engineering pass complete for **hardcoded mist/slate/chrome → `lab-*` tokens** on shell, shared kit, Forms Builder, CRM admin surfaces, MCP formatters, and catalog apps in scan scope.

## Waves delivered

| Wave | Scope | Outcome |
|------|--------|---------|
| A | Forms Builder designer + property/connector chrome | Tokenized; owner OK on designer light preset |
| B | Dashboard settings, chat chrome, todo/file overlays | Tokenized |
| C | `shared/composables/mcp/utils/*` HTML formatters | Tokenized |
| D | CRM admin, ai-tunes cards, example-server, platform form seeds | Tokenized |
| Policy | [platform-theming.md](../../docs/platform/platform-theming.md) § Colour utilities | Done |
| Guard | `npm run verify:theme-colors` + CI test | Green |

## Tooling

- `src/scripts/codemod-legacy-palette-to-lab.ts` — mechanical migration (re-runnable)
- `npm run verify:theme-colors` — regression gate (exempt teaching apps + preset sources)

## Exemptions (documented)

| Path | Reason |
|------|--------|
| `src/apps/dnd-examples/**` | Teaching DnD samples |
| `src/apps/ui-component-gallery/**` | Component demos |
| `src/assets/styles/lab-app-palette.css`, `lab-chat-shell.css` (legacy normalizers) | Bridge / compat |
| Theme preset token files | Intentional `legacy-mist-*` keys |
| Game board art (e.g. billiards felt) | Domain chrome only where not in grep scope |

## Verify (executor)

- `npm run verify:theme-colors` — ok
- `npm run test:path "verify-theme-colors"` — ok
- `npm run test:path "lab-theme-presets"` — ok
- `npm run build` — ok

## Owner gate

**Pending** — full preset checklist per [rm-67.2 plan](../roadmap/rm-67.2-hardcoded-colors-theme-tokens-audit.md). Mike tests when ready; then [OWNER-REVIEW-CHECKPOINT.md](./OWNER-REVIEW-CHECKPOINT.md).

## Sibling

- **rm-67.5** — PrimeVue PT / control depth (optional overlap)
