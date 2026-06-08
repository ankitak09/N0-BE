# AI Project Response Contract v1

Versioned JSON manifest returned by **ai-service** and materialized without follow-up AI calls.

## Flow

```txt
Prompt → ai-service (LLM or local generator)
       → validate manifest v1
       → write files + .env
       → project-service: npm install → build → preview URL
```

## Shape

```json
{
  "contractVersion": "1",
  "projectName": "ecommerce-app",
  "framework": "react-vite",
  "description": "Optional summary",
  "dependencies": ["@supabase/supabase-js", "react-router-dom"],
  "devDependencies": [],
  "environmentVariables": [
    { "key": "VITE_SUPABASE_URL", "value": "" },
    { "key": "VITE_SUPABASE_ANON_KEY", "value": "" }
  ],
  "files": [{ "path": "src/App.tsx", "content": "..." }],
  "screens": [{ "name": "Home", "routePath": "/", "order": 1, "description": "..." }]
}
```

Legacy field `suggestedProjectName` is accepted as an alias for `projectName`.

## Validation

| Rule | Required |
|------|----------|
| `projectName` or `suggestedProjectName` | yes (fallback: prompt words) |
| `framework` | defaults to `react-vite`; other values rejected |
| `files` | yes, non-empty |
| file `path` | non-empty, unique |
| file `content` | string, not null |
| `dependencies`, `devDependencies`, `environmentVariables` | optional |

Implementation: `services/ai-service/src/modules/generation/ai-project-manifest.v1.ts`

## Backend responsibilities

| Step | Owner |
|------|--------|
| Validate manifest | ai-service |
| Create project folder + source files | ai-service |
| Merge `dependencies` / `devDependencies` into `package.json` | ai-service |
| Write `.env` from `environmentVariables` | ai-service |
| `npm install` → `npm run build` → preview | project-service |

## Demo (no API key)

**Recommended — static fixture (same app every time):**

```bash
# services/ai-service/.env
AI_PROVIDER=mock
```

Template folder: `services/ai-service/templates/ecommerce-v1/` (`manifest.json` + `project/`).

Fetch manifest: `GET http://127.0.0.1:4003/api/internal/v1/fixtures/ecommerce-v1`

**Alternative — built-in local generator:**

```bash
AI_PROVIDER=local
```

Prompt with `ecommerce`, `supabase`, or `auth` to get Supabase env stubs and merged deps in the local generator.

## Demo script

> The AI service returns a project manifest containing dependencies, environment variables, and source files. The backend validates the manifest, creates the project, installs dependencies, builds the application, and serves a preview. The AI and backend communicate through a versioned JSON contract.
