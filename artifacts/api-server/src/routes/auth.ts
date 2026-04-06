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

    // Send welcome email (non-blocking)
    const resend = getResend();
    if (resend) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Bära <noreply@baraapp.se>";
      const firstName = fullName.split(" ")[0];
      const isDriver = role === "driver" || role === "both";
      const subject = isDriver ? "Välkommen till Bära-teamet! 🚛💰" : "Välkommen till Bära! 🚛";
      const html = isDriver ? `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#1B2A4A;color:#fff;border-radius:16px;overflow:hidden;">
          <div style="background:#C9A84C;padding:32px;text-align:center;">
            <h1 style="margin:0;color:#1B2A4A;font-size:28px;font-weight:800;">Bära</h1>
            <p style="color:#1B2A4A;margin:8px 0 0;font-size:14px;font-weight:600;">Sveriges first on-demand transport app</p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#C9A84C;margin:0 0 8px;">Hej ${firstName}! 👋</h2>
            <p>Du är nu registrerad som Bära-förare. Här är hur du kommer igång:</p>
            <ol style="color:#C4C9D4;line-height:1.8;">
              <li>Sätt din status till <strong style="color:#fff">Tillgänglig</strong> på kartan</li>
              <li>Vänta på jobbförfrågningar i din stad</li>
              <li>Acceptera jobb och tjäna 75% av varje jobb</li>
            </ol>
            <div style="background:#243252;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #C9A84C;">
              <p style="margin:0;font-size:13px;color:#C9A84C;font-weight:600;">💡 Skattepåminnelse</p>
              <p style="margin:8px 0 0;font-size:13px;color:#C4C9D4;">Kom ihåg att sätta undan 30% av dina intäkter för skatt.</p>
            </div>
            <p>Glöm inte att ange din fordonstyp i inställningarna.</p>
            <hr style="border:none;border-top:1px solid #2D3F60;margin:24px 0;" />
            <p style="color:#C4C9D4;font-size:13px;">Remember to set your vehicle type in Settings.<br>Earn 75% of every job · No minimum requirements · You set your own hours.</p>
            <a href="https://app.baraapp.se" style="display:inline-block;background:#C9A84C;color:#1B2A4A;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:16px;">Öppna Bära</a>
            <p style="color:#C4C9D4;font-size:13px;margin-top:24px;">Support: <a href="mailto:hello@baraapp.se" style="color:#C9A84C;">hello@baraapp.se</a></p>
          </div>
          <div style="background:#243252;padding:16px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6B7280;">© 2026 Bära AB · baraapp.se</p>
          </div>
        </div>
      ` : `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#1B2A4A;color:#fff;border-radius:16px;overflow:hidden;">
          <div style="background:#C9A84C;padding:32px;text-align:center;">
            <h1 style="margin:0;color:#1B2A4A;font-size:28px;font-weight:800;">Bära</h1>
            <p style="color:#1B2A4A;margin:8px 0 0;font-size:14px;font-weight:600;">Sveriges first on-demand transport app</p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#C9A84C;margin:0 0 8px;">Hej ${firstName}! 👋</h2>
            <p>Du är nu en del av Bära — Sveriges första app för möbeltransport på begäran.</p>
            <ol style="color:#C4C9D4;line-height:1.8;">
              <li>Tryck på <strong style="color:#fff">Nytt jobb</strong> på startsidan</li>
              <li>Beskriv vad som ska flyttas och välj tid</li>
              <li>En verifierad förare nära dig accepterar jobbet</li>
            </ol>
            <a href="https://app.baraapp.se" style="display:inline-block;background:#C9A84C;color:#1B2A4A;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:16px;">Lägg upp ditt första jobb</a>
            <hr style="border:none;border-top:1px solid #2D3F60;margin:24px 0;" />
            <p style="color:#C4C9D4;font-size:13px;">Post your first job and get help within hours.<br>Simple, fast and affordable furniture transport across Sweden.</p>
            <p style="color:#C4C9D4;font-size:13px;">Support: <a href="mailto:hello@baraapp.se" style="color:#C9A84C;">hello@baraapp.se</a></p>
          </div>
          <div style="background:#243252;padding:16px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6B7280;">© 2026 Bära AB · baraapp.se</p>
          </div>
        </div>
      `;
      resend.emails.send({ from: fromEmail, to: email.toLowerCase(), subject, html }).catch(() => {});
    }

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
    vehicleType: user.vehicleType,
    vehicleDescription: user.vehicleDescription,
    createdAt: user.createdAt.toISOString(),
  };
}

export { formatUser };
export default router;
