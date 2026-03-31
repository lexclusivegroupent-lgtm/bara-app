import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
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

// Run DB schema push on startup so the Railway DB always has the latest tables.
// drizzle-kit push --force is idempotent — safe to run on every boot.
if (process.env.DATABASE_URL) {
  try {
    logger.info("Running database schema migration...");
    // dist/index.mjs is at <root>/artifacts/api-server/dist/index.mjs
    // lib/db is at <root>/lib/db
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.resolve(__dirname, "../../../lib/db");
    execSync("npx drizzle-kit push --force", {
      cwd: dbDir,
      env: { ...process.env },
      stdio: "inherit",
    });
    logger.info("Database schema migration complete.");
  } catch (err) {
    logger.warn({ err }, "Schema migration failed — server will start anyway");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
