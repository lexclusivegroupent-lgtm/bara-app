#!/bin/sh

echo "[start.sh] Running database migrations..."
cd /app && pnpm --filter @workspace/db run push-force || echo "[start.sh] Migration warning — server will start anyway"

echo "[start.sh] Starting API server..."
exec node --enable-source-maps /app/artifacts/api-server/dist/index.mjs
