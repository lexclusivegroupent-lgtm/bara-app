import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

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

// Build allowed origins list. Falls back to known production domains so that
// credentials-bearing requests from app.baraapp.se always work even if
// CORS_ORIGIN hasn't been set yet in the environment.
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
  // Using a function instead of a static list so that:
  // 1. Requests with no Origin header (native mobile, curl) always pass through
  // 2. "credentials: true" works correctly (can't use "*" with credentials)
  // 3. In development every origin is permitted
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

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

export default app;
