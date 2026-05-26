import pino from "pino";
import pinoHttp from "pino-http";
import { Request } from "express";
import { eq, and, gte, count } from "drizzle-orm";
import { db, securityLogsTable } from "@workspace/db";
import type { NewSecurityLog } from "@workspace/db";

// ─── Core logger ─────────────────────────────────────────────────────────────

/**
 * Security-focused pino logger. Outputs JSON in production (consumed by
 * Railway's log aggregation) and pretty-prints in development.
 *
 * If you already have a pino logger in src/lib/logger.ts you can replace
 * this with a re-export of that logger — both use the same pino instance type.
 */
export const securityLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "bara-api", layer: "security" },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:standard" },
    },
  }),
});

// ─── HTTP access log middleware ───────────────────────────────────────────────

/**
 * Structured HTTP access log. Attach early in the Express middleware chain.
 * Strips Authorization headers from logged output.
 */
export const httpLogger = pinoHttp({
  logger: securityLogger,
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} → ${res.statusCode} [${err.message}]`,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  }
  return req.ip ?? "unknown";
}

async function writeSecurityLog(entry: NewSecurityLog): Promise<void> {
  try {
    await db.insert(securityLogsTable).values(entry);
  } catch (err) {
    securityLogger.error({ err }, "Failed to write to security_logs");
  }
}

// ─── Auth failure logging ────────────────────────────────────────────────────

/**
 * Call this from login/register handlers on every authentication failure.
 * Logs to pino and persists to security_logs, then checks alert thresholds.
 */
export async function logAuthFailure(
  req: Request,
  email: string,
  reason: string,
): Promise<void> {
  const ip = getClientIp(req);

  securityLogger.warn(
    { event: "auth_failure", ip, email, reason, path: req.path },
    "Authentication failure",
  );

  await writeSecurityLog({
    eventType: "auth_failure",
    ipAddress: ip,
    email,
    endpoint: req.path,
    metadata: { reason, userAgent: req.headers["user-agent"] ?? null },
  });

  void checkAndAlert(ip, email);
}

// ─── Rate limit hit logging ───────────────────────────────────────────────────

/**
 * Persists a rate limit hit event and checks alert thresholds for the IP.
 * Can be called from rate limiter handlers or directly from route code.
 */
export async function logRateLimitHit(
  req: Request,
  limitType: string,
): Promise<void> {
  const ip = getClientIp(req);

  securityLogger.warn(
    { event: "rate_limit_hit", ip, limitType, path: req.path },
    "Rate limit hit",
  );

  await writeSecurityLog({
    eventType: "rate_limit_hit",
    ipAddress: ip,
    endpoint: req.path,
    metadata: { limitType, method: req.method },
  });

  void checkAndAlert(ip);
}

// ─── Admin action audit log ───────────────────────────────────────────────────

/**
 * Audit log for every privileged admin operation.
 * Call this in every route that uses authenticateAdmin.
 *
 * @param action    Verb describing the operation, e.g. "deactivate_user"
 * @param resource  Entity type affected, e.g. "user", "job"
 * @param resourceId  Primary key of the affected record
 */
export async function logAdminAction(
  req: Request,
  action: string,
  resource: string,
  resourceId?: number | string,
): Promise<void> {
  const userId =
    typeof req.user?.userId === "number" ? req.user.userId : undefined;

  securityLogger.info(
    { event: "admin_action", userId, action, resource, resourceId, path: req.path },
    "Admin action",
  );

  await writeSecurityLog({
    eventType: "admin_action",
    userId,
    endpoint: req.path,
    metadata: {
      action,
      resource,
      resourceId: resourceId != null ? String(resourceId) : null,
    },
  });
}

// ─── Alert thresholds ────────────────────────────────────────────────────────

const ALERT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_ALERT_THRESHOLD = 10;
const AUTH_FAILURE_ALERT_THRESHOLD = 3;

/**
 * Checks security_logs for abuse patterns and fires alerts when thresholds cross:
 *   • 10+ rate_limit_hit from same IP in 5 min → HIGH_RATE_LIMIT_FROM_IP
 *   • 3+ auth_failure for same email in 5 min  → REPEATED_AUTH_FAILURE_FOR_EMAIL
 *
 * Runs fire-and-forget after each security event write — never blocks responses.
 */
async function checkAndAlert(ip: string, email?: string): Promise<void> {
  const since = new Date(Date.now() - ALERT_WINDOW_MS);

  try {
    const [ipResult] = await db
      .select({ total: count() })
      .from(securityLogsTable)
      .where(
        and(
          eq(securityLogsTable.eventType, "rate_limit_hit"),
          eq(securityLogsTable.ipAddress, ip),
          gte(securityLogsTable.createdAt, since),
        ),
      );

    if ((ipResult?.total ?? 0) >= RATE_LIMIT_ALERT_THRESHOLD) {
      await triggerAlert("HIGH_RATE_LIMIT_FROM_IP", {
        ip,
        count: ipResult?.total ?? 0,
        windowMinutes: ALERT_WINDOW_MS / 60_000,
      });
    }
  } catch (err) {
    securityLogger.error({ err }, "Alert check failed: rate_limit_hit");
  }

  if (email) {
    try {
      const [emailResult] = await db
        .select({ total: count() })
        .from(securityLogsTable)
        .where(
          and(
            eq(securityLogsTable.eventType, "auth_failure"),
            eq(securityLogsTable.email, email),
            gte(securityLogsTable.createdAt, since),
          ),
        );

      if ((emailResult?.total ?? 0) >= AUTH_FAILURE_ALERT_THRESHOLD) {
        await triggerAlert("REPEATED_AUTH_FAILURE_FOR_EMAIL", {
          email,
          count: emailResult?.total ?? 0,
          windowMinutes: ALERT_WINDOW_MS / 60_000,
        });
      }
    } catch (err) {
      securityLogger.error({ err }, "Alert check failed: auth_failure");
    }
  }
}

async function triggerAlert(
  type: string,
  context: Record<string, unknown>,
): Promise<void> {
  securityLogger.error(
    { alert: type, ...context, timestamp: new Date().toISOString() },
    `SECURITY ALERT: ${type}`,
  );

  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 *Bära Security Alert*: \`${type}\``,
        attachments: [
          {
            color: "danger",
            fields: Object.entries(context).map(([k, v]) => ({
              title: k,
              value: String(v),
              short: true,
            })),
            footer: `bara-api • ${new Date().toISOString()}`,
          },
        ],
      }),
    });
  } catch (err) {
    securityLogger.error({ err }, "Failed to send alert webhook");
  }
}
