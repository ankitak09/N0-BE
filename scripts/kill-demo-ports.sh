#!/usr/bin/env bash
# Free ports used by the local demo stack.
set -euo pipefail

PORTS=(3001 4000 4001 4003)
PIDS=""

for port in "${PORTS[@]}"; do
  port_pids=$(lsof -ti ":${port}" 2>/dev/null || true)
  if [[ -n "$port_pids" ]]; then
    PIDS+="${port_pids}"$'\n'
  fi
done

PIDS=$(echo "$PIDS" | sort -u | grep -v '^$' || true)

if [[ -z "$PIDS" ]]; then
  echo "Demo ports already free: ${PORTS[*]}"
  exit 0
fi

echo "Stopping processes on ports ${PORTS[*]}..."
while IFS= read -r pid; do
  [[ -n "$pid" ]] || continue
  kill -9 "$pid" 2>/dev/null || true
done <<< "$PIDS"
sleep 1
echo "Done."
