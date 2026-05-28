/**
 * Barrel export for all Bära API middleware.
 *
 * Usage:
 *   import { requireAuth, requireRole, globalRateLimit } from "../middlewares";
 */

// Layer 1 — JWT Authentication
export {
  requireAuth,
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  // Legacy exports kept for backward compatibility
  authenticate,
  signToken,
} from "./auth";
export type { Role, JWTPayload, AuthenticatedRequest } from "./auth";

// Layer 2 — RBAC
export {
  requireRole,
  requirePermission,
  requireOwnership,
  hasPermission,
  ROLE_PERMISSIONS,
} from "./rbac";
export type { Permission } from "./rbac";

// Layer 3 — Rate Limiting
export {
  globalRateLimit,
  authRateLimit,
  authLockoutLimit,
  jobCreationLimit,
  driverJobLimit,
} from "./rateLimiter";

// Layer 4 — Admin (existing, re-exported for convenience)
export { authenticateAdmin } from "./admin";

// Layer 6 — Structured Logging
export {
  securityLogger,
  httpLogger,
  logAuthFailure,
  logRateLimitHit,
  logAdminAction,
} from "./logger";
