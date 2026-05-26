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
RESOURCES_PLURAL="${SLUG}s"
RESOURCE_CLASS="$(node "$ROOT/scripts/to-pascal-case.js" "$SLUG")"
RESOURCES_CLASS="${RESOURCE_CLASS}s"

if [[ -d "$SERVICE_DIR" ]]; then
  echo "Error: $SERVICE_DIR already exists"
  exit 1
fi

echo "Creating $SERVICE_NAME at $SERVICE_DIR (port $PORT)..."
echo "CRUD boilerplate: /api/${RESOURCES_PLURAL} (${RESOURCE_CLASS}Entity)"

cp -R "$TEMPLATE" "$SERVICE_DIR"

# Rename CRUD files and folders (placeholders → slug-based names)
mv "$SERVICE_DIR/src/entities/__resource__.entity.ts" "$SERVICE_DIR/src/entities/${SLUG}.entity.ts"
mv "$SERVICE_DIR/src/modules/__resources__" "$SERVICE_DIR/src/modules/${RESOURCES_PLURAL}"
MOD_DIR="$SERVICE_DIR/src/modules/${RESOURCES_PLURAL}"
mv "$MOD_DIR/__resources__.module.ts" "$MOD_DIR/${RESOURCES_PLURAL}.module.ts"
mv "$MOD_DIR/__resources__.controller.ts" "$MOD_DIR/${RESOURCES_PLURAL}.controller.ts"
mv "$MOD_DIR/__resources__.service.ts" "$MOD_DIR/${RESOURCES_PLURAL}.service.ts"
mv "$MOD_DIR/dto/create-__resource__.dto.ts" "$MOD_DIR/dto/create-${SLUG}.dto.ts"
mv "$MOD_DIR/dto/update-__resource__.dto.ts" "$MOD_DIR/dto/update-${SLUG}.dto.ts"
mv "$MOD_DIR/dto/list-__resources__-query.dto.ts" "$MOD_DIR/dto/list-${RESOURCES_PLURAL}-query.dto.ts"
mv "$SERVICE_DIR/src/database/migrations/0001-create-__resources__-table.ts" \
  "$SERVICE_DIR/src/database/migrations/0001-create-${RESOURCES_PLURAL}-table.ts"

replace_in_file() {
  local file="$1"
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' \
      -e "s/__SERVICE_SLUG__/${SLUG}/g" \
      -e "s/__SERVICE_NAME__/${SERVICE_NAME}/g" \
      -e "s/__PORT__/${PORT}/g" \
      -e "s/__Resources__/${RESOURCES_CLASS}/g" \
      -e "s/__Resource__/${RESOURCE_CLASS}/g" \
      -e "s/__resources__/${RESOURCES_PLURAL}/g" \
      -e "s/__resource__/${SLUG}/g" \
      "$file"
  else
    sed -i \
      -e "s/__SERVICE_SLUG__/${SLUG}/g" \
      -e "s/__SERVICE_NAME__/${SERVICE_NAME}/g" \
      -e "s/__PORT__/${PORT}/g" \
      -e "s/__Resources__/${RESOURCES_CLASS}/g" \
      -e "s/__Resource__/${RESOURCE_CLASS}/g" \
      -e "s/__resources__/${RESOURCES_PLURAL}/g" \
      -e "s/__resource__/${SLUG}/g" \
      "$file"
  fi
}

while IFS= read -r -d '' file; do
  replace_in_file "$file"
done < <(find "$SERVICE_DIR" -type f ! -path "*/node_modules/*" -print0)

# --- Register port + gateway proxy (CRUD routes go through gateway) ---
ENV_KEY="$(echo "$SLUG" | tr '[:lower:]' '[:upper:]' | tr '-' '_')_SERVICE_URL"
GATEWAY_ROUTES="$ROOT/services/api-gateway/src/proxy/proxy.routes.ts"
GATEWAY_ENV="$ROOT/services/api-gateway/.env.example"
PORT_REGISTRY="$ROOT/docs/port-registry.md"

if [[ -f "$GATEWAY_ROUTES" ]] && ! grep -q "/api/${RESOURCES_PLURAL}" "$GATEWAY_ROUTES"; then
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "/^];$/i\\
  { path: \"/api/${RESOURCES_PLURAL}\", targetEnv: \"${ENV_KEY}\" },
" "$GATEWAY_ROUTES"
  else
    sed -i "/^];$/i\\  { path: \"/api/${RESOURCES_PLURAL}\", targetEnv: \"${ENV_KEY}\" }," "$GATEWAY_ROUTES"
  fi
  echo "Gateway: added /api/${RESOURCES_PLURAL} -> ${ENV_KEY}"
fi

if [[ -f "$GATEWAY_ENV" ]] && ! grep -q "^${ENV_KEY}=" "$GATEWAY_ENV"; then
  echo "${ENV_KEY}=http://127.0.0.1:${PORT}" >> "$GATEWAY_ENV"
fi

if [[ -f "$PORT_REGISTRY" ]] && ! grep -q "| ${PORT} | ${SERVICE_NAME} |" "$PORT_REGISTRY"; then
  node <<NODE
const fs = require("fs");
const p = "${PORT_REGISTRY}";
const row = "| ${PORT} | ${SERVICE_NAME} | \`services/${SLUG}-service\` | CRUD \`/api/${RESOURCES_PLURAL}\` |\\n";
let md = fs.readFileSync(p, "utf8");
md = md.replace(/\| [0-9]+ \| \*available\* \|[^\n]*\n/, row);
fs.writeFileSync(p, md);
NODE
fi

echo ""
echo "Done. Created with CRUD boilerplate at /api/${RESOURCES_PLURAL}"
echo ""
echo "Next steps:"
echo "  1. cd $SERVICE_DIR && cp .env.example .env && npm install"
echo "  2. npm run migration:run"
echo "  3. npm run start:dev"
echo "  4. curl http://localhost:${PORT}/api/health"
echo "  5. CRUD: curl -H \"Authorization: Bearer <token>\" http://localhost:${PORT}/api/${RESOURCES_PLURAL}"
echo "  6. Via gateway: http://localhost:3001/api/${RESOURCES_PLURAL}"
