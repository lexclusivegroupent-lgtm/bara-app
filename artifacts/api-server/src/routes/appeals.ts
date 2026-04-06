import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { appealsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";
import { authenticateAdmin } from "../middlewares/admin";

const router: IRouter = Router();

router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  const { reason, explanation, supportingInfo, photoUrl } = req.body;
  if (!reason?.trim() || !explanation?.trim()) {
    res.status(400).json({ error: "reason and explanation are required" });
    return;
  }
  try {
    const [appeal] = await db.insert(appealsTable).values({
      userId: req.userId!,
      reason: reason.trim(),
      explanation: explanation.trim(),
      supportingInfo: supportingInfo?.trim() || null,
      photoUrl: photoUrl || null,
      status: "pending",
    }).returning();
    res.status(201).json(appeal);
  } catch (err) {
    req.log?.error(err, "Submit appeal error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const appeals = await db
      .select({
        id: appealsTable.id,
        userId: appealsTable.userId,
        reason: appealsTable.reason,
        explanation: appealsTable.explanation,
        supportingInfo: appealsTable.supportingInfo,
        photoUrl: appealsTable.photoUrl,
        status: appealsTable.status,
        adminNotes: appealsTable.adminNotes,
        createdAt: appealsTable.createdAt,
        resolvedAt: appealsTable.resolvedAt,
        driverName: usersTable.fullName,
        driverEmail: usersTable.email,
      })
      .from(appealsTable)
      .leftJoin(usersTable, eq(appealsTable.userId, usersTable.id))
      .orderBy(desc(appealsTable.createdAt));
    res.json(appeals);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authenticateAdmin, async (req, res) => {
  const { status, adminNotes } = req.body;
  if (!["reviewed", "approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  try {
    const [appeal] = await db.update(appealsTable)
      .set({
        status,
        adminNotes: adminNotes?.trim() || null,
        resolvedAt: new Date(),
      })
      .where(eq(appealsTable.id, parseInt(req.params.id)))
      .returning();
    if (!appeal) { res.status(404).json({ error: "Appeal not found" }); return; }
    res.json(appeal);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
