import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import app from "./app";
import { logger } from "./lib/logger";

// Railway sets PORT automatically. Fall back to 3000 for local dev.
const port = Number(process.env["PORT"] ?? 3000);

if (Number.isNaN(port) || port <= 0) {
  logger.error(`Invalid PORT value: "${process.env["PORT"]}" — defaulting to 3000`);
}

// Run DB schema push on startup so the Railway DB always has the latest tables.
// drizzle-kit push --force is idempotent — safe to run on every boot.
if (process.env.DATABASE_URL) {
  try {
    logger.info("Running database schema migration...");
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

// Bind to 0.0.0.0 so Railway (and other container platforms) can reach the server.
app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening on 0.0.0.0");
});
