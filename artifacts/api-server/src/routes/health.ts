import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import os from "os";

const router: IRouter = Router();
const serverStart = Date.now();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/status", (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStart) / 1000);
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    version: process.env.npm_package_version ?? "unknown",
    environment: process.env.NODE_ENV ?? "development",
    uptime: uptimeSeconds,
    uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    },
    host: os.hostname(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
