import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { jobsTable, usersTable } from "@workspace/db";
import { eq, sql, count, desc, inArray, and } from "drizzle-orm";
import { adminDashboardHtml } from "./admin-html";

const router: IRouter = Router();

const DEFAULT_ADMIN_KEY = "bara-admin-2025";

router.get("/dashboard", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(adminDashboardHtml);
});

function checkAdminKey(req: Request, res: Response): boolean {
  const isProd = process.env.NODE_ENV === "production";
  const configuredKey = process.env.BARA_ADMIN_KEY || process.env.ADMIN_STATS_KEY;

  if (isProd && (!configuredKey || configuredKey === DEFAULT_ADMIN_KEY)) {
    res.status(403).json({
      error: "Admin stats are disabled. Set ADMIN_STATS_KEY to a secure value in your production environment variables.",
    });
    return false;
  }

  const adminKey = (configuredKey || DEFAULT_ADMIN_KEY).trim();
  const provided = ((req.headers["x-admin-key"] as string) || (req.query.key as string) || "").trim();

  if (!provided || provided !== adminKey) {
    res.status(401).json({ error: "Unauthorized. Provide x-admin-key header or ?key= query param." });
    return false;
  }
  return true;
}

router.get("/stats", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;

  try {
    const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(usersTable);
    const [{ totalDrivers }] = await db.select({ totalDrivers: count() }).from(usersTable).where(eq(usersTable.role, "driver"));
    const [{ totalBothRoleUsers }] = await db.select({ totalBothRoleUsers: count() }).from(usersTable).where(eq(usersTable.role, "both"));
    const [{ activeDrivers }] = await db.select({ activeDrivers: sql<number>`count(*) filter (where ${usersTable.isAvailable} = true)` }).from(usersTable).where(sql`${usersTable.role} in ('driver', 'both')`);
    const [{ totalJobs }] = await db.select({ totalJobs: count() }).from(jobsTable);
    const [{ totalCompletedJobs }] = await db.select({ totalCompletedJobs: count() }).from(jobsTable).where(eq(jobsTable.status, "completed"));
    const [{ totalCancelledJobs }] = await db.select({ totalCancelledJobs: count() }).from(jobsTable).where(eq(jobsTable.status, "cancelled"));
    const [{ totalDisputedJobs }] = await db.select({ totalDisputedJobs: count() }).from(jobsTable).where(eq(jobsTable.disputed, true));
    const [{ totalPendingJobs }] = await db.select({ totalPendingJobs: count() }).from(jobsTable).where(eq(jobsTable.status, "pending"));
    const [{ avgCompletionMinutes }] = await db.select({ avgCompletionMinutes: sql<number>`avg(extract(epoch from (${jobsTable.completedAt} - ${jobsTable.createdAt})) / 60) filter (where ${jobsTable.status} = 'completed' and ${jobsTable.completedAt} is not null)` }).from(jobsTable);

    const jobsByType = await db.select({ jobType: jobsTable.jobType, total: count(), completed: sql<number>`count(*) filter (where ${jobsTable.status} = 'completed')` }).from(jobsTable).groupBy(jobsTable.jobType).orderBy(sql`count(*) desc`);
    const jobsByCity = await db.select({ city: jobsTable.city, total: count(), completed: sql<number>`count(*) filter (where ${jobsTable.status} = 'completed')`, cancelled: sql<number>`count(*) filter (where ${jobsTable.status} = 'cancelled')` }).from(jobsTable).groupBy(jobsTable.city).orderBy(sql`count(*) desc`);
    const activeDriversByCity = await db.select({ city: usersTable.city, activeDrivers: sql<number>`count(*) filter (where ${usersTable.isAvailable} = true)`, totalDrivers: count() }).from(usersTable).where(sql`${usersTable.role} in ('driver', 'both')`).groupBy(usersTable.city).orderBy(sql`count(*) desc`);

    const [{ oldestJob }] = await db.select({ oldestJob: sql<string>`min(${jobsTable.createdAt})` }).from(jobsTable);
    let avgJobsPerDay: number | null = null;
    if (oldestJob && totalJobs > 0) {
      const daysSinceFirst = Math.max(1, (Date.now() - new Date(oldestJob).getTime()) / (1000 * 60 * 60 * 24));
      avgJobsPerDay = Math.round((Number(totalJobs) / daysSinceFirst) * 10) / 10;
    }

    res.json({
      overview: {
        totalUsers, totalDrivers: Number(totalDrivers) + Number(totalBothRoleUsers), activeDrivers,
        totalJobs, totalPendingJobs, totalCompletedJobs, totalCancelledJobs, totalDisputedJobs,
        completionRate: totalJobs > 0 ? Math.round((Number(totalCompletedJobs) / Number(totalJobs)) * 100) : 0,
        cancellationRate: totalJobs > 0 ? Math.round((Number(totalCancelledJobs) / Number(totalJobs)) * 100) : 0,
        avgCompletionMinutes: avgCompletionMinutes ? Math.round(Number(avgCompletionMinutes)) : null,
        avgJobsPerDay, firstJobAt: oldestJob || null, generatedAt: new Date().toISOString(),
      },
      jobsByType, jobsByCity, activeDriversByCity,
    });
  } catch (err: any) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/jobs", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;
  try {
    const { status, city } = req.query as Record<string, string>;
    const conditions: any[] = [];
    if (status) conditions.push(eq(jobsTable.status, status as any));
    if (city) conditions.push(sql`lower(${jobsTable.city}) like ${"%" + city.toLowerCase() + "%"}`);

    const jobs = await db.select().from(jobsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(jobsTable.createdAt))
      .limit(200);

    if (jobs.length === 0) return res.json([]);

    const userIds = [...new Set([
      ...jobs.map(j => j.customerId).filter(Boolean),
      ...jobs.map(j => j.driverId).filter(Boolean),
    ])] as number[];

    const users = userIds.length > 0
      ? await db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    res.json(jobs.map(j => ({
      ...j,
      customerName: j.customerId ? userMap[j.customerId]?.fullName ?? null : null,
      customerEmail: j.customerId ? userMap[j.customerId]?.email ?? null : null,
      driverName: j.driverId ? userMap[j.driverId]?.fullName ?? null : null,
      driverEmail: j.driverId ? userMap[j.driverId]?.email ?? null : null,
    })));
  } catch (err: any) {
    console.error("Admin jobs error:", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

router.get("/jobs/:id", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;
  try {
    const id = Number(req.params.id);
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });

    const userIds = [job.customerId, job.driverId].filter(Boolean) as number[];
    const users = userIds.length > 0
      ? await db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email, rating: usersTable.rating, totalJobs: usersTable.totalJobs, city: usersTable.city }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    res.json({
      ...job,
      customer: job.customerId ? userMap[job.customerId] ?? null : null,
      driver: job.driverId ? userMap[job.driverId] ?? null : null,
    });
  } catch (err: any) {
    console.error("Admin job detail error:", err);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

router.get("/users", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;
  try {
    const { role } = req.query as Record<string, string>;
    const conditions: any[] = [];
    if (role) conditions.push(eq(usersTable.role, role as any));

    const users = await db.select({
      id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName,
      role: usersTable.role, city: usersTable.city, rating: usersTable.rating,
      totalJobs: usersTable.totalJobs, verificationStatus: usersTable.verificationStatus,
      isAvailable: usersTable.isAvailable, cancellationsCount: usersTable.cancellationsCount,
      noShowCount: usersTable.noShowCount, createdAt: usersTable.createdAt,
    }).from(usersTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(usersTable.createdAt))
      .limit(200);

    res.json(users);
  } catch (err: any) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/users/:id", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;
  try {
    const id = Number(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ error: "User not found" });

    const jobsAsCustomer = await db.select({
      id: jobsTable.id, jobType: jobsTable.jobType, status: jobsTable.status,
      priceTotal: jobsTable.priceTotal, city: jobsTable.city, createdAt: jobsTable.createdAt,
      driverId: jobsTable.driverId,
    }).from(jobsTable).where(eq(jobsTable.customerId, id)).orderBy(desc(jobsTable.createdAt)).limit(20);

    const jobsAsDriver = await db.select({
      id: jobsTable.id, jobType: jobsTable.jobType, status: jobsTable.status,
      driverPayout: jobsTable.driverPayout, city: jobsTable.city, createdAt: jobsTable.createdAt,
      customerId: jobsTable.customerId,
    }).from(jobsTable).where(eq(jobsTable.driverId, id)).orderBy(desc(jobsTable.createdAt)).limit(20);

    const { passwordHash, resetToken, resetTokenExpiry, pushToken, ...safeUser } = user;
    res.json({ user: safeUser, jobsAsCustomer, jobsAsDriver });
  } catch (err: any) {
    console.error("Admin user detail error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.get("/drivers", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;
  try {
    const { verificationStatus } = req.query as Record<string, string>;
    const conditions: any[] = [sql`${usersTable.role} in ('driver', 'both')`];
    if (verificationStatus) conditions.push(eq(usersTable.verificationStatus, verificationStatus as any));

    const drivers = await db.select({
      id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName,
      role: usersTable.role, city: usersTable.city, rating: usersTable.rating,
      totalJobs: usersTable.totalJobs, verificationStatus: usersTable.verificationStatus,
      driverLicenseStatus: usersTable.driverLicenseStatus, isAvailable: usersTable.isAvailable,
      cancellationsCount: usersTable.cancellationsCount, noShowCount: usersTable.noShowCount,
      vehicleDescription: usersTable.vehicleDescription, createdAt: usersTable.createdAt,
    }).from(usersTable)
      .where(and(...conditions))
      .orderBy(desc(usersTable.createdAt))
      .limit(200);

    res.json(drivers);
  } catch (err: any) {
    console.error("Admin drivers error:", err);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

router.put("/drivers/:id/verify", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;
  try {
    const id = Number(req.params.id);
    const { action } = req.body as { action: "approve" | "reject" };
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    }

    const newStatus = action === "approve" ? "verified" : "rejected";
    const [updated] = await db.update(usersTable)
      .set({ verificationStatus: newStatus as any })
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id, verificationStatus: usersTable.verificationStatus, fullName: usersTable.fullName });

    if (!updated) return res.status(404).json({ error: "Driver not found" });
    res.json({ success: true, driver: updated });
  } catch (err: any) {
    console.error("Admin driver verify error:", err);
    res.status(500).json({ error: "Failed to update driver" });
  }
});

router.get("/disputes", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;
  try {
    const jobs = await db.select().from(jobsTable)
      .where(eq(jobsTable.disputed, true))
      .orderBy(desc(jobsTable.createdAt))
      .limit(200);

    if (jobs.length === 0) return res.json([]);

    const userIds = [...new Set([
      ...jobs.map(j => j.customerId).filter(Boolean),
      ...jobs.map(j => j.driverId).filter(Boolean),
    ])] as number[];

    const users = userIds.length > 0
      ? await db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    res.json(jobs.map(j => ({
      ...j,
      customerName: j.customerId ? userMap[j.customerId]?.fullName ?? null : null,
      driverName: j.driverId ? userMap[j.driverId]?.fullName ?? null : null,
    })));
  } catch (err: any) {
    console.error("Admin disputes error:", err);
    res.status(500).json({ error: "Failed to fetch disputes" });
  }
});

