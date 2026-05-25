# N0 Platform Backend Scaffold

Production-oriented **multi-microservice** monorepo template for the N0 platform. Use this folder to bootstrap new services or as the target layout when splitting `NO-auth-api`.

## Layout

```
N0-platform-be/
├── docker-compose.yml       # Postgres + Kafka (+ optional service containers)
├── package.json             # Root orchestration scripts
├── scripts/
│   └── new-service.sh       # Generate a new microservice from template
├── templates/
│   ├── microservice/        # Canonical NestJS service template
│   └── api-gateway/         # Public edge — proxy + JWT + rate limit
├── services/
│   ├── api-gateway/         # Run on :3001 — FE should call this only
│   └── <slug>-service/      # Generated internal services (:4002+)
└── docs/
    ├── architecture.md
    ├── demo-mental-model.md # Demo / slides — full mental model
    ├── security.md
    ├── fe-api-contract.md   # Success/error JSON for the FE
    ├── adding-a-service.md
    ├── running-services.md  # Start all vs one service (Turbo)
    └── port-registry.md
```

## Tech stack (every service)

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| ORM | TypeORM + PostgreSQL |
| Events | Kafka (`kafkajs`, optional via `ENABLE_KAFKA`) |
| API docs | Swagger → `/api/docs` + `docs/openapi.json` |
| Tests | Jest (unit + e2e) |
| Auth | JWT Bearer only (`JWT_ACCESS_SECRET` shared with auth-service) |
| Monorepo | npm workspaces + Turborepo + Husky |

## Quick start

```bash
cd N0-platform-be

# 1. Infrastructure
cp .env.example .env
npm run db:up
npm run kafka:up

# 2. Install monorepo deps + git hooks
npm install

# 3. Start all in-repo services (gateway + example, …)
npm run dev
# Or gateway only: npm run dev:gateway

# 4. Create a new internal microservice (e.g. billing on port 4002)
npm run new:service -- billing 4002
```

Point the frontend at `http://localhost:3001/api`. Auth/project from `NO-auth-api` must run separately for full proxy flow — see [docs/running-services.md](docs/running-services.md).

## Relation to `NO-auth-api`

Existing services can stay in `NO-auth-api/services/` until you migrate them here:

| Service | Suggested port | Status |
|---------|----------------|--------|
| auth-service | 4000 | live in NO-auth-api |
| project-service | 4001 | live in NO-auth-api |
| *new services* | 4002+ | create with `npm run new:service` |

See [docs/adding-a-service.md](docs/adding-a-service.md) and use the Cursor skill `n0-backend-builder` (in `NO-auth-api/.cursor/skills/`) when implementing from API contracts.

## Root scripts

| Script | Action |
|--------|--------|
| `npm run db:up` | Start Postgres (`localhost:5434`) |
| `npm run kafka:up` | Start Kafka (`localhost:9092`) |
| `npm run new:service -- <slug> <port>` | Scaffold `services/<slug>-service` |
| `npm run dev` | Start **all** `services/*` in parallel (Turbo) |
| `npm run dev:gateway` | Gateway only (`:3001`) |
| `npm run dev:example` | Example service only (`:4099`) |
| `npm run build` | Build all services (Turbo) |
