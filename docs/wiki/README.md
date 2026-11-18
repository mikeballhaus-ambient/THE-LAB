# Self-host wiki (source for GitHub Wiki)

Markdown here is written for **people running their own THE-LAB** — not for in-product Knowledge Base / RAG.

## Publish to GitHub Wiki

### One-time (GitHub)

1. **Settings → General → Features** → enable **Wikis**.
2. **Wiki** tab → create **Home** (paste `Home.md` or any placeholder). GitHub must have a wiki repo before automation can push.

### Automated sync (recommended)

On every push to **`main`** that touches `docs/wiki/**`, workflow [`.github/workflows/sync-wiki.yml`](../../.github/workflows/sync-wiki.yml) runs `npm run sync:github-wiki`.

**Local manual sync** (after `gh auth login` or with a token):

```bash
npm run sync:github-wiki
# dry run (no push):
# WIKI_DRY_RUN=1 npm run sync:github-wiki
```

`README.md` in this folder is maintainer-only and is **not** copied to the wiki.

**Do not** start wiki pages with `# Title` — GitHub Wiki already shows the page title from the filename (e.g. `Production-and-Security.md` → “Production and Security”). Use `##` for the first heading in the body.

**Canonical deep docs** stay in [`docs/`](../) on `main`; wiki pages summarize and link there. Edit markdown here, merge to `main`, and the wiki updates automatically.