import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const INSECURE_DEFAULT = "bara-secret-key-change-in-production";
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === INSECURE_DEFAULT) {
    throw new Error(
      "FATAL: JWT_SECRET must be set to a secure random value in production.\n" +
      "Generate one with:  openssl rand -hex 32\n" +
      "Then set it as the JWT_SECRET environment variable."
    );
  }
}

const JWT_SECRET = process.env.JWT_SECRET || INSECURE_DEFAULT;

export interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: string;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function signToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}
