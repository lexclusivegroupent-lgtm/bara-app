import { Request, Response, NextFunction } from "express";
import type { Role } from "./auth";

// ─── Permission map ───────────────────────────────────────────────────────────

/**
 * Every action that can be guarded in the API.
 * Note: admin access is handled by authenticateAdmin (API-key based) in admin.ts,
 * not through JWT roles. These permissions only apply to JWT-authenticated routes.
 */
export type Permission =
  | "jobs:accept"
  | "jobs:decline"
  | "jobs:update_status"
  | "earnings:read_own"
  | "photos:upload"
  | "jobs:create"
  | "jobs:read_own"
  | "drivers:rate"
  | "messages:send";

/**
 * Explicit allow-list per role. Anything not listed is denied.
 * 'both' role receives the union of driver and customer permissions.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  driver: [
    "jobs:accept",
    "jobs:decline",
    "jobs:update_status",
    "earnings:read_own",
    "photos:upload",
    "messages:send",
  ],
  customer: [
    "jobs:create",
    "jobs:read_own",
    "drivers:rate",
    "messages:send",
  ],
  both: [
    "jobs:accept",
    "jobs:decline",
    "jobs:update_status",
    "earnings:read_own",
    "photos:upload",
    "jobs:create",
    "jobs:read_own",
    "drivers:rate",
    "messages:send",
  ],
} as const;

export function hasPermission(role: Role, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}

// ─── Middleware factories ─────────────────────────────────────────────────────

/**
 * Role gate: allows only users whose role is in the provided list.
 * Use after requireAuth.
 *
 * Note: does not handle admin — admin routes use authenticateAdmin middleware.
 *
 * Usage:
 *   router.post("/jobs/:id/accept", requireAuth, requireRole("driver", "both"), handler)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    if (roles.includes(user.role)) {
      next();
      return;
    }

    res.status(403).json({
      error: "Forbidden",
      message: `This resource requires one of: ${roles.join(", ")}`,
    });
  };
}

/**
 * Permission gate: allows users whose role has the specified permission.
 * More granular than requireRole when one role has partial access.
 *
 * Usage:
 *   router.post("/jobs/:id/accept", requireAuth, requirePermission("jobs:accept"), handler)
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    if (hasPermission(user.role, permission)) {
      next();
      return;
    }

    res.status(403).json({
      error: "Forbidden",
      message: `Role '${user.role}' does not have permission: ${permission}`,
    });
  };
}

/**
 * Row-level ownership guard: non-driver users can only access their own records.
 * Reads the owner ID from req.params[resourceField] or req.body[resourceField]
 * and compares it against the authenticated user's ID.
 *
 * Usage:
 *   router.get("/jobs/:customerId", requireAuth, requireOwnership("customerId"), handler)
 */
export function requireOwnership(resourceField = "userId") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user!;

    const ownerId =
      (req.params[resourceField] as string | undefined) ??
      (req.body as Record<string, unknown> | undefined)?.[resourceField];

    // Parse string param to number for comparison against integer user IDs
    const ownerIdNum =
      typeof ownerId === "string" ? parseInt(ownerId, 10) : ownerId;

    if (
      ownerIdNum !== undefined &&
      !isNaN(ownerIdNum as number) &&
      ownerIdNum !== user.userId
    ) {
      res
        .status(403)
        .json({ error: "You do not have access to this resource" });
      return;
    }

    next();
  };
}

export type { Role };
