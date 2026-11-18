# Production and Security

THE-LAB defaults to **local development**. Treat anything reachable on a network as **production**.

## Minimum production env

| Variable | Purpose |
|----------|---------|
| `LAB_PRODUCTION_PROFILE=1` | Stricter MCP, CORS, chat policy |
| `LAB_ALLOWED_ORIGINS` | Comma-separated browser origins (required with production profile) |
| `LAB_JWT_SECRET` | Session signing |
| `LAB_APP_SERVICE_TOKEN` | App servers calling platform `:3000` |

Checklist: [docs/operations/production-deploy-checklist.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/operations/production-deploy-checklist.md).

## MCP and agents

With production profile, dangerous tools (e.g. **terminal**, raw app execution) tighten to **owner/admin**. Members may still use scoped file tools when app permissions allow.

Policy: [docs/mcp/mcp-production-policy.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/docs/mcp/mcp-production-policy.md).

**You are responsible** for who gets which persona and which MCP tools on an exposed instance.

## AGPL awareness

Network users interacting with a modified THE-LAB may trigger **AGPL** obligations. For proprietary deployment without source distribution duties, use a [commercial license](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/COMMERCIAL.md).

## Report vulnerabilities

Do not open public issues for exploitable bugs — email per [SECURITY.md](https://github.com/mikeballhaus-ambient/THE-LAB/blob/main/SECURITY.md).