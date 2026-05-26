import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, refreshTokensTable, usersTable } from "@workspace/db";

// ─── Secret setup (unchanged from original) ──────────────────────────────────

const INSECURE_DEFAULT = "bara-secret-key-change-in-production";
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === INSECURE_DEFAULT) {
    throw new Error(
      "FATAL: JWT_SECRET must be set to a secure random value in production.\n" +
        "Generate one with:  openssl rand -hex 32\n" +
        "Then set it as the JWT_SECRET environment variable.",
    );
  }
}

const JWT_SECRET = process.env.JWT_SECRET || INSECURE_DEFAULT;

// ─── Types ────────────────────────────────────────────────────────────────────

// Roles that appear in JWT payloads. Admin access uses API-key auth
// (authenticateAdmin in admin.ts) and does not go through JWT.
export type Role = "customer" | "driver" | "both";

export interface JWTPayload {
  userId: number;
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
}

// Kept for backward compatibility — existing routes depend on this interface.
export interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: string;
}

// ─── Token constants ──────────────────────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── New token helpers ────────────────────────────────────────────────────────

/**
 * Creates a short-lived (15 min) access JWT for use with requireAuth.
 * Use this + generateRefreshToken when issuing tokens from new auth routes.
 */
export function generateAccessToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Creates a cryptographically random 128-hex-char refresh token and stores
 * it in the database with a 7-day TTL. Each token is single-use.
 */
export async function generateRefreshToken(userId: number): Promise<string> {
  const token = randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await db
    .insert(refreshTokensTable)
    .values({ token, userId, expiresAt, used: false });

  return token;
}

/**
 * Exchanges an old refresh token for a new access + refresh token pair.
 *
 * Security properties:
 *  1. Old token is marked `used` before new tokens are issued (rotation).
 *  2. If a `used` token is presented again, all sessions for that user are
 *     revoked — this indicates the token was stolen after a prior rotation.
 *  3. Expired tokens are purged and null is returned.
 *
 * Returns null on any invalid state — caller must respond 401.
 */
export async function rotateRefreshToken(oldToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const rows = await db
    .select({
      tokenId: refreshTokensTable.id,
      userId: refreshTokensTable.userId,
      used: refreshTokensTable.used,
      expiresAt: refreshTokensTable.expiresAt,
      role: usersTable.role,
      email: usersTable.email,
    })
    .from(refreshTokensTable)
    .innerJoin(usersTable, eq(refreshTokensTable.userId, usersTable.id))
    .where(eq(refreshTokensTable.token, oldToken))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Token reuse attack: revoke all sessions for this user
  if (row.used) {
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.userId, row.userId));
    return null;
  }

  if (row.expiresAt < new Date()) {
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.id, row.tokenId));
    return null;
  }

  // Invalidate consumed token before issuing new pair
  await db
    .update(refreshTokensTable)
    .set({ used: true })
    .where(eq(refreshTokensTable.id, row.tokenId));

  const payload: Omit<JWTPayload, "iat" | "exp"> = {
    userId: row.userId,
    role: row.role as Role,
    email: row.email,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: await generateRefreshToken(row.userId),
  };
}

// ─── New middleware ───────────────────────────────────────────────────────────

/**
 * Validates the Bearer JWT and attaches decoded payload to req.user.
 * Use this for new routes. Existing routes continue using `authenticate` below.
 *
 * Returns:
 *   401 — missing/malformed header
 *   401 + code TOKEN_EXPIRED — expired token (client should call /auth/refresh)
 *   401 — invalid signature
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res
        .status(401)
        .json({ error: "Access token expired", code: "TOKEN_EXPIRED" });
    } else {
      res.status(401).json({ error: "Invalid token" });
    }
  }
}

// ─── Legacy exports (unchanged — keep all existing routes working) ────────────

/**
 * Original middleware. Sets req.userId and req.userRole.
 * Existing routes depend on this — do not remove.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role: string;
    };
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Issues a 7-day JWT. Kept for existing login routes.
 * New auth routes should use generateAccessToken + generateRefreshToken instead.
 */
export function signToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}
