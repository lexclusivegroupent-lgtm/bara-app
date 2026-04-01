import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.put("/push-token", authenticate, async (req: AuthenticatedRequest, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }
  try {
    await db.update(usersTable).set({ pushToken: token }).where(eq(usersTable.id, req.userId!));
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err, "Save push token error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/profile", authenticate, async (req: AuthenticatedRequest, res) => {
  const { fullName, city, vehicleDescription, isAvailable, profilePhoto, role } = req.body;

  try {
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (city !== undefined) updateData.city = city;
    if (vehicleDescription !== undefined) updateData.vehicleDescription = vehicleDescription;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;

    if (role !== undefined) {
      if (role !== "both") {
        return res.status(400).json({ error: "Role can only be upgraded to 'both'" });
      }
      const [current] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
      if (current.role === "both") {
        return res.status(400).json({ error: "Account is already a Customer and Driver" });
      }
      updateData.role = "both";
    }

    const [user] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, req.userId!))
      .returning();

    res.json(formatUser(user));
  } catch (err) {
    req.log?.error(err, "Update profile error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
