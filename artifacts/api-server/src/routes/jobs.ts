import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobsTable, usersTable, ratingsTable, messagesTable, promoCodesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";
import { formatUser } from "./auth";
import { sendPushToUser, sendPush } from "../utils/push";
import { sendReceiptEmail } from "../utils/email";

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
    extraStops: job.extraStops || [],
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
    // Logistics
    floorNumber: job.floorNumber,
    hasElevator: job.hasElevator,
    helpersNeeded: job.helpersNeeded,
    estimatedWeightKg: job.estimatedWeightKg,
    // Promo
    promoCode: job.promoCode,
    discountAmount: job.discountAmount ? parseFloat(job.discountAmount) : null,
    createdAt: job.createdAt.toISOString(),
    acceptedAt: job.acceptedAt?.toISOString() || null,
    arrivedAt: job.arrivedAt?.toISOString() || null,
    startedAt: job.startedAt?.toISOString() || null,
    completedAt: job.completedAt?.toISOString() || null,
    disputedAt: job.disputedAt?.toISOString() || null,
    cancelledByDriverAt: job.cancelledByDriverAt?.toISOString() || null,
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
    jobType, pickupAddress, dropoffAddress, homeAddress, extraStops,
    itemDescription, preferredTime, distanceKm, priceTotal,
    driverPayout, platformFee, city, customerPhotos, customerPrice,
    floorNumber, hasElevator, helpersNeeded, estimatedWeightKg,
    promoCode,
  } = req.body;

  if (!jobType || !itemDescription || !preferredTime || priceTotal == null) {
    res.status(400).json({ error: "Missing required fields: jobType, itemDescription, preferredTime, priceTotal" });
    return;
  }
  // City is optional — fall back to a default so drivers can still see the job
  const resolvedCity: string = (city && city.trim()) ? city.trim() : "Sverige";

  const VALID_JOB_TYPES = [
    // New types (7 categories)
    "blocket_pickup", "facebook_pickup", "small_furniture",
    "office_items", "children_items", "electronics", "other_small",
    // Legacy types (kept for backward compatibility)
    "furniture_transport", "bulky_delivery", "junk_pickup",
  ];
  if (!VALID_JOB_TYPES.includes(jobType)) {
    res.status(400).json({ error: `Invalid jobType. Must be one of: ${VALID_JOB_TYPES.join(", ")}` });
    return;
  }

  const suggested = parseFloat(priceTotal);
  // New pricing range: 99–299 SEK; allow ±30% flex around suggested but clamp to 99–299
  const minAllowed = Math.max(99, Math.round(suggested * 0.70));
  const maxAllowed = Math.min(299, Math.round(suggested * 1.30));

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

  // Validate and apply promo code
  let discountAmount: number | null = null;
  let appliedPromoCode: string | null = null;
  if (promoCode && promoCode.trim()) {
    try {
      const [promo] = await db.select().from(promoCodesTable)
        .where(eq(promoCodesTable.code, promoCode.trim().toUpperCase()))
        .limit(1);
      if (promo && promo.active &&
        (!promo.expiresAt || promo.expiresAt > new Date()) &&
        (!promo.maxUses || promo.usedCount < promo.maxUses)) {
        discountAmount = parseFloat(promo.discountAmount);
        appliedPromoCode = promo.code;
        await db.update(promoCodesTable).set({
          usedCount: sql`${promoCodesTable.usedCount} + 1`,
        }).where(eq(promoCodesTable.id, promo.id));
      }
    } catch {}
  }

  try {
    const [job] = await db.insert(jobsTable).values({
      customerId: req.userId!,
      jobType,
      status: "pending",
      pickupAddress: pickupAddress || null,
      dropoffAddress: dropoffAddress || null,
      homeAddress: homeAddress || null,
      extraStops: Array.isArray(extraStops) && extraStops.length > 0 ? extraStops : null,
      itemDescription: itemDescription.trim(),
      preferredTime,
      distanceKm: distanceKm?.toString() || null,
      priceTotal: priceTotal.toString(),
      driverPayout: (driverPayout ?? Math.round(priceTotal * 0.75)).toString(),
      platformFee: (platformFee ?? Math.round(priceTotal * 0.25)).toString(),
      customerPrice: resolvedCustomerPrice != null ? resolvedCustomerPrice.toString() : null,
      paymentStatus: "unpaid",
      city: resolvedCity,
      photosCustomer: Array.isArray(customerPhotos) ? customerPhotos : [],
      floorNumber: floorNumber != null ? parseInt(floorNumber) : null,
      hasElevator: hasElevator != null ? Boolean(hasElevator) : null,
      helpersNeeded: helpersNeeded != null ? parseInt(helpersNeeded) : null,
      estimatedWeightKg: estimatedWeightKg != null ? parseInt(estimatedWeightKg) : null,
      promoCode: appliedPromoCode,
      discountAmount: discountAmount != null ? discountAmount.toString() : null,
    }).returning();

    const enriched = await getJobWithUsers(job.id);
    res.status(201).json(enriched);

    // Notify all available drivers in the same city (fire and forget)
    const typeLabel = jobType.replace(/_/g, " ");
    db.select({ pushToken: usersTable.pushToken }).from(usersTable)
      .where(and(eq(usersTable.city, resolvedCity), eq(usersTable.isAvailable, true)))
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

router.post("/:id/start", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }
    if (existing.driverId !== req.userId) {
      res.status(403).json({ error: "Only the assigned driver can start transport" });
      return;
    }
    if (existing.status !== "arrived") {
      res.status(400).json({ error: "Job must be in arrived state to start transport" });
      return;
    }

    await db.update(jobsTable).set({
      status: "in_progress",
      startedAt: new Date(),
    }).where(eq(jobsTable.id, jobId));

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);

    const [startCustomer] = await db.select({ pushToken: usersTable.pushToken })
      .from(usersTable).where(eq(usersTable.id, existing.customerId)).limit(1).catch(() => []);
    sendPushToUser(
      startCustomer?.pushToken,
      "Din förare är på väg! 🚚",
      "Din förare är på väg! Dina saker är nu på väg till leveransadressen.",
      { screen: "customer-job", jobId }
    ).catch(() => {});
  } catch (err) {
    req.log?.error(err, "Start transport error");
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

    if (enriched?.customer?.email) {
      const finalPrice = enriched.customerPrice ?? enriched.priceTotal;
      sendReceiptEmail({
        jobId,
        jobType: enriched.jobType,
        completedAt: enriched.completedAt ?? new Date().toISOString(),
        pickupAddress: enriched.pickupAddress,
        dropoffAddress: enriched.dropoffAddress,
        homeAddress: enriched.homeAddress,
        priceTotal: finalPrice,
        driverName: enriched.driver?.fullName ?? "Your driver",
        driverRating: enriched.driver?.rating,
        customerName: enriched.customer.fullName,
        customerEmail: enriched.customer.email,
      }).catch((err) => req.log?.error(err, "Receipt email failed"));
    }
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

// Reschedule a job (customer only, ≥1 hour in the future)
router.post("/:id/reschedule", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  const { preferredTime } = req.body;
  if (!preferredTime) { res.status(400).json({ error: "preferredTime is required" }); return; }

  const newDate = new Date(preferredTime);
  if (isNaN(newDate.getTime())) { res.status(400).json({ error: "Invalid date format" }); return; }

  // Enforce at least 1 hour from now
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  if (newDate < oneHourFromNow) {
    res.status(400).json({ error: "New time must be at least 1 hour in the future" });
    return;
  }

  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }
    if (existing.customerId !== req.userId) { res.status(403).json({ error: "Only the customer can reschedule" }); return; }
    if (!["pending", "accepted"].includes(existing.status)) {
      res.status(400).json({ error: "Job can only be rescheduled when pending or accepted" });
      return;
    }

    await db.update(jobsTable).set({ preferredTime: newDate.toISOString() }).where(eq(jobsTable.id, jobId));

    // Notify driver if assigned
    if (existing.driverId) {
      const [driver] = await db.select({ pushToken: usersTable.pushToken })
        .from(usersTable).where(eq(usersTable.id, existing.driverId)).limit(1).catch(() => []);
      sendPushToUser(
        driver?.pushToken,
        "Job rescheduled",
        `The customer has changed the job time to ${newDate.toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })}.`,
        { screen: "driver-job", jobId }
      ).catch(() => {});
    }

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Reschedule error");
    res.status(500).json({ error: "Internal server error" });
  }
});

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
    if (["completed", "cancelled", "cancelled_by_customer", "cancelled_by_driver"].includes(existing.status)) {
      res.status(400).json({ error: "Job cannot be cancelled in its current state" });
      return;
    }

    const isCustomer = existing.customerId === req.userId;
    const driverAssigned = !!existing.driverId && existing.status !== "pending";

    if (isCustomer) {
      if (!driverAssigned) {
        await db.update(jobsTable).set({ status: "cancelled" }).where(eq(jobsTable.id, jobId));
      } else {
        await db.update(jobsTable).set({
          status: "cancelled_by_customer",
          cancellationFee: CANCELLATION_FEE_AFTER_ACCEPTANCE.toString(),
        }).where(eq(jobsTable.id, jobId));

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
      // Driver cancels — job goes back to pending pool, driver gets a cancellation strike
      await db.update(jobsTable).set({
        status: "cancelled_by_driver",
        driverId: null,
        cancelledByDriverAt: new Date(),
      }).where(eq(jobsTable.id, jobId));

      await db.update(usersTable).set({
        cancellationsCount: sql`${usersTable.cancellationsCount} + 1`,
      }).where(eq(usersTable.id, req.userId!));

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

// In-app chat messages for a job
router.get("/:id/messages", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    if (job.customerId !== req.userId && job.driverId !== req.userId) {
      res.status(403).json({ error: "You are not part of this job" });
      return;
    }

    const msgs = await db.select({
      id: messagesTable.id,
      jobId: messagesTable.jobId,
      senderId: messagesTable.senderId,
      text: messagesTable.text,
      createdAt: messagesTable.createdAt,
      senderName: usersTable.fullName,
    })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.jobId, jobId))
      .orderBy(messagesTable.createdAt);

    res.json(msgs.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log?.error(err, "Get messages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/messages", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  const { text } = req.body;
  if (!text || !text.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  try {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    if (job.customerId !== req.userId && job.driverId !== req.userId) {
      res.status(403).json({ error: "You are not part of this job" });
      return;
    }

    const [msg] = await db.insert(messagesTable).values({
      jobId,
      senderId: req.userId!,
      text: text.trim(),
    }).returning();

    const [sender] = await db.select({ fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    res.status(201).json({
      ...msg,
      createdAt: msg.createdAt.toISOString(),
      senderName: sender?.fullName ?? "Unknown",
    });

    // Push notification to the other party
    const otherUserId = job.customerId === req.userId ? job.driverId : job.customerId;
    if (otherUserId) {
      const [other] = await db.select({ pushToken: usersTable.pushToken })
        .from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1).catch(() => []);
      sendPushToUser(
        other?.pushToken,
        `Message from ${sender?.fullName ?? "someone"}`,
        text.trim().slice(0, 100),
        { screen: "chat", jobId }
      ).catch(() => {});
    }
  } catch (err) {
    req.log?.error(err, "Send message error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { formatJob };
export default router;
