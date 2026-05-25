#!/usr/bin/env bash
# Usage: ./scripts/new-service.sh <slug> <port>
# Example: ./scripts/new-service.sh billing 4002
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLUG="${1:-}"
PORT="${2:-}"

if [[ -z "$SLUG" || -z "$PORT" ]]; then
  echo "Usage: npm run new:service -- <slug> <port>"
  echo "Example: npm run new:service -- billing 4002"
  exit 1
fi

if [[ ! "$SLUG" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Error: slug must be lowercase alphanumeric with hyphens (e.g. billing, access-control)"
  exit 1
fi

if [[ ! "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1024 || PORT > 65535 )); then
  echo "Error: port must be a valid number (1024-65535)"
  exit 1
fi

SERVICE_DIR="$ROOT/services/${SLUG}-service"
SERVICE_NAME="n0-${SLUG}-service"
TEMPLATE="$ROOT/templates/microservice"

if [[ -d "$SERVICE_DIR" ]]; then
  echo "Error: $SERVICE_DIR already exists"
  exit 1
fi

echo "Creating $SERVICE_NAME at $SERVICE_DIR (port $PORT)..."

cp -R "$TEMPLATE" "$SERVICE_DIR"

replace_in_file() {
  local file="$1"
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' \
      -e "s/__SERVICE_SLUG__/${SLUG}/g" \
      -e "s/__SERVICE_NAME__/${SERVICE_NAME}/g" \
      -e "s/__PORT__/${PORT}/g" \
      "$file"
  else
    sed -i \
      -e "s/__SERVICE_SLUG__/${SLUG}/g" \
      -e "s/__SERVICE_NAME__/${SERVICE_NAME}/g" \
      -e "s/__PORT__/${PORT}/g" \
      "$file"
  fi
}

while IFS= read -r -d '' file; do
  replace_in_file "$file"
done < <(find "$SERVICE_DIR" -type f ! -path "*/node_modules/*" -print0)

echo ""
echo "Done. Next steps:"
echo "  1. Add port $PORT to docs/port-registry.md"
echo "  2. cd $SERVICE_DIR && cp .env.example .env && npm install"
echo " 3. npm run start:dev"
echo "  4. curl http://localhost:${PORT}/api/health"
