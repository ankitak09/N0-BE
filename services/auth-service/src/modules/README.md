# Feature modules

Add real auth routes here (e.g. `modules/auth/` for signup, login, session).

| Method | Path (via gateway) |
|--------|-------------------|
| `POST` | `/api/auth/signup/request` |
| `POST` | `/api/auth/signup/complete` |
| `POST` | `/api/auth/verify-email` |

Mark public handlers with `@Public()`. Gateway public routes are in `services/api-gateway/src/proxy/gateway-auth.middleware.ts`.

## Module checklist

```
modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
└── dto/
```

1. Entity + migration in `src/entities/` and `src/database/migrations/`
2. `TypeOrmModule.forFeature` in the feature module
3. Import in `app.module.ts`

Gateway already proxies `/api/auth` → `AUTH_SERVICE_URL`.
