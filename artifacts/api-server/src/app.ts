import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const corsOrigin = process.env.CORS_ORIGIN;

const FALLBACK_ORIGINS = [
  "https://baraapp.se",
  "https://app.baraapp.se",
  "https://www.baraapp.se",
];
const allowedOrigins: string[] = corsOrigin
  ? corsOrigin.split(",").map((o) => o.trim())
  : FALLBACK_ORIGINS;

if (process.env.NODE_ENV === "production" && !corsOrigin) {
  logger.info(
    { allowedOrigins },
    "CORS_ORIGIN not set — using built-in fallback origins. " +
    "Set CORS_ORIGIN=https://baraapp.se,https://app.baraapp.se in Railway for explicit control."
  );
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait 15 minutes before trying again." },
  skip: () => process.env.NODE_ENV !== "production",
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

app.use("/api", router);

// Serve the Expo web static build at the root URL.
// Built by `expo export --output-dir ../api-server/static-build` during Railway build.
// __dirname at runtime = artifacts/api-server/dist/ → static-build is one level up.
const staticBuildPath = path.resolve(__dirname, "../static-build");

if (fs.existsSync(staticBuildPath)) {
  logger.info({ staticBuildPath }, "Serving Expo web build from static-build/");
  app.use(express.static(staticBuildPath));
  app.get("/{*path}", (_req, res) => {
    const indexPath = path.join(staticBuildPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: "Web build not found" });
    }
  });
} else {
  logger.warn({ staticBuildPath }, "Expo static-build not found — only API routes will be served");
}

export default app;