router.post("/disputes/:id/resolve", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;
  try {
    const id = Number(req.params.id);
    const { note } = req.body as { note: string };
    if (!note || !note.trim()) {
      return res.status(400).json({ error: "Resolution note is required" });
    }

    const [updated] = await db.update(jobsTable)
      .set({ disputeResolvedNote: note.trim(), disputeResolvedAt: new Date() })
      .where(eq(jobsTable.id, id))
      .returning({ id: jobsTable.id, disputeResolvedNote: jobsTable.disputeResolvedNote, disputeResolvedAt: jobsTable.disputeResolvedAt });

    if (!updated) return res.status(404).json({ error: "Job not found" });
    res.json({ success: true, job: updated });
  } catch (err: any) {
    console.error("Admin dispute resolve error:", err);
    res.status(500).json({ error: "Failed to resolve dispute" });
  }
});

// Seed demo data endpoint — creates sample jobs for testing
router.post("/seed-demo", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;
  try {
    // Check if demo user already exists
    const existingDemo = await db.select().from(usersTable).where(eq(usersTable.email, "demo@baraapp.se")).limit(1);
    let demoUserId: number;
    let demoDriverId: number;

    if (existingDemo.length > 0) {
      demoUserId = existingDemo[0].id;
    } else {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash("demo1234", 10);
      const [customer] = await db.insert(usersTable).values({
        email: "demo@baraapp.se",
        fullName: "Demo Kund",
        role: "customer",
        passwordHash: hash,
        isAvailable: false,
        totalJobs: 0,
      }).returning();
      demoUserId = customer.id;
    }

    const existingDriver = await db.select().from(usersTable).where(eq(usersTable.email, "demo.driver@baraapp.se")).limit(1);
    if (existingDriver.length > 0) {
      demoDriverId = existingDriver[0].id;
    } else {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash("demo1234", 10);
      const [driver] = await db.insert(usersTable).values({
        email: "demo.driver@baraapp.se",
        fullName: "Demo Förare",
        role: "driver",
        passwordHash: hash,
        isAvailable: true,
        totalJobs: 12,
        vehicleType: "van",
        vehicleDescription: "VW Transporter 2021",
        lat: 59.3293,
        lng: 18.0686,
      }).returning();
      demoDriverId = driver.id;
    }

    // Seed 5 sample jobs
    const now = new Date();
    const sampleJobs = [
      { customerId: demoUserId, driverId: demoDriverId, status: "completed" as const, jobType: "furniture_transport" as const, pickupAddress: "Drottninggatan 1, Stockholm", dropoffAddress: "Södermalm, Stockholm", itemDescription: "3-sits soffa + kaffebord", distanceKm: 4.2, priceTotal: 890, driverPayout: 668, platformFee: 222, preferredTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
      { customerId: demoUserId, driverId: null, status: "pending" as const, jobType: "junk_pickup" as const, pickupAddress: null, dropoffAddress: null, homeAddress: "Vasagatan 10, Stockholm", itemDescription: "Gammal tvättmaskin + tre IKEA-stolar", distanceKm: 0, priceTotal: 599, driverPayout: 449, platformFee: 150, preferredTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
      { customerId: demoUserId, driverId: demoDriverId, status: "in_progress" as const, jobType: "bulky_delivery" as const, pickupAddress: "IKEA Kungens Kurva, Huddinge", dropoffAddress: "Nacka, Stockholm", itemDescription: "PAX garderob 236cm", distanceKm: 18.5, priceTotal: 1290, driverPayout: 968, platformFee: 322, preferredTime: now },
      { customerId: demoUserId, driverId: demoDriverId, status: "completed" as const, jobType: "furniture_transport" as const, pickupAddress: "Gamla Stan, Stockholm", dropoffAddress: "Östermalm, Stockholm", itemDescription: "Skrivbord + kontorsstol + 4 kartonger", distanceKm: 2.8, priceTotal: 749, driverPayout: 562, platformFee: 187, preferredTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      { customerId: demoUserId, driverId: null, status: "pending" as const, jobType: "furniture_transport" as const, pickupAddress: "Kungsholmen, Stockholm", dropoffAddress: "Bromma, Stockholm", itemDescription: "Dubbelsäng med resårmadrass", distanceKm: 7.1, priceTotal: 999, driverPayout: 749, platformFee: 250, preferredTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) },
    ];

    const inserted = await db.insert(jobsTable).values(sampleJobs).returning({ id: jobsTable.id });
    res.json({ success: true, created: { demoCustomerId: demoUserId, demoDriverId, jobs: inserted.map(j => j.id) } });
  } catch (err: any) {
    console.error("Seed demo error:", err);
    res.status(500).json({ error: "Failed to seed demo data", detail: err.message });
  }
});

export default router;
