## Stay current

```bash
git fetch origin
git checkout main
git pull origin main
npm ci
```

If you work on a branch (e.g. `Mick`), merge or rebase `main` before opening a PR.

**Pre-merge quality bar (contributors):** `npm run test:pipeline` — lint, type-check, test tiers, domain-event manifest verify, `test:ci`, build. See [CI v1 contract](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/ci/ci-v1-contract.md).

## Database and demos

Pulling code does not reset SQLite. App registry and demos sync on backend init; per-app DBs live under each app folder.

**Demo data:** admins can use **Settings → App Demo Data** tiers — [app demo seeding](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/platform/app-demo-data-seeding.md).

## Forks

Fork on GitHub, branch, PR to `main`. Upstream uses branch protection + **CI v1** on pull requests.

Contributing: [CONTRIBUTING.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/CONTRIBUTING.md).