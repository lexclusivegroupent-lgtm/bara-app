#!/bin/sh
echo "[start.sh] Starting API server (migrations run at startup via index.ts)..."
exec node --enable-source-maps /app/artifacts/api-server/dist/index.mjs
