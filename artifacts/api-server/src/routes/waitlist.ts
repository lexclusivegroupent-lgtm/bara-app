import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, waitlistTable } from "@workspace/db";

const router = Router();

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  // "partner_interest" is submitted from the register screen's lightweight
  // "Are you a transport company?" card — no account is created, admin
  // follows up manually and onboards via POST /admin/partners.
  type: z.enum(["customer", "partner_interest"]).optional(),
  companyName: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  note: z.string().trim().max(1000).optional(),
});

router.post("/", async (req, res) => {
  const parsed = waitlistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid submission." });
    return;
  }
  const { email, type, companyName, phone, note } = parsed.data;
  const values = {
    email: email.toLowerCase().trim(),
    type: type ?? "customer",
    companyName: companyName || null,
    phone: phone || null,
    note: note || null,
  };
  try {
    await db.insert(waitlistTable).values(values);
    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err?.code === "23505") {
      // Same email submitting again (e.g. customer waitlist signup later
      // asking about becoming a partner) — update in place rather than
      // silently dropping the new information.
      try {
        await db.update(waitlistTable)
          .set({ type: values.type, companyName: values.companyName, phone: values.phone, note: values.note })
          .where(eq(waitlistTable.email, values.email));
      } catch {}
      res.status(200).json({ ok: true, already: true });
      return;
    }
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
