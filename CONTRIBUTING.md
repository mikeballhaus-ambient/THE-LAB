# Contributing to THE-LAB

Thanks for your interest. THE-LAB is an AGPL-3.0 project; contributions you submit are expected to be licensed under the same terms unless we agree otherwise in writing.

## Before you start

1. Read [`LICENSE`](LICENSE) and [`COMMERCIAL.md`](COMMERCIAL.md).
2. For product behaviour, see [`AGENTS.md`](AGENTS.md) and [`docs/`](docs/).
3. Run the **CI v1** chain locally before opening a PR:

   ```bash
   npm ci
   npm run lint
   npm run type-check
   npm run verify:test-tiers
   npm run verify:domain-event-manifests
   npm run test:ci
   npm run build
   ```

   Details: [`docs/ci/ci-v1-contract.md`](docs/ci/ci-v1-contract.md).

## Domain event catalog (app-authored)

When an app publishes lab domain events:

1. Add a row to `src/apps/<app-dir>/shared/lab-domain-events.manifest.ts` (platform-only events use `src/shared/lab-domain-events/platform-lab-domain-events.manifest.ts`).
2. Register the manifest in `src/shared/lab-domain-events/domain-event-manifest-index.ts`.
3. Run `npm run verify:domain-event-manifests` — it checks index ↔ disk and duplicate `eventType` values.

Authoring guide: [`docs/platform/lab-domain-events.md`](docs/platform/lab-domain-events.md).

## Pull requests

- **Maintainer workflow (branch protection, fresh public history):** [docs/operations/github-setup.md](docs/operations/github-setup.md)
- Target **`main`** on GitHub (Azure may still use `master` privately).
- One logical change per PR when possible.
- No secrets, `.env`, or `*.db` files.
- No unrelated formatting sweeps.

## Conduct

Be professional. This is an enterprise-minded playground; keep discussions technical and respectful.

## Questions

Open a **Discussion** or issue on GitHub for design questions. Security issues: see [`SECURITY.md`](SECURITY.md).