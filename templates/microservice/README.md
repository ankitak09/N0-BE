# __SERVICE_NAME__

NestJS microservice generated from `N0-platform-be/templates/microservice`.

| | |
|--|--|
| Port | `__PORT__` |
| Health | `GET /api/health` |
| Ready | `GET /api/ready` |
| Swagger | `http://localhost:__PORT__/api/docs` |

## Run

```bash
cp .env.example .env
npm install
npm run start:dev
```

## Add a feature module

1. Create `src/entities/<name>.entity.ts`
2. Register in `src/database/database.module.ts`
3. Add `src/modules/<feature>/` (module, controller, service, `dto/`)
4. Import in `src/app.module.ts`
5. Implement from your API contract (`n0-backend-builder` skill)

## Migrations

```bash
npm run migration:generate
npm run migration:run
```
