# GitHub setup — THE-LAB (maintainer guide)

**Audience:** Michael Ballhaus (solo maintainer, personal GitHub account).  
**Strategy:** Public **GitHub** as portfolio source of truth; **fresh git history** on first publish (no Azure DevOps history). **Azure DevOps** can stay private for client work or be retired later.

**Companion checklists:** [github-publish-checklist.md](./github-publish-checklist.md) (legal + secrets) · [ci-v1-contract.md](../ci/ci-v1-contract.md) (CI steps).

---

## 1. What you are optimizing for

| Goal | How GitHub supports it |
|------|-------------------------|
| Portfolio / OSS under AGPL | Public repo + `LICENSE` + `COMMERCIAL.md` |
| No secrets in public history | **New** repo with **one** initial push (not mirror Azure) |
| You control `main` | Branch protection: PR + green CI; only you merge |
| Others can propose changes | Fork + PR; you review; nothing lands without you |

**Not the plan:** operating a public multi-user demo; open registration for strangers.

---

## 2. Repo creation (GitHub website)

1. Sign in at [github.com](https://github.com).
2. **New repository**
   - **Name:** e.g. `THE-LAB` or `the-lab` (pick once; affects clone URL).
   - **Visibility:** **Public**
   - **Initialize:** leave **unchecked** — no README, `.gitignore`, or license on GitHub (you already have them locally).
3. **Create repository** and leave the empty-repo page open (copy the HTTPS URL).

**Default branch:** GitHub defaults to `main`. Either use `main` everywhere or create the repo then change default branch under **Settings → General** before the first push.

---

## 3. Fresh public history (no Azure export)

You chose a **clean** public tree so old `.env` / `*.db` commits never appear on GitHub.

### 3.1 Prepare the tree locally

From `the-lab/` (with licensing, untracked `.env`, CI workflow committed on your working branch):

```powershell
cd the-lab
git status
# Confirm: no .env, no *.db in "to be committed" except intentional deletes from index
```

Finish [github-publish-checklist.md](./github-publish-checklist.md) **Phase A–B** and replace the placeholder business email before going public.

### 3.2 Option A — New orphan branch (recommended)

Creates one root commit with today’s tree; no parent commits.

```powershell
git checkout --orphan github-public
git add -A
git status   # last sanity check: no .env, no *.db
git commit -m "Initial public release (AGPL-3.0)"
```

Rename branch to match GitHub default if you want `main`:

```powershell
git branch -M main
```

### 3.3 Option B — Separate folder export

If you prefer not to touch Azure branch names: clone a **copy** of the repo, delete `.git`, `git init -b main`, single commit. Same outcome.

### 3.4 Push only to GitHub

```powershell
git remote add github https://github.com/<YOUR_USER>/<REPO>.git
git push -u github main
```

**Do not** `git push github --all` from old Azure branches unless you explicitly want that history on GitHub.

### 3.5 Keep Azure DevOps separate

| Remote | Role |
|--------|------|
| `origin` | Azure DevOps — private, full history, your day job flow |
| `github` | Public portfolio — `main` only (or release tags) |

Optional: push **tags** only to GitHub for releases (`git push github v1.0.0-public`).

---

## 4. Pull requests — how they work here

```text
Contributor (fork)     You (this repo)
     |                      |
     |-- fork + branch -----|
     |-- open PR ---------->|
     |                   CI runs on PR branch
     |                   You review
     |<-- merge or close --|
```

- A **PR** is a proposal: “merge this branch into `main`.”
- **Merge does not happen** until you click **Merge** (unless you enable auto-merge with rules you control).
- **Fork users** have **no write** access to your repo — only a PR.
- Under AGPL, you may accept or reject contributions; no obligation to merge.

### Your own work (solo maintainer)

Two habits (both safe with branch protection):

1. **Branch + PR** (recommended): `git checkout -b fix/kb-seed`, push branch, open PR on GitHub, merge when CI is green — same path contributors use.
2. **Direct to `main`:** only if branch protection allows **admin bypass** and you trust yourself — easier to skip and accidentally skip CI; prefer PRs.

---

## 5. Protect `main` (required)

**Settings → Rules → Rulesets** (preferred on newer GitHub) or **Settings → Branches → Branch protection rules**.

Target branch: **`main`** (or `master` if you kept that name).

### Recommended settings

| Rule | Setting |
|------|---------|
| Require pull request before merging | **On** |
| Required approvals | **1** |
| Require review from Code Owners | **On** (after you add [CODEOWNERS](../../.github/CODEOWNERS)) |
| Require status checks to pass | **On** — select job **`build-and-test`** from workflow **CI v1** |
| Require branches to be up to date | **On** (optional but tidy) |
| Restrict who can push | **Admins only** or “restrict pushes” to yourself |
| Allow force pushes | **Off** |
| Allow deletions | **Off** |
| Require linear history | Optional (cleaner log; no merge commits if you use rebase merge) |

After the **first** CI run on `main`, the check name appears in the dropdown for “required status checks.” If it is missing:

1. Push `main` once (with `.github/workflows/ci.yml`).
2. Open **Actions** tab and wait for green run.
3. Return to branch protection and select the check.

### CODEOWNERS

File: [`.github/CODEOWNERS`](../../.github/CODEOWNERS) — replace `YOUR_GITHUB_USERNAME` with your handle. GitHub auto-requests your review on PRs that touch files.

---

## 6. Permissions & collaboration

**Settings → Collaborators and teams** (personal repo):

| Role | When |
|------|------|
| **No collaborators** | Default — only you push (via PR merge as admin) |
| **Write** | Trusted co-maintainer only |
| **Triage / Read** | Rare for solo portfolio |

**Settings → General → Features:**

| Feature | Suggestion |
|---------|------------|
| **Issues** | On if you want feedback; Off if you want email-only |
| **Discussions** | Optional Q&A |
| **Projects / Wiki** | Off unless you use them |
| **Pull requests — squash merge only** | On if you want one commit per PR on `main` |

**Settings → Code security and analysis:**

- **Secret scanning** — on (default for public repos).
- **Dependabot alerts** — on (optional PRs for CVEs; you still approve merges).

---

## 7. CI on GitHub Actions

Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

Runs on:

- Push to `main` / `master`
- Every pull request targeting `main` / `master`

Commands match Azure CI v1: `npm ci` → `lint` → `type-check` → `verify:test-tiers` → `test:ci` → `build`.

**First-time failure tips:**

- Node 20 on `ubuntu-24.04` — same as Azure.
- No secrets needed for this workflow.
- If a step fails, fix on a branch; do not disable branch protection to “force merge.”

---

## 8. Azure vs GitHub — one-time decisions

| Question | Suggested answer for you |
|----------|---------------------------|
| Canonical forge for portfolio | **GitHub** public |
| Azure DevOps | Keep private mirror or stop pushing product there when comfortable |
| Dual CI | Avoid long term — GitHub Actions only for public repo |
| Branch name | Prefer **`main`** on GitHub for social convention |

---

## 9. After first public push

- [ ] Branch protection on `main` + required **CI v1** check  
- [ ] CODEOWNERS username updated  
- [ ] Repo **About**: short blurb + topics (`mcp`, `agents`, `vue`, `typescript`, `rag`)  
- [ ] README clone URL uses GitHub HTTPS  
- [ ] Optional tag: `v0.1.0-public`  
- [ ] Resume bullet with repo URL  

Workspace tracker: [`plans/the-lab-github-oss-launch.md`](../../../plans/the-lab-github-oss-launch.md) (parent `LLM_Workspace`).

---

## 10. Quick reference — contributor message for README

You can paste a shortened version into README if you want:

```markdown
## Contributing

Open a PR from a fork. `main` is protected: CI must pass and the maintainer must approve before merge. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/operations/github-setup.md](docs/operations/github-setup.md).
```

---

## 11. Troubleshooting

| Problem | Fix |
|---------|-----|
| Can’t select CI check in branch protection | Run Actions once on `main`; use exact job name `build-and-test` |
| PR from fork: CI doesn’t run | **Settings → Actions → General** → allow workflows for fork PRs (default for public repos) |
| Accidentally pushed secret | Rotate credential; use GitHub secret scanning alert; rewrite history only if repo is new |
| Want to unpublish | Make repo private or delete — AGPL already published may still have forks |

---

## Related

- [github-publish-checklist.md](./github-publish-checklist.md)
- [production-deploy-checklist.md](./production-deploy-checklist.md) — when you add hosting later
- [COMMERCIAL.md](../../COMMERCIAL.md) · [SECURITY.md](../../SECURITY.md)