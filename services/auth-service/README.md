# n0-auth-service

NestJS microservice generated from `N0-platform-be/templates/microservice`.

| | |
|--|--|
| Port | `4000` |
| Health | `GET /api/health` |
| Ready | `GET /api/ready` |
| Swagger | `http://localhost:4000/api/docs` |

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

Creates tables: `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `oauth_states`.

From **monorepo root** (`N0-BE/`):

```bash
npm run migration:auth
```

From this service directory:

```bash
npm run migration:run
```

Verify tables:

```bash
psql "$DATABASE_URL" -c "\\dt users"
psql "$DATABASE_URL" -c "\\dt refresh_tokens"
```

After entity changes:

```bash
npm run migration:generate
npm run migration:run
```
