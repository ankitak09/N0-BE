# Security baseline (all N0 services)

## Public surface

| Environment | FE talks to | Internal services |
|-------------|-------------|-------------------|
| Local | `api-gateway` :3001 | `localhost:4000+` (not exposed to internet) |
| Production | Load balancer → **gateway only** | Private network / K8s cluster DNS |

Microservices should **not** be reachable from the public internet in production. The gateway terminates TLS, rate limits, validates JWT, and proxies over the internal network.

## Required controls (template-enforced)

- `helmet` security headers
- Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`)
- `@nestjs/throttler` rate limiting
- `x-request-id` on every request/response
- Standard FE envelopes: `api-response.ts` / `api-error.ts` + `HttpExceptionFilter`
- TypeORM only (`synchronize: false`); no string-concatenated SQL
- JWT only: `Authorization: Bearer <token>` via `JwtAuthGuard` (services) or gateway middleware (proxied routes)
- Swagger disabled in production unless `ENABLE_SWAGGER=true`

## Secrets

- `JWT_ACCESS_SECRET` ≥ 32 characters; shared only between auth-service and validators
- Never commit `.env`; rotate secrets per environment

## SQL injection

- Use repositories / `QueryBuilder` with bound parameters
- Whitelist `orderBy` / `sort` columns in list DTOs
- Ban raw `.query(userInput)` in code review

## Checklist before go-live

- [ ] `NODE_ENV=production` on all services
- [ ] Gateway is the only public HTTP entry
- [ ] All protected routes reject requests without a valid Bearer token
- [ ] Kafka / Postgres not on public ports
- [ ] Dependency audit in CI (`npm audit`)
