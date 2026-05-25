# Adding a microservice

## 1. Claim a port

Edit [port-registry.md](port-registry.md) and reserve the next free port (e.g. `4002`).

## 2. Generate from template

```bash
cd N0-platform-be
npm run new:service -- billing 4002
```

Creates `services/billing-service/` from `templates/microservice/`.

## 3. Configure environment

```bash
cd services/billing-service
cp .env.example .env
# Edit DATABASE_URL, JWT_ACCESS_SECRET (match auth), PORT, etc.
npm install
```

## 4. Add domain code

1. Define entities in `src/entities/` (match migration SQL).
2. Register entities in `database/database.module.ts` and `database/data-source.ts`.
3. Add `src/modules/<feature>/` (module, controller, service, `dto/`).
4. Import feature module in `app.module.ts`.
5. Run `npm run migration:generate` when schema changes.

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
