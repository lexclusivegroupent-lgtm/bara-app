import { Router, type IRouter } from "express";
import { Resend } from "resend";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

router.post("/contact", authenticate, async (req: AuthenticatedRequest, res) => {
  const { subject, message, userEmail, userName } = req.body;
  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL || "Bära <noreply@baraapp.se>";
  const supportEmail = "hello@baraapp.se";

  if (resend) {
    try {
      await resend.emails.send({
        from,
        to: [supportEmail],
        subject: `[Bära Support] ${subject?.trim() || "Customer inquiry"} — from ${userName ?? "user"}`,
        html: `
          <h2>Support Request</h2>
          <p><strong>From:</strong> ${userName ?? "Unknown"} (${userEmail ?? "no email"})</p>
          <p><strong>Subject:</strong> ${subject?.trim() || "No subject"}</p>
          <hr/>
          <p>${message.trim().replace(/\n/g, "<br/>")}</p>
        `,
      });
    } catch (err) {
      req.log?.error(err, "Support email send failed");
    }
  }

  res.json({ ok: true, message: "Support request received. We'll get back to you shortly." });
});

export default router;
