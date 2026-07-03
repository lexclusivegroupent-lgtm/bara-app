import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobsTable, usersTable, ratingsTable, messagesTable, promoCodesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";
import { formatUser } from "./auth";
import { sendPushToUser, sendPush } from "../utils/push";
import { sendReceiptEmail } from "../utils/email";
import { LEAD_GEN_MODE } from "../lib/leadGen";
import { getDistanceKm } from "./distance";

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
    weightPreset: job.weightPreset,
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
    cancelledByDriverId: job.cancelledByDriverId,
    disputePhotos: job.disputePhotos || [],
    disputeResolution: job.disputeResolution,
    surchargeStairs: job.surchargeStairs ?? 0,
    surchargeDistance: job.surchargeDistance ?? 0,
    surchargeTotalSek: job.surchargeTotalSek ?? 0,
    surchargeApprovedAt: job.surchargeApprovedAt?.toISOString() || null,
    tipAmount: job.tipAmount ?? 0,
    // Lead-gen fields
    assignedAt: job.assignedAt?.toISOString() || null,
    contactedAt: job.contactedAt?.toISOString() || null,
    declinedAt: job.declinedAt?.toISOString() || null,
    declineReason: job.declineReason,
    contactName: job.contactName,
    contactPhone: job.contactPhone,
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

    // Lead-gen mode: no open marketplace feed. Users only see requests they
    // submitted (customer) or requests assigned to them (partner). Admin
    // routes requests via /api/admin — providers cannot browse open jobs.
    if (LEAD_GEN_MODE) {
      conditions.push(
        sql`(${jobsTable.customerId} = ${req.userId!} OR ${jobsTable.driverId} = ${req.userId!})`
      );
    }

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
  const jobId = parseInt(req.params.id as string);
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
  // NOTE: priceTotal, distanceKm, driverPayout, platformFee and customerPrice
  // from the request body are intentionally IGNORED — price and distance are
  // computed server-side (see below) to prevent client price manipulation.
  const {
    jobType, pickupAddress, dropoffAddress, homeAddress, extraStops,
    itemDescription, preferredTime, city, customerPhotos,
    floorNumber, hasElevator, helpersNeeded, estimatedWeightKg,
    weightPreset, involvesHazardous, promoCode,
    contactName, contactPhone,
  } = req.body;

  if (!jobType || !itemDescription || !preferredTime) {
    res.status(400).json({ error: "Missing required fields: jobType, itemDescription, preferredTime" });
    return;
  }

  // Weight presets: mandatory in marketplace mode (gig carriers with regular
  // cars, 25kg cap). In lead-gen mode partners are professional businesses
  // with proper vehicles, so the preset is optional informational data and
  // there is no cap — bulky items ARE the business.
  const VALID_WEIGHT_PRESETS = ["0_10kg", "10_20kg", "20_25kg"];
  if (!LEAD_GEN_MODE) {
    if (!weightPreset) {
      res.status(400).json({ error: "weightPreset is required. Must be one of: 0_10kg, 10_20kg, 20_25kg" });
      return;
    }
    if (!VALID_WEIGHT_PRESETS.includes(weightPreset)) {
      res.status(400).json({ error: "Bära is for small, light items only (max 25kg). For heavier items, please use a moving service." });
      return;
    }
  }
  // City is optional — fall back to a default so drivers can still see the job
  const resolvedCity: string = (city && city.trim()) ? city.trim() : "Sverige";

  const VALID_JOB_TYPES = [
    // Lead-gen categories: furniture pickup/delivery, bulky item transport,
    // junk removal, second-hand item delivery
    "furniture_transport", "bulky_delivery", "junk_pickup", "secondhand_delivery",
    // Legacy marketplace types (kept so old clients keep working)
    "blocket_pickup", "facebook_pickup", "small_furniture",
    "office_items", "children_items", "electronics", "other_small",
  ];
  if (!VALID_JOB_TYPES.includes(jobType)) {
    res.status(400).json({ error: `Invalid jobType. Must be one of: ${VALID_JOB_TYPES.join(", ")}` });
    return;
  }

  // other_small: block hazardous/waste content via explicit flag and keyword scan
  if (jobType === "other_small") {
    if (involvesHazardous === true) {
      res.status(400).json({
        error: "Bära cannot transport household waste or hazardous materials. Please contact your local council for waste disposal.",
      });
      return;
    }
    const FORBIDDEN_PATTERNS = [
      /\b(household waste|garbage bag|trash bag|rubbish|construction debris|building rubble|demolition waste)\b/i,
      /\b(hazardous material|hazardous waste|toxic|flammable liquid|explosive|asbestos)\b/i,
      /\b(chemical[s]?|acid|solvent|paint thinner|pesticide)\b/i,
      /\b(hushållsavfall|avfallssäck|avfall|byggavfall|farligt avfall|rivningsrester)\b/i,
      /\b(kemikali[e]?[r]?|giftig[t]?|brandfarli[g]?|explosiv[t]?|asbest)\b/i,
    ];
    const desc = itemDescription as string;
    if (FORBIDDEN_PATTERNS.some((p) => p.test(desc))) {
      res.status(400).json({
        error: "This job description contains prohibited content for 'Other small items'. Bära does not transport waste, hazardous materials, or construction debris.",
      });
      return;
    }
  }

  // ── Server-side price calculation ──────────────────────────────────────────
  // Distance and price are computed here from the addresses. Client-sent
  // values are never trusted; on geocoding failure we refuse the request
  // rather than fall back to anything client-supplied.
  const BASE_PRICE = 99;
  const PRICE_PER_KM = 10;
  const MAX_PRICE = 299;
  const MIN_PRICE = 99;

  let computedDistance = 0;
  if (pickupAddress?.trim() && dropoffAddress?.trim()) {
    const km = await getDistanceKm(pickupAddress.trim(), dropoffAddress.trim());
    if (km == null) {
      res.status(503).json({ error: "Could not calculate delivery price. Please try again." });
      return;
    }
    computedDistance = km;
  }
  // Single-address jobs (e.g. junk pickup at home) have no transport leg:
  // distance 0 → base price.

  const computedPrice = Math.min(
    MAX_PRICE,
    Math.max(MIN_PRICE, Math.round(BASE_PRICE + computedDistance * PRICE_PER_KM))
  );
  const computedDriverPayout = Math.round(computedPrice * 0.75);
  const computedPlatformFee = computedPrice - computedDriverPayout;

  // Validate and apply promo code.
  // Single atomic UPDATE...RETURNING: the validity checks and the usage
  // increment happen in one statement, so two simultaneous requests cannot
  // both redeem the last use of a limited promo (TOCTOU race).
  let discountAmount: number | null = null;
  let appliedPromoCode: string | null = null;
  if (promoCode && promoCode.trim()) {
    try {
      const code = promoCode.trim().toUpperCase();
      const [promo] = await db
        .update(promoCodesTable)
        .set({ usedCount: sql`${promoCodesTable.usedCount} + 1` })
        .where(
          and(
            eq(promoCodesTable.code, code),
            eq(promoCodesTable.active, true),
            sql`(${promoCodesTable.expiresAt} IS NULL OR ${promoCodesTable.expiresAt} > now())`,
            sql`(${promoCodesTable.maxUses} IS NULL OR ${promoCodesTable.usedCount} < ${promoCodesTable.maxUses})`
          )
        )
        .returning();

      if (promo) {
        discountAmount = parseFloat(promo.discountAmount);
        appliedPromoCode = promo.code;
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
      distanceKm: computedDistance > 0 ? computedDistance.toString() : null,
      priceTotal: computedPrice.toString(),
      driverPayout: computedDriverPayout.toString(),
      platformFee: computedPlatformFee.toString(),
      customerPrice: null,
      paymentStatus: "unpaid",
      city: resolvedCity,
      photosCustomer: Array.isArray(customerPhotos) ? customerPhotos : [],
      floorNumber: floorNumber != null ? parseInt(floorNumber) : null,
      hasElevator: hasElevator != null ? Boolean(hasElevator) : null,
      helpersNeeded: helpersNeeded != null ? parseInt(helpersNeeded) : null,
      estimatedWeightKg: estimatedWeightKg != null ? parseInt(estimatedWeightKg) : null,
      weightPreset: (weightPreset as "0_10kg" | "10_20kg" | "20_25kg") || null,
      promoCode: appliedPromoCode,
      discountAmount: discountAmount != null ? discountAmount.toString() : null,
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
    }).returning();

    const enriched = await getJobWithUsers(job.id);
    res.status(201).json(enriched);

    // Marketplace mode only: broadcast to all available drivers in the city.
    // In lead-gen mode requests wait in the admin queue for manual routing.
    if (!LEAD_GEN_MODE) {
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
    }
  } catch (err) {
    req.log?.error(err, "Create job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Partner responds to an assigned lead: accept, decline, or mark as contacted.
// Declining returns the request to the admin queue for re-routing.
router.post("/:id/respond", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  const { action, reason } = req.body as { action?: string; reason?: string };
  if (!action || !["accept", "decline", "contacted"].includes(action)) {
    res.status(400).json({ error: "action must be one of: accept, decline, contacted" });
    return;
  }

  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Request not found" }); return; }
    if (existing.driverId !== req.userId) {
      res.status(403).json({ error: "This request is not assigned to you" });
      return;
    }
    const RESPONDABLE = ["assigned", "contacted", "accepted"];
    if (!RESPONDABLE.includes(existing.status)) {
      res.status(400).json({ error: `Request cannot be updated from status '${existing.status}'` });
      return;
    }

    const now = new Date();
    if (action === "accept") {
      await db.update(jobsTable)
        .set({ status: "accepted", acceptedAt: now })
        .where(eq(jobsTable.id, jobId));
    } else if (action === "contacted") {
      await db.update(jobsTable)
        .set({ status: "contacted", contactedAt: existing.contactedAt ?? now })
        .where(eq(jobsTable.id, jobId));
    } else {
      // decline: unassign and hand back to the admin queue
      await db.update(jobsTable)
        .set({ status: "declined", driverId: null, declinedAt: now, declineReason: reason?.trim() || null })
        .where(eq(jobsTable.id, jobId));
    }

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);

    // Let the customer know their request is moving (fire and forget)
    if (action !== "decline") {
      const [customer] = await db.select({ pushToken: usersTable.pushToken })
        .from(usersTable).where(eq(usersTable.id, existing.customerId)).limit(1).catch(() => []);
      sendPushToUser(
        customer?.pushToken,
        action === "accept" ? "Din förfrågan är bekräftad ✅" : "En partner kontaktar dig snart 📞",
        action === "accept"
          ? "En lokal partner har bekräftat din bokning."
          : "Din förfrågan har tagits emot av en lokal partner.",
        { screen: "customer-job", jobId }
      ).catch(() => {});
    }
  } catch (err) {
    req.log?.error(err, "Partner respond error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/accept", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    // Lead-gen mode: open first-accept is disabled. Only the partner the
    // admin assigned can accept, and gig-marketplace gates (onboarding
    // checklist, F-skatt threshold, cancellation lockout, surcharges) do
    // not apply to partner businesses.
    if (LEAD_GEN_MODE) {
      if (existing.driverId !== req.userId) {
        res.status(403).json({
          error: "Requests are assigned by Bära. This request is not assigned to you.",
          code: "NOT_ASSIGNED",
        });
        return;
      }
      if (!["assigned", "contacted"].includes(existing.status)) {
        res.status(400).json({ error: `Request cannot be accepted from status '${existing.status}'` });
        return;
      }
      await db.update(jobsTable)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(jobsTable.id, jobId));

      const enriched = await getJobWithUsers(jobId);
      res.json(enriched);

      const [customer] = await db.select({ pushToken: usersTable.pushToken })
        .from(usersTable).where(eq(usersTable.id, existing.customerId)).limit(1).catch(() => []);
      sendPushToUser(
        customer?.pushToken,
        "Din förfrågan är bekräftad ✅",
        "En lokal partner har bekräftat din bokning.",
        { screen: "customer-job", jobId }
      ).catch(() => {});
      return;
    }

    if (existing.customerId === req.userId) {
      res.status(400).json({ error: "You cannot accept a job you posted yourself" });
      return;
    }

    // F-tax requirement: once cumulative earnings exceed 1,000 SEK, F-skatt is required
    const [driverRecord] = await db.select({
      role: usersTable.role,
      annualEarnings: usersTable.annualEarnings,
      ftaxRegistered: usersTable.ftaxRegistered,
      driverOnboardingComplete: usersTable.driverOnboardingComplete,
      dac7Required: usersTable.dac7Required,
      dac7Consented: usersTable.dac7Consented,
    }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    // Role escalation guard: customer accounts cannot accept jobs — driver
    // capability is only granted through the onboarding endpoint.
    if (driverRecord?.role === "customer") {
      res.status(403).json({ error: "Complete driver onboarding to accept jobs" });
      return;
    }

    // DAC7 gate: carriers past the reporting threshold must complete tax
    // verification (consent + KYC) before accepting more jobs.
    if (driverRecord?.dac7Required && !driverRecord?.dac7Consented) {
      res.status(403).json({
        error: "DAC7_REQUIRED",
        message: "Complete tax verification in your profile to continue accepting jobs.",
      });
      return;
    }

    if (!driverRecord?.driverOnboardingComplete) {
      res.status(400).json({
        error: "Please complete your driver onboarding checklist before accepting jobs.",
        code: "ONBOARDING_INCOMPLETE",
      });
      return;
    }

    const projectedEarnings = (driverRecord?.annualEarnings ?? 0) + parseFloat(existing.driverPayout);
    if (projectedEarnings > 1000 && !driverRecord?.ftaxRegistered) {
      res.status(400).json({
        error: "F-tax registration (F-skatt) is required once your earnings exceed 1,000 SEK. Please add your F-skatt number in your driver profile.",
        code: "FTAX_REQUIRED",
      });
      return;
    }

    // Driver lockout: block if 3+ cancellations in last 30 days
    const [{ recentCancels }] = await db.select({
      recentCancels: sql<number>`count(*) filter (where ${jobsTable.cancelledByDriverId} = ${req.userId} and ${jobsTable.cancelledByDriverAt} > now() - interval '30 days')`,
    }).from(jobsTable);
    if (Number(recentCancels) >= 3) {
      res.status(400).json({
        error: "You have cancelled 3 or more jobs in the past 30 days. Please wait before accepting new jobs.",
        code: "DRIVER_LOCKED_OUT",
      });
      return;
    }

    const { surchargeStairs = 0, surchargeDistance = 0 } = req.body;
    const stairsFee = surchargeStairs ? 50 : 0;
    const distanceFee = surchargeDistance ? 25 : 0;
    const surchargeTotalSek = stairsFee + distanceFee;
    const hasSurcharge = surchargeTotalSek > 0;

    // Atomic accept: status = 'pending' in the WHERE clause means only ONE of
    // two simultaneous accepts can succeed — the loser matches zero rows.
    const [updated] = await db.update(jobsTable).set({
      status: hasSurcharge ? "surcharge_requested" : "accepted",
      driverId: req.userId!,
      acceptedAt: hasSurcharge ? null : new Date(),
      surchargeStairs: stairsFee,
      surchargeDistance: distanceFee,
      surchargeTotalSek,
    }).where(
      and(
        eq(jobsTable.id, jobId),
        eq(jobsTable.status, "pending")
      )
    ).returning({ id: jobsTable.id });

    if (!updated) {
      res.status(409).json({ error: "This job has already been accepted by another carrier." });
      return;
    }

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);

    const [customer] = await db.select({ pushToken: usersTable.pushToken, fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, existing.customerId)).limit(1).catch(() => []);
    const [driver] = await db.select({ fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1).catch(() => []);

    if (hasSurcharge) {
      sendPushToUser(
        customer?.pushToken,
        "Tilläggsavgift begärd 💬",
        `${driver?.fullName ?? "Din bärare"} vill lägga till en avgift på ${surchargeTotalSek} kr. Godkänn i appen.`,
        { screen: "customer-job", jobId }
      ).catch(() => {});
    } else {
      sendPushToUser(
        customer?.pushToken,
        "Bärare på väg! 🚛",
        `${driver?.fullName ?? "Din bärare"} har accepterat ditt jobb och är på väg.`,
        { screen: "customer-job", jobId }
      ).catch(() => {});
    }
  } catch (err) {
    req.log?.error(err, "Accept job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Customer approves carrier surcharge → job moves to accepted
router.post("/:id/approve-surcharge", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }
    if (existing.customerId !== req.userId) { res.status(403).json({ error: "Only the customer can approve a surcharge" }); return; }
    if (existing.status !== "surcharge_requested") { res.status(400).json({ error: "No surcharge pending" }); return; }

    await db.update(jobsTable).set({ status: "accepted", acceptedAt: new Date(), surchargeApprovedAt: new Date() }).where(eq(jobsTable.id, jobId));
    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);

    if (existing.driverId) {
      const [driver] = await db.select({ pushToken: usersTable.pushToken }).from(usersTable).where(eq(usersTable.id, existing.driverId)).limit(1).catch(() => []);
      sendPushToUser(driver?.pushToken, "Tilläggsavgift godkänd ✅", "Kunden har godkänt tilläggsavgiften. Jobbet är bekräftat.", { screen: "driver-job", jobId }).catch(() => {});
    }
  } catch (err) {
    req.log?.error(err, "Approve surcharge error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Customer declines surcharge → driver removed, job back to pending
router.post("/:id/decline-surcharge", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }
    if (existing.customerId !== req.userId) { res.status(403).json({ error: "Only the customer can decline a surcharge" }); return; }
    if (existing.status !== "surcharge_requested") { res.status(400).json({ error: "No surcharge pending" }); return; }

    await db.update(jobsTable).set({ status: "pending", driverId: null, surchargeStairs: 0, surchargeDistance: 0, surchargeTotalSek: 0 }).where(eq(jobsTable.id, jobId));
    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Decline surcharge error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/arrived", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
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
  const jobId = parseInt(req.params.id as string);
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
  const jobId = parseInt(req.params.id as string);
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
  const jobId = parseInt(req.params.id as string);
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

    const payout = Math.round(parseFloat(existing.driverPayout));

    // DAC7 threshold enforcement (EU 2021/514): carriers crossing 30 completed
    // jobs OR 22,000 SEK annual gross must complete tax verification before
    // accepting further jobs. Warn at ~80% of either threshold.
    const [driverStats] = await db.select({
      annualEarnings: usersTable.annualEarnings,
      totalJobs: usersTable.totalJobs,
      dac7Consented: usersTable.dac7Consented,
      pushToken: usersTable.pushToken,
    }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    const newEarnings = (driverStats?.annualEarnings ?? 0) + payout;
    const newJobCount = (driverStats?.totalJobs ?? 0) + 1;

    const driverUpdates: Record<string, unknown> = {
      totalJobs: sql`${usersTable.totalJobs} + 1`,
      annualEarnings: sql`${usersTable.annualEarnings} + ${payout}`,
    };

    if ((newEarnings >= 22000 || newJobCount >= 30) && !driverStats?.dac7Consented) {
      driverUpdates.dac7Required = true;
      sendPushToUser(
        driverStats?.pushToken,
        "Action required",
        "Complete your tax verification to continue accepting jobs.",
        { screen: "tax-info" }
      ).catch(() => {});
    } else if ((newEarnings >= 18000 || newJobCount >= 25) && !driverStats?.dac7Consented) {
      sendPushToUser(
        driverStats?.pushToken,
        "Heads up",
        "You're approaching the annual reporting threshold. Complete tax verification soon.",
        { screen: "tax-info" }
      ).catch(() => {});
    }

    await db.update(usersTable).set(driverUpdates).where(eq(usersTable.id, req.userId!));

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
  const jobId = parseInt(req.params.id as string);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  const { reason, photos } = req.body;
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
      disputePhotos: Array.isArray(photos) ? photos : [],
    }).where(eq(jobsTable.id, jobId));

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Dispute job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/rate", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  const { score, comment, ratedUserId, tipAmount } = req.body;

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

    const tipSek = (tipAmount && Number.isInteger(tipAmount) && tipAmount > 0 && existing.customerId === req.userId) ? tipAmount : 0;
    await db.update(jobsTable).set({ rating: score.toString(), ...(tipSek > 0 ? { tipAmount: tipSek } : {}) }).where(eq(jobsTable.id, jobId));

    const enriched = await getJobWithUsers(jobId);
    res.json(enriched);
  } catch (err) {
    req.log?.error(err, "Rate job error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reschedule a job (customer only, ≥1 hour in the future)
router.post("/:id/reschedule", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
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
// Maximum job value — keeps platform clearly in small/informal service territory
const MAX_JOB_VALUE_SEK = 299;

router.post("/:id/cancel", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
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
        cancelledByDriverId: req.userId!,
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
  const jobId = parseInt(req.params.id as string);
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
  const jobId = parseInt(req.params.id as string);
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

// Serve receipt HTML for a completed job (used by "Open in browser / print" button)
router.get("/:id/receipt", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const job = await getJobWithUsers(jobId);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    if (job.customerId !== req.userId && job.driverId !== req.userId) {
      res.status(403).json({ error: "Access denied" }); return;
    }
    if (job.status !== "completed") {
      res.status(400).json({ error: "Receipt is only available for completed jobs" }); return;
    }
    if (!job.customer?.email) {
      res.status(400).json({ error: "Customer email not found" }); return;
    }
    const { buildReceiptHtml } = await import("../utils/email");
    const finalPrice = job.customerPrice ?? job.priceTotal;
    const html = buildReceiptHtml({
      jobId,
      jobType: job.jobType,
      completedAt: job.completedAt ?? new Date().toISOString(),
      pickupAddress: job.pickupAddress,
      dropoffAddress: job.dropoffAddress,
      homeAddress: job.homeAddress,
      priceTotal: finalPrice,
      driverName: job.driver?.fullName ?? "Your driver",
      driverRating: job.driver?.rating,
      customerName: job.customer.fullName,
      customerEmail: job.customer.email,
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    req.log?.error(err, "Get receipt error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Re-send receipt email on demand
router.post("/:id/resend-receipt", authenticate, async (req: AuthenticatedRequest, res) => {
  const jobId = parseInt(req.params.id as string);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  try {
    const job = await getJobWithUsers(jobId);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    if (job.customerId !== req.userId) {
      res.status(403).json({ error: "Only the customer can re-send their receipt" }); return;
    }
    if (job.status !== "completed") {
      res.status(400).json({ error: "Receipt is only available for completed jobs" }); return;
    }
    if (!job.customer?.email) {
      res.status(400).json({ error: "Customer email not found" }); return;
    }
    const finalPrice = job.customerPrice ?? job.priceTotal;
    await sendReceiptEmail({
      jobId,
      jobType: job.jobType,
      completedAt: job.completedAt ?? new Date().toISOString(),
      pickupAddress: job.pickupAddress,
      dropoffAddress: job.dropoffAddress,
      homeAddress: job.homeAddress,
      priceTotal: finalPrice,
      driverName: job.driver?.fullName ?? "Your driver",
      driverRating: job.driver?.rating,
      customerName: job.customer.fullName,
      customerEmail: job.customer.email,
    });
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err, "Resend receipt error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { formatJob };
export default router;
