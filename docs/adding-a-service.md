# Adding a microservice

## 1. Claim a port

Edit [port-registry.md](port-registry.md) and reserve the next free port (e.g. `4002`).

## 2. Generate from template (includes CRUD)

```bash
cd N0-BE
npm run new:service -- billing 4002
```

Creates `services/billing-service/` from `templates/microservice/` with:

- Full CRUD at `/api/billings` (entity, DTOs, controller, service, migration)
- `BillingsModule` registered in `app.module.ts`
- Gateway route `/api/billings` → `BILLING_SERVICE_URL`
- Port row in `docs/port-registry.md`

## 3. Configure environment

```bash
cd services/billing-service
cp .env.example .env
# Edit DATABASE_URL, JWT_ACCESS_SECRET (match auth), PORT, etc.
npm install
```

## 4. Add domain code

A **reference CRUD module** is already generated (e.g. `/api/billings` for `billing-service`). See [crud-boilerplate.md](crud-boilerplate.md).

1. Customize or remove `src/modules/<slug>s/` to match your API contract.
2. Run `npm run migration:run` after first generate.
3. Copy the generated CRUD module folder to add another resource, or delete it if unused.
4. Run `npm run migration:generate` when you change entities.

Use Cursor:

```
Use n0-backend-builder.
Module: billing
Contract: path/to/API_CONTRACT.md
Service: billing-service (N0-platform-be/services/billing-service)
```

## 5. Wire docker (optional)

Add a service block to root `docker-compose.yml` when you need containerized deploy:

```yaml
  billing-service:
    build: ./services/billing-service
    ports:
      - "4002:4002"
    env_file:
      - ./services/billing-service/.env
    depends_on:
      postgres:
        condition: service_healthy
```

## 6. Verify

```bash
npm run build
npm run start:dev
curl http://localhost:4002/api/health
open http://localhost:4002/api/docs
```

## Migrating from NO-auth-api

Copy an existing service into `services/`, then align:

- [ ] `package.json` name/scripts match template
- [ ] `Dockerfile` EXPOSE matches `PORT`
- [ ] Root `N0-platform-be` docker-compose or keep using NO-auth-api compose during transition
- [ ] Update port-registry.md
