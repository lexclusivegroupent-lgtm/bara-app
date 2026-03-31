import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

logger.info({ port, env: process.env["NODE_ENV"] }, "[startup] Starting api-server");
logger.info({ healthRoute: "/api/healthz" }, "[startup] Health route registered at /api/healthz");

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "[startup] Server listening - healthcheck at /api/healthz should now respond 200");
});
