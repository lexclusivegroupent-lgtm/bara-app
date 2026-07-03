/**
 * B2B lead-gen pivot feature flag.
 *
 * When true (default), Bära operates as a lead-generation and booking platform:
 *  - customers submit requests
 *  - admin reviews and assigns each request to a partner business
 *  - the assigned partner accepts, declines, or marks the lead as contacted
 *
 * Marketplace behaviour (open pending-job feed, first-provider-accepts,
 * broadcast push to all available providers) is disabled.
 *
 * Set LEAD_GEN_MODE=false in the environment to restore the legacy
 * marketplace behaviour — no code changes needed.
 */
export const LEAD_GEN_MODE = process.env.LEAD_GEN_MODE !== "false";

/** Lead categories offered to customers in lead-gen mode. */
export const LEAD_CATEGORIES = [
  "furniture_transport", // furniture pickup/delivery
  "bulky_delivery",      // bulky item transport
  "junk_pickup",         // junk removal
  "secondhand_delivery", // second-hand item delivery (Blocket, FB Marketplace, etc.)
] as const;

/** Statuses that make up the lead lifecycle (in funnel order). */
export const LEAD_STATUSES = [
  "pending",    // submitted by customer, waiting for admin review
  "assigned",   // admin routed it to a partner
  "contacted",  // partner reached out to the customer
  "accepted",   // partner confirmed the booking
  "completed",
  "cancelled",
  "declined",   // partner turned it down — back in admin's queue
] as const;
