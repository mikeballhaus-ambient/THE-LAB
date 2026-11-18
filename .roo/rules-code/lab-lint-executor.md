# Lab lint executor (Code mode) — minimal rules overlay

Use when `MANIFEST_ID=` is set in the user message. **Do not load** full-repo context.

1. Read only: `plans/lab-lint-fixes/phases/00-agent-rules.md`, `phases/{MANIFEST_ID}.md`, `docs/manifests/{MANIFEST_ID}.md`, `docs/fix-playbooks.md`.
2. For line numbers: `npm run lint-file "<path>"` — **do not** paste or read entire `lint-errors-line-level.md`.
3. Edit **only** paths in the manifest. Gate: `npm run verify-lint-phase -- {MANIFEST_ID}`.
4. Lint-only; keep `type-check:ci` green; no global `eslint-disable`.

**Do not use Roo's `skill` tool** — there is no project skill for this workflow; use `read_file` on the paths above.
