import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, signToken, AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  const { email, password, fullName, role, city, vehicleDescription } = req.body;

  if (!email || !password || !fullName || !role || !city) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role,
      city,
      vehicleDescription: vehicleDescription || null,
      isAvailable: true,
      totalJobs: 0,
    }).returning();

    const token = signToken(user.id, user.role);
    res.status(201).json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    req.log?.error(err, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id, user.role);
    res.json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    req.log?.error(err, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    req.log?.error(err, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const SUCCESS_MSG = "If that email is registered, you will receive a reset link shortly.";

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);

    if (!user) {
      res.json({ message: SUCCESS_MSG });
      return;
    }

    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(plainToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await db.update(usersTable)
      .set({ resetToken: tokenHash, resetTokenExpiry: expiry })
      .where(eq(usersTable.id, user.id));

    const smtpConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    if (!smtpConfigured) {
      req.log?.info({ email: user.email }, "DEV: Password reset token logged (no SMTP configured)");
      console.log(`\n[DEV] Password reset token for ${user.email}:\n  Token: ${plainToken}\n  Expires: ${expiry.toISOString()}\n`);
      res.json({
        message: SUCCESS_MSG,
        ...(process.env.NODE_ENV !== "production" && { devToken: plainToken }),
      });
      return;
    }

    req.log?.info({ email: user.email }, "Password reset requested (SMTP send placeholder)");
    res.json({ message: SUCCESS_MSG });
  } catch (err) {
    req.log?.error(err, "Forgot password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.resetToken, tokenHash)).limit(1);

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < now) {
      res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.update(usersTable)
      .set({
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        passwordChangedAt: now,
      })
      .where(eq(usersTable.id, user.id));

    res.json({ message: "Password updated successfully. Please log in with your new password." });
  } catch (err) {
    req.log?.error(err, "Reset password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    city: user.city,
    profilePhoto: user.profilePhoto,
    isAvailable: user.isAvailable,
    rating: user.rating ? parseFloat(user.rating) : null,
    totalJobs: user.totalJobs,
    vehicleDescription: user.vehicleDescription,
    createdAt: user.createdAt.toISOString(),
  };
}

export { formatUser };
export default router;
