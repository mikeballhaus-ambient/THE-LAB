# GitHub open-source publish checklist

**Goal:** Public GitHub repo with AGPL + commercial grant, no secrets in history, CI v1 on GitHub Actions.  
**Full maintainer guide (fresh history, PRs, branch protection):** [github-setup.md](./github-setup.md)  
**Canonical repo today:** Azure DevOps `origin` — GitHub is additive or becomes primary after cutover.

**Not legal advice.** Confirm AGPL + dual commercial grant with counsel before the first public push.

---

## Phase A — Legal & branding (local, no push yet)

- [ ] `LICENSE` (AGPL-3.0) at repo root
- [ ] `COMMERCIAL.md`, `SECURITY.md`, `CONTRIBUTING.md`
- [ ] README **License** and **Author** sections updated
- [x] Business contact **`ambienttechnologygroup@gmail.com`** in COMMERCIAL, SECURITY, README
- [ ] `package.json` includes `"license": "AGPL-3.0-or-later"` (npm metadata only)

---

## Phase B — Secrets & local-only files

| Risk | Action |
|------|--------|
| **`.env` tracked** | Run `git rm --cached .env` (file stays on disk; `.gitignore` already ignores it) — **done in index** for current prep |
| **`*.db` were tracked** | Run `git ls-files '*.db' \| xargs git rm --cached` — **done in index**; history may still contain old blobs → use BFG/`filter-repo` before **first public** push if clones must not download DB files |
| **Secrets in git history** | If `.env` or keys were ever committed: **rotate** JWT, API keys, tokens; run [BFG](https://rfrail.github.io/bfg-repo-cleaner/) or `git filter-repo` before public push |
| **`*.db` in working tree** | Already gitignored; `git rm --cached` any stragglers if `git ls-files '*.db'` lists files |
| **`.neuralmemory/`** | Local agent memory — consider `git rm --cached -r .neuralmemory` if not meant for public |

Verify:

```bash
git ls-files .env .env.* '*.db' chroma-data/
# should print nothing (except .env.example)
```

---

## Phase C — GitHub remote

Follow **[github-setup.md](./github-setup.md)** §2–3 (create repo, **orphan `main`**, push **only** to GitHub).

Summary:

1. Empty **public** repo on GitHub (no generated README).
2. Local **`git checkout --orphan main`** → one commit → `git push -u github main`.
3. **Do not** push Azure history to GitHub.
4. After push: branch protection + CODEOWNERS per **github-setup.md** §5–6.

---

## Phase D — CI parity

- [ ] `.github/workflows/ci.yml` matches [ci-v1-contract.md](../ci/ci-v1-contract.md)
- [ ] First green Actions run on default branch
- [ ] Azure Pipelines: keep, mirror, or retire (pick one; avoid dual maintenance long term)

---

## Phase E — Portfolio narrative

- [ ] README: clone + `npm run dev` quick start (already present)
- [ ] Optional: 5-minute **local** demo script or screen recording link
- [ ] Resume bullet: public GitHub repo URL

---

## Phase F — Post-publish

- [ ] GitHub repo description + topics (`agents`, `mcp`, `vue`, `rag`, …)
- [ ] Pin README “Author” and license badges
- [ ] Issues/Discussions on or off (your choice)
- [ ] Dependabot (optional)

---

## Related

- [Production deploy checklist](production-deploy-checklist.md) — self-host beyond localhost
- Workspace meta: [`plans/the-lab-github-oss-launch.md`](../../../plans/the-lab-github-oss-launch.md) (parent `LLM_Workspace`; open that workspace root to edit)