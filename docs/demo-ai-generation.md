# Demo: Prompt → BE → AI → Generated app

End-to-end flow for **“Generate a web app for me”** — **no paid API key required**.

## Free generation options

| Provider | Cost | Quality | Speed |
|----------|------|---------|--------|
| **`fixture`** (demo) | Free | Static ecommerce v1 (same every prompt) | ~2s |
| **`groq`** (recommended) | Free tier | Real AI | Fast (~10–30s) |
| **`local`** | Free, offline | Template-based | ~3s |
| **`ollama`** | Free | Real AI | Slow |
| **`openai`** | Paid | Best | Fast |

### Groq (recommended free AI)

1. Create a free key at [console.groq.com](https://console.groq.com)
2. In `services/ai-service/.env`:

```env
AI_PROVIDER=auto
GROQ_API_KEY=gsk_your_key_here
```

3. Restart `ai-service`. If Groq fails (rate limit, bad JSON), the app **falls back** to the built-in generator automatically.

### Static ecommerce demo (predictable, no API key)

```env
AI_PROVIDER=mock
```

Template: `services/ai-service/templates/ecommerce-v1/`. Manifest API: `GET /api/internal/v1/fixtures/ecommerce-v1`.

### Templates only (no API key)

```env
AI_PROVIDER=local
```

`AI_PROVIDER=auto` picks: **Groq** → OpenAI → Ollama (if running) → **local**.

## Quick start

### 1. Postgres (auth)

```bash
cd N0-BE && npm run db:up && npm run migration:auth
```

### 2. Env files

```bash
cd N0-BE/services/api-gateway && cp .env.example .env
cd ../auth-service && cp .env.example .env
cd ../project-service && cp .env.example .env
cd ../ai-service && cp .env.example .env
```

Your ai-service `.env` can use `AI_PROVIDER=local` with **no** `OPENAI_API_KEY`.

### 3. Run

```bash
cd N0-BE && npm run demo:up
cd N0-FE-POC && cp .env.demo.example .env.local && npm run dev
```

### 4. Try it

1. `http://localhost:3000/dashboard?folderId=demo`
2. Prompt: **“marketing landing page with contact form”**
3. Watch folders/files appear in the activity log
4. Open **Code** to view generated sources

## Optional: Ollama (free, smarter)

Ollama needs the **server running** while you pull models and while N0 generates apps.

**Terminal 1** — leave this running (do not Ctrl+C):

```bash
ollama serve
```

**Terminal 2** — pull a model (only works while Terminal 1 is still serving):

```bash
ollama pull llama3.2
```

On macOS you can also open the **Ollama app** from Applications instead of `ollama serve` — it starts the server in the background.

In `services/ai-service/.env`:

```env
AI_PROVIDER=auto
OLLAMA_MODEL=llama3.2
```

Restart the backend (`npm run demo:up`). N0 will use Ollama when `http://127.0.0.1:11434` is up, otherwise the free built-in generator.

**Verify Ollama:**

```bash
curl http://127.0.0.1:11434/api/tags
```

You should get JSON listing models (empty `[]` until you finish `ollama pull`).

## API surface

See [generation-flow.md](generation-flow.md).
