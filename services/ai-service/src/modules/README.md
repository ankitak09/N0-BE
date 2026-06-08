# Feature modules

## CRUD boilerplate (included on `npm run new:service`)

Each new service ships with `modules/<slug>s/` (e.g. `examples/`). See [docs/crud-boilerplate.md](../../../docs/crud-boilerplate.md).

| Method | Path |
|--------|------|
| `POST` | `/api/<resources>` |
| `GET` | `/api/<resources>` |
| `GET` | `/api/<resources>/:id` |
| `PATCH` | `/api/<resources>/:id` |
| `DELETE` | `/api/<resources>/:id` |

Customize or delete this module if your service has no CRUD. Copy the folder to add another resource.

## Custom module checklist

```
modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
└── dto/
```

1. Entity in `src/entities/` + migration
2. `TypeOrmModule.forFeature` in the feature module
3. Import in `app.module.ts`
4. Gateway route in `services/api-gateway/src/proxy/proxy.routes.ts`
