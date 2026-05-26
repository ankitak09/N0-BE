#!/usr/bin/env bash
# Run TypeORM migrations for a service (loads .env from that service directory).
# Usage: ./scripts/run-service-migration.sh <slug> [run|revert|show]
# Example: npm run migration:auth
#          ./scripts/run-service-migration.sh auth run
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLUG="${1:-}"
ACTION="${2:-run}"

if [[ -z "$SLUG" ]]; then
  echo "Usage: $0 <slug> [run|revert|show]"
  echo "Example: $0 auth run"
  exit 1
fi

case "$ACTION" in
  run | revert | show) ;;
  *)
    echo "Error: action must be run, revert, or show (got: $ACTION)"
    exit 1
    ;;
esac

SERVICE_DIR="$ROOT/services/${SLUG}-service"
SCRIPT="migration:${ACTION}"

if [[ ! -d "$SERVICE_DIR" ]]; then
  echo "Error: service directory not found: $SERVICE_DIR"
  exit 1
fi

if [[ ! -f "$SERVICE_DIR/.env" ]]; then
  echo "Error: missing $SERVICE_DIR/.env — copy .env.example to .env first."
  exit 1
fi

cd "$SERVICE_DIR"
npm run "$SCRIPT"
