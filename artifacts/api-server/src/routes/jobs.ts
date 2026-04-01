import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobsTable, usersTable, ratingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";
import { formatUser } from "./auth";
import { sendPushToUser, sendPush } from "../utils/push";

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
    customerPrice: job.customerPrice ? parseFloat(job.customerPrice) : null,
    cancellationFee: job.cancellationFee ? parseFloat(job.cancellationFee) : null,
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
    driverPayout, platformFee, city, customerPhotos, customerPrice,
  } = req.body;

  if (!jobType || !itemDescription || !preferredTime || !city || priceTotal == null) {
    res.status(400).json({ error: "Missing required fields: jobType, itemDescription, preferredTime, city, priceTotal" });
    return;
  }

  if (!["furniture_transport", "bulky_delivery", "junk_pickup"].includes(jobType)) {
    res.status(400).json({ error: "Invalid jobType" });
    return;
  }

  const suggested = parseFloat(priceTotal);
  const minAllowed = Math.max(299, Math.round(suggested * 0.70));
  const maxAllowed = Math.round(suggested * 1.30);

  let resolvedCustomerPrice: number | null = null;
  if (customerPrice != null) {
    const cp = parseFloat(customerPrice);
    if (isNaN(cp) || cp < minAllowed || cp > maxAllowed) {
      res.status(400).json({
        error: `Customer price must be between ${minAllowed} and ${maxAllowed} kr (±30% of suggested ${Math.round(suggested)} kr)`,
      });
      return;
    }
    resolvedCustomerPrice = Math.round(cp);
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
      customerPrice: resolvedCustomerPrice != null ? resolvedCustomerPrice.toString() : null,
      paymentStatus: "unpaid",
      city,
      photosCustomer: Array.isArray(customerPhotos) ? customerPhotos : [],
    }).returning();

    const enriched = await getJobWithUsers(job.id);
    res.status(201).json(enriched);

    // Notify all available drivers in the same city (fire and forget)
    const typeLabel = jobType === "furniture_transport" ? "Furniture transport" : jobType === "bulky_delivery" ? "Bulky delivery" : "Junk pickup";
    db.select({ pushToken: usersTable.pushToken }).from(usersTable)
      .where(and(eq(usersTable.city, city), eq(usersTable.isAvailable, true)))
      .then((drivers) => {
        const messages = drivers
          .filter((d) => d.pushToken)
          .map((d) => ({
            to: d.pushToken!,
            title: `New job in ${city}`,
            body: `${typeLabel} — ${itemDescription.trim().slice(0, 60)}`,
            data: { screen: "driver-job", jobId: job.id },
            sound: "default" as const,
          }));
        return sendPush(messages);
      })
      .catch(() => {});
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

    // Notify customer that driver accepted
    const [customer] = await db.select({ pushToken: usersTable.pushToken, fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, existing.customerId)).limit(1).catch(() => []);
    const [driver] = await db.select({ fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1).catch(() => []);
    sendPushToUser(
      customer?.pushToken,
      "Driver on the way! 🚛",
      `${driver?.fullName ?? "Your driver"} has accepted your job and is heading over.`,
      { screen: "customer-job", jobId }
    ).catch(() => {});
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

    // Notify customer that driver has arrived
    const [arrivedCustomer] = await db.select({ pushToken: usersTable.pushToken })
      .from(usersTable).where(eq(usersTable.id, existing.customerId)).limit(1).catch(() => []);
    sendPushToUser(
      arrivedCustomer?.pushToken,
      "Driver has arrived! 📍",
      "Your driver is at the pickup location and ready to go.",
      { screen: "customer-job", jobId }
    ).catch(() => {});
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

    // Notify both customer and driver that job is complete
    const [completedCustomer] = await db.select({ pushToken: usersTable.pushToken })
      .from(usersTable).where(eq(usersTable.id, existing.customerId)).limit(1).catch(() => []);
    const [completedDriver] = await db.select({ pushToken: usersTable.pushToken })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1).catch(() => []);
    sendPush([
      {
        to: completedCustomer?.pushToken ?? "",
        title: "Job completed! ✅",
        body: "Your job is done. Please take a moment to rate your driver.",
        data: { screen: "customer-job", jobId },
        sound: "default",
      },
      {
        to: completedDriver?.pushToken ?? "",
        title: "Great work! 💰",
        body: "Job marked as complete. Payment is on its way.",
        data: { screen: "driver-job", jobId },
        sound: "default",
      },
    ]).catch(() => {});
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

// Cancellation fee applied when customer cancels AFTER a driver has accepted.
// Default: 150 kr fixed fee. Update this constant to change the policy.
const CANCELLATION_FEE_AFTER_ACCEPTANCE = 150;

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
    if (["completed", "cancelled", "cancelled_by_customer"].includes(existing.status)) {
      res.status(400).json({ error: "Job cannot be cancelled in its current state" });
      return;
    }

    const isCustomer = existing.customerId === req.userId;
    const driverAssigned = !!existing.driverId && existing.status !== "pending";

    if (isCustomer) {
      if (!driverAssigned) {
        // Before acceptance — free cancellation, job simply disappears
        await db.update(jobsTable).set({ status: "cancelled" }).where(eq(jobsTable.id, jobId));
      } else {
        // After acceptance — cancellation fee applies
        await db.update(jobsTable).set({
          status: "cancelled_by_customer",
          cancellationFee: CANCELLATION_FEE_AFTER_ACCEPTANCE.toString(),
        }).where(eq(jobsTable.id, jobId));

        // Notify driver they've been cancelled on and will receive compensation
        if (existing.driverId) {
          const [cancelledDriver] = await db.select({ pushToken: usersTable.pushToken })
            .from(usersTable).where(eq(usersTable.id, existing.driverId)).limit(1).catch(() => []);
          sendPushToUser(
            cancelledDriver?.pushToken,
            "Job cancelled by customer",
            `You'll receive ${CANCELLATION_FEE_AFTER_ACCEPTANCE} kr compensation for your time.`,
            { screen: "driver-job", jobId }
          ).catch(() => {});
        }
      }
    } else {
      // Driver cancels their accepted job — no fee to customer, but driver gets a strike
      await db.update(jobsTable).set({
        status: "cancelled",
        driverId: null,
      }).where(eq(jobsTable.id, jobId));

      await db.update(usersTable).set({
        cancellationsCount: sql`${usersTable.cancellationsCount} + 1`,
      }).where(eq(usersTable.id, req.userId!));

      // Notify customer their driver cancelled
      const [cancelledCustomer] = await db.select({ pushToken: usersTable.pushToken })
        .from(usersTable).where(eq(usersTable.id, existing.customerId)).limit(1).catch(() => []);
      sendPushToUser(
        cancelledCustomer?.pushToken,
        "Driver cancelled your job",
        "Don't worry — your job is back on the map and available for other drivers.",
        { screen: "customer-job", jobId }
      ).catch(() => {});
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
