# Ecommerce demo template

Static template loaded when `generationMode: false` (default). No LLM is called.

## Layout

```
ecommerce/
  manifest.json
  project/
```

Template mode is controlled per project via `generationMode` on create.

**Allowed only in `APP_ENV=development` or `APP_ENV=qa`.** In production the server rejects `generationMode: false` and always uses AI.
