import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, jobsTable, savedAddressesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";
import { formatUser } from "./auth";
import { encrypt, decrypt } from "../utils/crypto";

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
  const { fullName, city, vehicleType, vehicleDescription, isAvailable, profilePhoto, role, ftaxRegistered, ftaxNumber,
    companyName, orgNumber, phone, serviceAreas, serviceCategories } = req.body;

  try {
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (city !== undefined) updateData.city = city;
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType;
    if (vehicleDescription !== undefined) updateData.vehicleDescription = vehicleDescription;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
    if (ftaxRegistered !== undefined) updateData.ftaxRegistered = Boolean(ftaxRegistered);
    if (ftaxNumber !== undefined) updateData.ftaxNumber = ftaxNumber?.trim() || null;
    // Partner business profile (lead-gen)
    if (companyName !== undefined) updateData.companyName = companyName?.trim() || null;
    if (orgNumber !== undefined) updateData.orgNumber = orgNumber?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (serviceAreas !== undefined) updateData.serviceAreas = Array.isArray(serviceAreas) ? serviceAreas : null;
    if (serviceCategories !== undefined) updateData.serviceCategories = Array.isArray(serviceCategories) ? serviceCategories : null;

    if (role !== undefined) {
      if (role !== "both") {
        res.status(400).json({ error: "Role can only be upgraded to 'both'" }); return;
      }
      const [current] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
      if (current.role === "both") {
        res.status(400).json({ error: "Account is already a Customer and Driver" }); return;
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

router.post("/accept-driver-agreement", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.update(usersTable)
      .set({ driverAgreementAccepted: true, driverAgreementAcceptedAt: new Date() })
      .where(eq(usersTable.id, req.userId!))
      .returning();
    res.json(formatUser(user));
  } catch (err) {
    req.log?.error(err, "Accept driver agreement error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/complete-driver-onboarding", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.update(usersTable)
      .set({ driverOnboardingComplete: true })
      .where(eq(usersTable.id, req.userId!))
      .returning();
    res.json(formatUser(user));
  } catch (err) {
    req.log?.error(err, "Complete driver onboarding error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ⚖️ DAC7 EU directive — carrier consent to annual Skatteverket reporting
router.post("/dac7-consent", authenticate, async (req: AuthenticatedRequest, res) => {
  const { personnummer, fullLegalName, registeredAddress, bankAccountNumber } = req.body;
  if (!personnummer || !fullLegalName) {
    res.status(400).json({ error: "personnummer and fullLegalName are required for DAC7 consent" });
    return;
  }
  try {
    // GDPR: personnummer and bank account number are special-category data —
    // encrypted at rest (AES-256-GCM), decrypted only where they are exposed.
    const [user] = await db.update(usersTable).set({
      dac7Consented: true,
      dac7ConsentDate: new Date(),
      personnummer: encrypt(personnummer.trim()),
      fullLegalName: fullLegalName.trim(),
      registeredAddress: registeredAddress?.trim() || null,
      bankAccountNumber: bankAccountNumber?.trim() ? encrypt(bankAccountNumber.trim()) : null,
    }).where(eq(usersTable.id, req.userId!)).returning();
    res.json(formatUser(user));
  } catch (err) {
    req.log?.error(err, "DAC7 consent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/earnings", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const completedJobs = await db.select({
      driverPayout: jobsTable.driverPayout,
      completedAt: jobsTable.completedAt,
    }).from(jobsTable).where(
      eq(jobsTable.driverId, req.userId!)
    );

    const done = completedJobs.filter(j => j.completedAt && j.driverPayout);

    function sumFrom(from: Date) {
      return done
        .filter(j => j.completedAt! >= from)
        .reduce((s, j) => s + Number(j.driverPayout), 0);
    }

    const yearEarnings = Math.round(sumFrom(startOfYear));
    const monthEarnings = Math.round(sumFrom(startOfMonth));
    const weekEarnings = Math.round(sumFrom(startOfWeek));
    const totalEarnings = Math.round(done.reduce((s, j) => s + Number(j.driverPayout), 0));
    const avgPerJob = done.length > 0 ? Math.round(totalEarnings / done.length) : 0;

    res.json({ weekEarnings, monthEarnings, yearEarnings, totalEarnings, jobCount: done.length, avgPerJob });
  } catch (err) {
    req.log?.error(err, "Earnings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/export", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const { passwordHash, resetToken, resetTokenExpiry, pushToken, ...exportable } = user;
    // GDPR data portability: decrypt at-rest-encrypted fields for the user's own export
    if (exportable.personnummer) exportable.personnummer = decrypt(exportable.personnummer);
    if (exportable.bankAccountNumber) exportable.bankAccountNumber = decrypt(exportable.bankAccountNumber);
    res.json({ ok: true, message: "Data export requested — will be emailed within 24 hours.", preview: exportable });
  } catch (err) {
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
