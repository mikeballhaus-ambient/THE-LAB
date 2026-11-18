# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `master` / `main` (latest) | Yes |
| Older forks | Best effort |

THE-LAB is a **portfolio / self-host playground**, not a vendor SLA product.

## Reporting a vulnerability

1. **Do not** open a public GitHub issue for exploitable security bugs.
2. Email **[ambienttechnologygroup@gmail.com](mailto:ambienttechnologygroup@gmail.com)** with:
   - Description and impact
   - Steps to reproduce (or proof of concept)
   - THE-LAB version or commit hash
3. Allow **90 days** for a fix before public disclosure (negotiable for critical issues).

## Safe self-hosting expectations

- Run with **`LAB_PRODUCTION_PROFILE=1`** when exposed beyond localhost.
- Set strong **`LAB_JWT_SECRET`** and **`LAB_APP_SERVICE_TOKEN`**; never commit `.env`.
- Restrict **MCP tools** (especially terminal and UI automation) for untrusted users — see [docs/mcp/production-mcp-policy.md](docs/mcp/production-mcp-policy.md).
- Keep **LLM API keys** server-side only; do not embed secrets in `VITE_*` client variables.

## Secret leaks in git history

If you forked THE-LAB and find committed secrets, **rotate those credentials immediately** and consider history rewrite (`git filter-repo`) before making the repo public.