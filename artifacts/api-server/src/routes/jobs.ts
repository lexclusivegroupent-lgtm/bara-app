import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobsTable, usersTable, ratingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";
import { formatUser } from "./auth";

const router: IRouter = Router();

function formatJob(job: typeof jobsTable.$inferSelect, customer?: typeof usersTable.$inferSelect | null, driver?: typeof usersTable.$inferSelect | null) {
  return {
    id: job.id,
    customerId: job.customerId,
    driverId: job.driverId,
    jobType: job.jobType,
    status: job.status,
    pickupAddress: job.pickupAddress,
    dropoffAddress: job.dropoffAddress,
    homeAddress: job.homeAddress,
    itemDescription: job.itemDescription,
    preferredTime: job.preferredTime,
    distanceKm: job.distanceKm ? parseFloat(job.distanceKm) : null,
    priceTotal: parseFloat(job.priceTotal),
    driverPayout: parseFloat(job.driverPayout),
    platformFee: parseFloat(job.platformFee),
    rating: job.rating ? parseFloat(job.rating) : null,
    paymentStatus: job.paymentStatus,
    city: job.city,
    photosCustomer: job.photosCustomer || [],
    photosPickup: job.photosPickup || [],
    photosDropoff: job.photosDropoff || [],
    disputed: job.disputed,
    disputeReason: job.disputeReason,
    createdAt: job.createdAt.toISOString(),
    acceptedAt: job.acceptedAt?.toISOString() || null,
    arrivedAt: job.arrivedAt?.toISOString() || null,
    completedAt: job.completedAt?.toISOString() || null,
    disputedAt: job.disputedAt?.toISOString() || null,
    customer: customer ? formatUser(customer) : null,
    driver: driver ? formatUser(driver) : null,
  };
}

async function getJobWithUsers(jobId: number) {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job) return null;

  const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, job.customerId)).limit(1);
  const driver = job.driverId
    ? (await db.select().from(usersTable).where(eq(usersTable.id, job.driverId)).limit(1))[0]
    : null;

  return formatJob(job, customer, driver);
}

