#!/bin/sh
set -e

echo "[start.sh] Running database migrations..."
cd /app && pnpm --filter @workspace/db run push-force

echo "[start.sh] Starting API server..."
exec node --enable-source-maps /app/artifacts/api-server/dist/index.mjs
