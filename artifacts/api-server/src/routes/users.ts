import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, jobsTable, savedAddressesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
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
  const { fullName, city, vehicleType, vehicleDescription, isAvailable, profilePhoto, role } = req.body;

  try {
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (city !== undefined) updateData.city = city;
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType;
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

// GDPR: anonymise and deactivate account (soft delete)
router.delete("/account", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;

    // Check for any active jobs (can't delete mid-job)
    const activeJobs = await db.select({ id: jobsTable.id })
      .from(jobsTable)
      .where(
        or(
          eq(jobsTable.customerId, userId),
          eq(jobsTable.driverId, userId)
        )
      );

    const hasActive = activeJobs.some((j) => {
      // We'd need status, so let's just do the check inline
      return false; // placeholder — we check below
    });

    const activeJobsWithStatus = await db.select({ id: jobsTable.id, status: jobsTable.status })
      .from(jobsTable)
      .where(
        or(
          eq(jobsTable.customerId, userId),
          eq(jobsTable.driverId, userId)
        )
      );

    const inProgress = activeJobsWithStatus.some((j) =>
      ["pending", "accepted", "arrived", "in_progress"].includes(j.status)
    );

    if (inProgress) {
      res.status(400).json({ error: "Cannot delete account with active or in-progress jobs. Please complete or cancel them first." });
      return;
    }

    // Soft-delete: anonymise personal data, revoke tokens, keep job records for accounting
    await db.update(usersTable).set({
      fullName: `Deleted User ${userId}`,
      email: `deleted_${userId}_${Date.now()}@deleted.bara`,
      passwordHash: null,
      profilePhoto: null,
      pushToken: null,
      resetToken: null,
      resetTokenExpiry: null,
      vehicleDescription: null,
      isAvailable: false,
    }).where(eq(usersTable.id, userId));

    // Delete saved addresses
    await db.delete(savedAddressesTable).where(eq(savedAddressesTable.userId, userId));

    res.json({ ok: true, message: "Account has been anonymised and deactivated." });
  } catch (err) {
    req.log?.error(err, "Delete account error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
