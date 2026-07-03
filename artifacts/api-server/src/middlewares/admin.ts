import { Request, Response, NextFunction } from "express";

const DEFAULT_ADMIN_KEY = "bara-admin-2025";

export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const isProd = process.env.NODE_ENV === "production";
  const configuredKey = process.env.BARA_ADMIN_KEY || process.env.ADMIN_STATS_KEY;

  if (isProd && (!configuredKey || configuredKey === DEFAULT_ADMIN_KEY)) {
    res.status(403).json({ error: "Admin access disabled. Set BARA_ADMIN_KEY in production." });
    return;
  }

  const adminKey = (configuredKey || DEFAULT_ADMIN_KEY).trim();
  const provided = (
    (req.headers["x-admin-key"] as string) ||
    (req.query.key as string) ||
    ""
  ).trim();

  if (!provided || provided !== adminKey) {
    res.status(401).json({ error: "Invalid admin key" });
    return;
  }

  // Admin audit trail. Deliberately console.info (not req.log) so entries
  // always reach Railway logs regardless of Pino level configuration.
  console.info("[admin-audit]", JSON.stringify({
    action: req.path,
    method: req.method,
    ip: req.ip,
    ts: new Date().toISOString(),
  }));

  next();
}