router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  const { city, status } = req.query;

  try {
    const conditions = [];
    if (city) conditions.push(eq(jobsTable.city, city as string));
    if (status) conditions.push(eq(jobsTable.status, status as any));

    const jobs = await db.select().from(jobsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${jobsTable.createdAt} DESC`);

    const enriched = await Promise.all(jobs.map(async (job) => {
      const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, job.customerId)).limit(1);
      const driver = job.driverId
        ? (await db.select().from(usersTable).where(eq(usersTable.id, job.driverId)).limit(1))[0]
        : null;
      return formatJob(job, customer, driver);
    }));

    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Get jobs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const job = await getJobWithUsers(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(job);
  } catch (err) {
    req.log?.error(err, "Get job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  const {
    jobType, pickupAddress, dropoffAddress, homeAddress,
    itemDescription, preferredTime, distanceKm, priceTotal,
    driverPayout, platformFee, city, customerPhotos,
  } = req.body;

  if (!jobType || !itemDescription || !preferredTime || !city || priceTotal == null) {
    res.status(400).json({ error: "Missing required fields: jobType, itemDescription, preferredTime, city, priceTotal" });
    return;
  }

  if (!["furniture_transport", "junk_pickup"].includes(jobType)) {
    res.status(400).json({ error: "Invalid jobType" });
    return;
  }

  try {
    const [job] = await db.insert(jobsTable).values({
      customerId: req.userId!,
      jobType,
      status: "pending",
      pickupAddress: pickupAddress || null,
      dropoffAddress: dropoffAddress || null,
      homeAddress: homeAddress || null,
      itemDescription: itemDescription.trim(),
      preferredTime,
      distanceKm: distanceKm?.toString() || null,
      priceTotal: priceTotal.toString(),
      driverPayout: (driverPayout ?? Math.round(priceTotal * 0.75)).toString(),
      platformFee: (platformFee ?? Math.round(priceTotal * 0.25)).toString(),
      paymentStatus: "unpaid",
      city,
      photosCustomer: Array.isArray(customerPhotos) ? customerPhotos : [],
    }).returning();

    const enriched = await getJobWithUsers(job.id);
    res.status(201).json(enriched);
  } catch (err) {
    req.log?.error(err, "Create job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/accept", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (existing.status !== "pending") {
      res.status(400).json({ error: "Job is no longer available" });
      return;
    }
    if (existing.customerId === req.userId) {
      res.status(400).json({ error: "You cannot accept a job you posted yourself" });
      return;
    }

    await db.update(jobsTable).set({
      status: "accepted",
      driverId: req.userId!,
      acceptedAt: new Date(),
    }).where(eq(jobsTable.id, jobId));

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Accept job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/arrived", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }
    if (existing.driverId !== req.userId) {
      res.status(403).json({ error: "Only the assigned driver can mark arrival" });
      return;
    }
    if (existing.status !== "accepted") {
      res.status(400).json({ error: "Job must be in accepted state to mark arrival" });
      return;
    }

    await db.update(jobsTable).set({
      status: "arrived",
      arrivedAt: new Date(),
    }).where(eq(jobsTable.id, jobId));

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Arrived job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/photos", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  const { pickupPhotos, dropoffPhotos } = req.body;
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }
    if (existing.driverId !== req.userId) {
      res.status(403).json({ error: "Only the assigned driver can upload photos" });
      return;
    }
    const updates: Record<string, any> = {};
    if (Array.isArray(pickupPhotos)) updates.photosPickup = pickupPhotos;
    if (Array.isArray(dropoffPhotos)) updates.photosDropoff = dropoffPhotos;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No photos provided" });
      return;
    }
    await db.update(jobsTable).set(updates).where(eq(jobsTable.id, jobId));
    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Photos upload error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/complete", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (existing.driverId !== req.userId) {
      res.status(403).json({ error: "Only the assigned driver can complete this job" });
      return;
    }
    if (!["accepted", "arrived", "in_progress"].includes(existing.status)) {
      res.status(400).json({ error: "Job cannot be completed in its current state" });
      return;
    }
    if (!existing.photosPickup || existing.photosPickup.length === 0) {
      res.status(400).json({ error: "At least one pickup photo is required before completing" });
      return;
    }
    if (!existing.photosDropoff || existing.photosDropoff.length === 0) {
      res.status(400).json({ error: "At least one dropoff photo is required before completing" });
      return;
    }

    await db.update(jobsTable).set({
      status: "completed",
      completedAt: new Date(),
      paymentStatus: "paid",
    }).where(eq(jobsTable.id, jobId));

    await db.update(usersTable).set({
      totalJobs: sql`${usersTable.totalJobs} + 1`,
    }).where(eq(usersTable.id, req.userId!));

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Complete job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/dispute", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    res.status(400).json({ error: "A reason is required to flag a dispute" });
    return;
  }
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }
    if (existing.customerId !== req.userId && existing.driverId !== req.userId) {
      res.status(403).json({ error: "You are not part of this job" });
      return;
    }
    if (existing.status === "cancelled") {
      res.status(400).json({ error: "Cannot dispute a cancelled job" });
      return;
    }
    if (existing.disputed) {
      res.status(400).json({ error: "This job has already been flagged for dispute" });
      return;
    }

    await db.update(jobsTable).set({
      disputed: true,
      disputeReason: reason.trim(),
      disputedAt: new Date(),
    }).where(eq(jobsTable.id, jobId));

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Dispute job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/rate", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  const { score, comment, ratedUserId } = req.body;

  if (!score || !ratedUserId) {
    res.status(400).json({ error: "score and ratedUserId are required" });
    return;
  }
  if (score < 1 || score > 5 || !Number.isInteger(score)) {
    res.status(400).json({ error: "score must be an integer between 1 and 5" });
    return;
  }

  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (existing.status !== "completed") {
      res.status(400).json({ error: "Job must be completed before rating" });
      return;
    }
    if (existing.customerId !== req.userId && existing.driverId !== req.userId) {
      res.status(403).json({ error: "You are not part of this job" });
      return;
    }
    const parsedRatedUserId = parseInt(ratedUserId);
    if (parsedRatedUserId !== existing.customerId && parsedRatedUserId !== existing.driverId) {
      res.status(400).json({ error: "Invalid ratedUserId — user is not part of this job" });
      return;
    }
    if (parsedRatedUserId === req.userId) {
      res.status(400).json({ error: "You cannot rate yourself" });
      return;
    }

    await db.insert(ratingsTable).values({
      jobId,
      raterId: req.userId!,
      ratedId: parsedRatedUserId,
      score,
      comment: comment || null,
    });

    const allRatings = await db.select().from(ratingsTable).where(eq(ratingsTable.ratedId, parsedRatedUserId));
    const avgRating = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length;

    await db.update(usersTable).set({
      rating: avgRating.toFixed(2),
    }).where(eq(usersTable.id, parsedRatedUserId));

    await db.update(jobsTable).set({ rating: score.toString() }).where(eq(jobsTable.id, jobId));

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Rate job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/cancel", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (existing.customerId !== req.userId && existing.driverId !== req.userId) {
      res.status(403).json({ error: "You are not authorized to cancel this job" });
      return;
    }
    if (existing.status === "completed" || existing.status === "cancelled") {
      res.status(400).json({ error: "Job cannot be cancelled in its current state" });
      return;
    }
    if (existing.customerId === req.userId && existing.status !== "pending") {
      res.status(400).json({ error: "Cannot cancel — a driver has already accepted this job" });
      return;
    }

    await db.update(jobsTable).set({ status: "cancelled" }).where(eq(jobsTable.id, jobId));

    if (existing.driverId === req.userId) {
      await db.update(usersTable).set({
        cancellationsCount: sql`${usersTable.cancellationsCount} + 1`,
      }).where(eq(usersTable.id, req.userId!));
    }

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Cancel job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { formatJob };
export default router;
