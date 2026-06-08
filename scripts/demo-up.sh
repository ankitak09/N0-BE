#!/usr/bin/env bash
# Start the full local demo: gateway + auth + project + ai.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/kill-demo-ports.sh"

if ! curl -sf http://127.0.0.1:5434 >/dev/null 2>&1; then
  if command -v docker >/dev/null 2>&1; then
    echo "Starting Postgres (docker)..."
    if ! npm run db:up; then
      echo "Warning: could not start Postgres container (port 5434 may already be in use)."
      echo "If Postgres is already running, you can ignore this."
    fi
    sleep 2
  else
    echo "Warning: Postgres may not be running. Auth needs DATABASE_URL on :5434."
  fi
fi

for svc in api-gateway auth-service project-service ai-service; do
  if [[ ! -f "$ROOT/services/$svc/.env" ]]; then
    cp "$ROOT/services/$svc/.env.example" "$ROOT/services/$svc/.env"
    echo "Created services/$svc/.env from .env.example"
  fi
done

echo ""
echo "Starting demo stack (gateway :3001, auth :4000, project :4001, ai :4003)..."
echo "FE: run N0-FE-POC (npm run dev). API proxied via Next to :3001 (NEXT_PUBLIC_API_URL empty)."
echo ""

exec npm run dev:demo
