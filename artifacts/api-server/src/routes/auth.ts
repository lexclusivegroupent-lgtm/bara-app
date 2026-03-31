import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, signToken, AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

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
  const isProd = process.env.NODE_ENV === "production";

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

    const appBaseUrl = process.env.APP_BASE_URL || "https://bara.app";
    const resetLink = `${appBaseUrl}/reset-password?token=${plainToken}`;
    const resend = getResend();

    if (resend) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Bära <noreply@bara.app>";
      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Reset your Bära password",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1B2A4A;">
            <h2 style="color: #1B2A4A;">Reset your password</h2>
            <p>Someone requested a password reset for your Bära account.</p>
            <p>
              <a href="${resetLink}"
                 style="display:inline-block;background:#C9A84C;color:#1B2A4A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Reset Password
              </a>
            </p>
            <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
      req.log?.info({ email: user.email }, "Password reset email sent via Resend");
    } else {
      req.log?.info({ email: user.email, resetLink }, "Password reset requested (no Resend configured — token logged)");
      console.log(`\n[RESET] Password reset for ${user.email}:\n  Link: ${resetLink}\n  Token: ${plainToken}\n  Expires: ${expiry.toISOString()}\n`);

      if (!isProd) {
        res.json({ message: SUCCESS_MSG, devToken: plainToken });
        return;
      }
    }

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
