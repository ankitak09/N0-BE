# Feature modules

Add one folder per domain aggregate, e.g. `billing/`, `notifications/`.

## Checklist per module

```
modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── workspace-access.service.ts   # if multi-tenant / workspace scoped
└── dto/
    ├── create-*.dto.ts
    ├── update-*.dto.ts
    └── list-*-query.dto.ts
```

1. Register entities in `database/database.module.ts` + `TypeOrmModule.forFeature([...])` in the feature module.
2. Global `JwtAuthGuard` is on by default — use `@Public()` only for intentionally open routes. Send `Authorization: Bearer <token>`.
3. Return plain DTOs from handlers; `ApiResponseInterceptor` wraps them as `{ success, data, meta }`.
4. Throw `AppException` or Nest `HttpException` with `{ code, message }` for consistent FE errors.
5. Document endpoints in service `README.md`.

See `NO-auth-api/services/project-service/src/modules/projects/` for a full example.
