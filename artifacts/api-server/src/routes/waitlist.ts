import { Router } from "express";
import { z } from "zod";
import { db, waitlistTable } from "@workspace/db";

const router = Router();

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

router.post("/", async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid email." });
    return;
  }
  try {
    await db.insert(waitlistTable).values({ email: parsed.data.email.toLowerCase().trim() });
    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(200).json({ ok: true, already: true });
      return;
    }
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
