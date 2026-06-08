# Service port registry

Reserve ports here before running `npm run new:service`.

| Port | Service | Repo location | Notes |
|------|---------|---------------|-------|
| 3001 | n0-api-gateway | `N0-platform-be/services/api-gateway` | **Public** — FE entry, proxies internally |
| 4000 | n0-auth-service | `NO-auth-api/services/auth-service` | Authentication (internal) |
| 4001 | n0-project-service | `N0-BE/services/project-service` | Workspaces, AI orchestration |
| 4003 | n0-ai-service | `N0-BE/services/ai-service` | Internal generation (`/api/internal/v1/*`) |
| 4099 | n0-example-service | `N0-platform-be/services/example-service` | Scaffold demo (optional) |
| 4004 | *available* | | |
| 5434 | PostgreSQL | docker | Host port → container 5432 |
| 9092 | Kafka | docker | PLAINTEXT localhost |

## Naming convention

- Folder: `services/<slug>-service` (e.g. `billing-service`)
- `SERVICE_NAME` env: `n0-<slug>-service`
- Kafka client id: `n0-<slug>-service`
- Topic prefix: `n0.<slug>.<event>` (e.g. `n0.billing.invoice.created`)
- CRUD routes: `/api/<slug>s` (e.g. `/api/billings`)

Update this file when you claim a port.
