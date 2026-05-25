# n0-api-gateway

**Single public HTTP entry** for the Next.js frontend. Validates JWT, applies rate limits and security headers, then proxies to internal microservices.

| | |
|--|--|
| Port | `3001` |
| Health | `GET /api/health` |
| Auth (proxied) | `POST /api/auth/*` → `AUTH_SERVICE_URL` |
| Projects (proxied) | `/api/workspaces`, `/api/projects`, `/api/folders` → `PROJECT_SERVICE_URL` |

## Layered security model

```
Internet / FE
    ↓  HTTPS (production)
API Gateway (:3001)  ← helmet, throttler, JWT, CORS, request-id
    ↓  HTTP private network (localhost / VPC / mesh)
auth-service (:4000), project-service (:4001), …
    ↓
PostgreSQL, Kafka (never public)
```

In production, only the gateway receives traffic from the load balancer. Microservice ports are bound to internal interfaces or cluster DNS.

## Run

```bash
cp .env.example .env
# Start auth (4000) and project (4001) services first
npm install
npm run start:dev
```

## Add a new upstream

1. Edit `src/proxy/proxy.routes.ts`
2. Set `*_SERVICE_URL` in `.env`
3. If routes need to be public, add patterns to `gateway-auth.middleware.ts`
