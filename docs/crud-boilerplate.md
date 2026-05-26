# CRUD boilerplate

> **Included automatically** when you run `npm run new:service -- <slug> <port>`.  
> You do not run a separate CRUD command — the template ships with a full module, migration, `app.module` wiring, gateway route, and port registry entry.

Every new service gets a **reference CRUD module** you can rename and extend to match your API contract.

## What you get

For `npm run new:service -- billing 4002`:

| Item | Value |
|------|--------|
| Entity | `BillingEntity` → table `n0_billings` |
| Routes | `/api/billings` |
| Module | `src/modules/billings/` |

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/<resources>` | Create (body: `name`, optional `description`) |
| `GET` | `/api/<resources>` | List with `page`, `limit`, `sortBy`, `sortOrder` |
| `GET` | `/api/<resources>/:id` | Get one |
| `PATCH` | `/api/<resources>/:id` | Update |
| `DELETE` | `/api/<resources>/:id` | Delete |

All routes require `Authorization: Bearer <jwt>`. Rows are filtered by `ownerId` = JWT `sub`.

### Files

```
src/entities/<slug>.entity.ts
src/modules/<slug>s/
  <slug>s.module.ts
  <slug>s.controller.ts
  <slug>s.service.ts
  dto/create-<slug>.dto.ts
  dto/update-<slug>.dto.ts
  dto/list-<slug>s-query.dto.ts
src/database/migrations/0001-create-<slug>s-table.ts
```

## First run

```bash
cd services/billing-service
cp .env.example .env
npm install
npm run migration:run
npm run start:dev
```

```bash
curl -X POST http://localhost:4002/api/billings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme invoice"}'
```

## Gateway

`new-service.sh` automatically adds `/api/<resources>` to `proxy.routes.ts` and `BILLING_SERVICE_URL` (etc.) to the gateway `.env.example`.

## Customize

1. Rename fields on the entity and DTOs per your contract  
2. Replace `ownerId` with `workspaceId` for multi-tenant APIs  
3. Delete the boilerplate module if your service has no CRUD (remove import from `app.module.ts`)  
4. Copy `modules/<slug>s/` as a template to add another resource  
5. Run `npm run migration:generate` after entity changes
