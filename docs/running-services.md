# Running services

## What lives where

| Service | Port | In this repo? | Start with |
|---------|------|---------------|------------|
| api-gateway | 3001 | Yes | `npm run dev:gateway` |
| example-service | 4099 | Yes | `npm run dev:example` |
| auth-service | 4000 | `NO-auth-api` (external) | Start in that repo |
| project-service | 4001 | `NO-auth-api` (external) | Start in that repo |

The **frontend** should call only the gateway: `http://localhost:3001/api`.

---

## Option A — Start everything in this monorepo (Turbo)

From `N0-platform-be/`:

```bash
# 1. Infrastructure (once)
npm run infra:up

# 2. Install all workspace deps (once)
npm install

# 3. All services in this repo in parallel (gateway + example + any new ones)
npm run dev
```

Turbo runs the `dev` script in every package under `services/*` at the same time.

**Note:** `npm run dev` does **not** start auth/project from `NO-auth-api`. Start those separately (Option C) if the gateway must proxy to them.

---

## Option B — Start one service only

```bash
# Gateway only (FE entry)
npm run dev:gateway

# Example microservice only
npm run dev:example

# Any workspace by package name (after npm run new:service)
turbo dev --filter=n0-billing-service
```

Or from the service folder:

```bash
cd services/api-gateway
npm run dev
```

---

## Option C — Full local stack (gateway + external auth/project)

Use **4 terminals** (or a process manager):

```bash
# T1 — infra
cd N0-platform-be && npm run infra:up

# T2 — auth (NO-auth-api)
cd NO-auth-api/services/auth-service && npm run start:dev

# T3 — project (NO-auth-api)
cd NO-auth-api/services/project-service && npm run start:dev

# T4 — gateway
cd N0-platform-be && npm run dev:gateway
```

Optional T5 for a new N0 service:

```bash
cd N0-platform-be && npm run dev:example
```

---

## Option D — Docker

```bash
npm run infra:up
docker compose up api-gateway   # after .env on gateway + upstreams running
```

Microservices in `NO-auth-api` are still started on the host unless you containerize them too.

---

## Auth: JWT only

Every protected route requires:

```http
Authorization: Bearer <access_token>
```

There is no dev-user bypass. Get a token from auth-service signup/login, then call the gateway or services.

Public routes (no JWT): gateway health, auth signup/verify-email (see `gateway-auth.middleware.ts`).

---

## Husky (pre-commit)

From `N0-platform-be/`, after `git init` (or if this folder is inside a git repo):

```bash
npm install   # runs `husky` via prepare script
```

Pre-commit runs `lint-staged` → `turbo build` on changed services. If Husky warns `.git can't be found`, initialize git in this directory or the parent monorepo root.

---

## Quick reference

| Goal | Command |
|------|---------|
| All in-repo services | `npm run dev` |
| Gateway only | `npm run dev:gateway` |
| One new service | `turbo dev --filter=n0-<slug>-service` |
| Build all | `npm run build` |
| Test all | `npm run test` |
| Postgres + Kafka | `npm run infra:up` |
