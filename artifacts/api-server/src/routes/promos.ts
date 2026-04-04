import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { promoCodesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/validate", authenticate, async (req: AuthenticatedRequest, res) => {
  const { code } = req.body;
  if (!code?.trim()) {
    res.status(400).json({ error: "code is required" });
    return;
  }
  try {
    const [promo] = await db.select().from(promoCodesTable)
      .where(eq(promoCodesTable.code, code.trim().toUpperCase()))
      .limit(1);

    if (!promo || !promo.active) {
      res.status(404).json({ error: "Invalid promo code" });
      return;
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      res.status(400).json({ error: "This promo code has expired" });
      return;
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      res.status(400).json({ error: "This promo code has reached its usage limit" });
      return;
    }

    res.json({
      code: promo.code,
      discountAmount: parseFloat(promo.discountAmount),
      expiresAt: promo.expiresAt?.toISOString() || null,
    });
  } catch (err) {
    req.log?.error(err, "Validate promo error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
