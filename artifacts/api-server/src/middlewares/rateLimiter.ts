import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { eq, and, count, inArray } from "drizzle-orm";
import { db, securityLogsTable, jobsTable } from "@workspace/db";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts the real client IP behind Railway's reverse proxy.
 * Requires app.set('trust proxy', 1) in the Express app.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  }
  return req.ip ?? "unknown";
}

/**
 * Fire-and-forget: logs a rate limit hit to security_logs.
 * Failures are swallowed so logging never breaks request handling.
 */
async function persistRateLimitHit(
  req: Request,
  limitType: string,
): Promise<void> {
  try {
    await db.insert(securityLogsTable).values({
      eventType: "rate_limit_hit",
      ipAddress: getClientIp(req),
      endpoint: req.path,
      metadata: { limitType, method: req.method },
    });
  } catch {
    // intentionally swallowed
  }
}

// ─── Global rate limit ────────────────────────────────────────────────────────

/**
 * Applied to every request.
 * 100 requests per 15 minutes per IP. Uses draft-7 standard headers so
 * clients receive RateLimit-Policy and RateLimit-Reset for back-off logic.
 */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    void persistRateLimitHit(req, "global");
    res.status(429).json({
      error: "Too many requests",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

// ─── Auth rate limit ──────────────────────────────────────────────────────────

/**
 * Applied to login / register / forgot-password endpoints.
 *
 * Keys on IP + email to prevent credential stuffing: an attacker rotating IPs
 * while targeting the same account still hits the per-email limit.
 *
 * 5 failures per 15 minutes triggers the short window; authLockoutLimit below
 * enforces the 1-hour lockout after those 5 are exhausted.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const body = req.body as Record<string, unknown> | undefined;
    const email =
      typeof body?.email === "string" ? body.email.toLowerCase() : "";
    return `${getClientIp(req)}:${email}`;
  },
  handler: (req, res) => {
    void persistRateLimitHit(req, "auth");
    res.status(429).json({
      error: "Too many authentication attempts. Please try again in 1 hour.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

/**
 * Extended lockout: 1-hour block after 5 failures on the same IP+email.
 * Stack both limiters on auth routes:
 *   router.post("/auth/login", authRateLimit, authLockoutLimit, loginHandler)
 */
export const authLockoutLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const body = req.body as Record<string, unknown> | undefined;
    const email =
      typeof body?.email === "string" ? body.email.toLowerCase() : "";
    return `auth-lockout:${getClientIp(req)}:${email}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      error:
        "Account temporarily locked due to repeated failed attempts. Try again in 1 hour.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

// ─── Job creation limit ───────────────────────────────────────────────────────

// Jobs in these statuses are considered "active" for the customer limit.
const CUSTOMER_ACTIVE_STATUSES = [
  "pending",
  "accepted",
  "arrived",
  "in_progress",
] as const;

/**
 * Prevents a customer from creating more than 3 active jobs simultaneously.
 * Checked against the database so it survives server restarts.
 * Apply after requireAuth.
 */
export async function jobCreationLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = req.user;

  if (!user || (user.role !== "customer" && user.role !== "both")) {
    next();
    return;
  }

  try {
    const [result] = await db
      .select({ total: count() })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.customerId, user.userId),
          inArray(jobsTable.status, [...CUSTOMER_ACTIVE_STATUSES]),
        ),
      );

    if ((result?.total ?? 0) >= 3) {
      res.status(429).json({
        error:
          "You already have 3 active jobs. Complete or cancel one before creating another.",
      });
      return;
    }
  } catch (err) {
    // DB errors should not block the request — fail open, log the error
    console.error("[rateLimiter] jobCreationLimit DB error", err);
  }

  next();
}

// ─── Driver active-job limit ──────────────────────────────────────────────────

// A driver can only accept a new job if they have no job in these statuses.
const DRIVER_ACTIVE_STATUSES = ["accepted", "arrived", "in_progress"] as const;

/**
 * Prevents a driver from accepting a new job while one is already active.
 * Apply after requireAuth and requireRole("driver", "both").
 */
export async function driverJobLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = req.user;

  if (!user || (user.role !== "driver" && user.role !== "both")) {
    next();
    return;
  }

  try {
    const [result] = await db
      .select({ total: count() })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.driverId, user.userId),
          inArray(jobsTable.status, [...DRIVER_ACTIVE_STATUSES]),
        ),
      );

    if ((result?.total ?? 0) >= 1) {
      res.status(429).json({
        error:
          "You already have an active job. Complete it before accepting a new one.",
      });
      return;
    }
  } catch (err) {
    console.error("[rateLimiter] driverJobLimit DB error", err);
  }

  next();
}
