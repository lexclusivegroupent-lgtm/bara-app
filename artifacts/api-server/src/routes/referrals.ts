import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referralCodesTable, referralUsageTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

/**
 * Generate a referral code for the authenticated user
 */
router.post("/create-code", authenticate, async (req: AuthenticatedRequest, res) => {
  const { type, bonusAmount, maxUses, expiresAt } = req.body;

  if (!["customer", "carrier"].includes(type)) {
    return res.status(400).json({ error: "type must be 'customer' or 'carrier'" });
  }

  if (typeof bonusAmount !== "number" || bonusAmount <= 0) {
    return res.status(400).json({ error: "bonusAmount must be a positive number" });
  }

  try {
    // Generate a unique code (8 uppercase letters + numbers)
    let code: string;
    let exists = true;
    while (exists) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const [existing] = await db.select().from(referralCodesTable)
        .where(eq(referralCodesTable.code, code))
        .limit(1);
      exists = !!existing;
    }

    const [created] = await db.insert(referralCodesTable).values({
      code,
      type: type as any,
      createdBy: req.userId!,
      bonusAmount: bonusAmount.toString(),
      maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();

    res.status(201).json(created);
  } catch (err) {
    req.log?.error(err, "Create referral code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Redeem a referral code
 */
router.post("/redeem", authenticate, async (req: AuthenticatedRequest, res) => {
  const { code } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "code is required" });
  }

  try {
    const [referralCode] = await db.select().from(referralCodesTable)
      .where(eq(referralCodesTable.code, code.toUpperCase()))
      .limit(1);

    if (!referralCode) {
      return res.status(404).json({ error: "Referral code not found" });
    }

    if (!referralCode.active) {
      return res.status(400).json({ error: "Referral code is no longer active" });
    }

    if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
      return res.status(400).json({ error: "Referral code has expired" });
    }

    if (referralCode.maxUses && referralCode.usedCount >= referralCode.maxUses) {
      return res.status(400).json({ error: "Referral code has reached max uses" });
    }

    // Check if user already used this code
    const [existing] = await db.select().from(referralUsageTable)
      .where(and(
        eq(referralUsageTable.referralCodeId, referralCode.id),
        eq(referralUsageTable.referredUserId, req.userId!)
      ))
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: "You have already redeemed this code" });
    }

    // Create referral usage record
    const [usage] = await db.insert(referralUsageTable).values({
      referralCodeId: referralCode.id,
      referredUserId: req.userId!,
      claimedBy: referralCode.createdBy,
    }).returning();

    // Increment referral code usage count
    await db.update(referralCodesTable)
      .set({ usedCount: sql`${referralCodesTable.usedCount} + 1` })
      .where(eq(referralCodesTable.id, referralCode.id));

    res.json({
      ok: true,
      referralId: usage.id,
      bonusAmount: referralCode.bonusAmount,
      type: referralCode.type,
      message: referralCode.type === "customer"
        ? "You'll receive your 50 SEK bonus on your first completed job"
        : "Your bonus will be awarded after 5 completed jobs",
    });
  } catch (err) {
    req.log?.error(err, "Redeem referral code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get referral history for the authenticated user
 */
router.get("/history", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Get referrals created by user
    const created = await db.select({
      id: referralCodesTable.id,
      code: referralCodesTable.code,
      type: referralCodesTable.type,
      bonusAmount: referralCodesTable.bonusAmount,
      usedCount: referralCodesTable.usedCount,
      maxUses: referralCodesTable.maxUses,
      active: referralCodesTable.active,
      createdAt: referralCodesTable.createdAt,
    }).from(referralCodesTable)
      .where(eq(referralCodesTable.createdBy, req.userId!));

    // Get referrals redeemed by user
    const redeemed = await db.select({
      id: referralUsageTable.id,
      bonusAmount: referralCodesTable.bonusAmount,
      type: referralCodesTable.type,
      claimedBy: referralUsageTable.claimedBy,
      bonusClaimed: referralUsageTable.bonusClaimed,
      bonusClaimedAt: referralUsageTable.bonusClaimedAt,
      claimedAt: referralUsageTable.claimedAt,
    }).from(referralUsageTable)
      .innerJoin(referralCodesTable, eq(referralUsageTable.referralCodeId, referralCodesTable.id))
      .where(eq(referralUsageTable.referredUserId, req.userId!));

    res.json({ created, redeemed });
  } catch (err) {
    req.log?.error(err, "Referral history error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get referral stats for the authenticated user
 */
router.get("/stats", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Get total bonus earned as referrer
    const [referrerStats] = await db.select({
      totalBonus: sql<number>`sum(cast(${referralCodesTable.bonusAmount} as float))`,
      totalRedeemed: sql<number>`count(*)`,
    }).from(referralUsageTable)
      .innerJoin(referralCodesTable, eq(referralUsageTable.referralCodeId, referralCodesTable.id))
      .where(eq(referralCodesTable.createdBy, req.userId!));

    // Get total bonus earned as referred user
    const [refereeStats] = await db.select({
      totalBonus: sql<number>`sum(cast(${referralCodesTable.bonusAmount} as float)) filter (where ${referralUsageTable.bonusClaimed} = true)`,
      totalClaimed: sql<number>`count(*) filter (where ${referralUsageTable.bonusClaimed} = true)`,
    }).from(referralUsageTable)
      .innerJoin(referralCodesTable, eq(referralUsageTable.referralCodeId, referralCodesTable.id))
      .where(eq(referralUsageTable.referredUserId, req.userId!));

    res.json({
      asReferrer: {
        totalBonus: referrerStats?.totalBonus ? parseFloat(referrerStats.totalBonus.toString()) : 0,
        totalRedeemed: referrerStats?.totalRedeemed || 0,
      },
      asReferee: {
        totalBonus: refereeStats?.totalBonus ? parseFloat(refereeStats.totalBonus.toString()) : 0,
        totalClaimed: refereeStats?.totalClaimed || 0,
      },
    });
  } catch (err) {
    req.log?.error(err, "Referral stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
