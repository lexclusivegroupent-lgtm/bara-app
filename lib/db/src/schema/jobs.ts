import { pgTable, serial, integer, text, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => usersTable.id),
  driverId: integer("driver_id").references(() => usersTable.id),
  jobType: text("job_type").notNull().$type<"furniture_transport" | "bulky_delivery" | "junk_pickup">(),
  status: text("status").notNull().default("pending").$type<"pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled" | "cancelled_by_customer" | "cancelled_by_driver" | "disputed">(),
  pickupAddress: text("pickup_address"),
  dropoffAddress: text("dropoff_address"),
  homeAddress: text("home_address"),
  extraStops: text("extra_stops").array(),
  itemDescription: text("item_description").notNull(),
  preferredTime: text("preferred_time").notNull(),
  distanceKm: numeric("distance_km", { precision: 8, scale: 2 }),
  priceTotal: numeric("price_total", { precision: 10, scale: 2 }).notNull(),
  driverPayout: numeric("driver_payout", { precision: 10, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  customerPrice: numeric("customer_price", { precision: 10, scale: 2 }),
  cancellationFee: numeric("cancellation_fee", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").notNull().default("unpaid").$type<"unpaid" | "paid">(),
  city: text("city").notNull(),
  photosCustomer: text("photos_customer").array(),
  photosPickup: text("photos_pickup").array(),
  photosDropoff: text("photos_dropoff").array(),
  disputed: boolean("disputed").notNull().default(false),
  disputeReason: text("dispute_reason"),
  disputeResolvedNote: text("dispute_resolved_note"),
  disputeResolvedAt: timestamp("dispute_resolved_at"),
  // Logistics details
  floorNumber: integer("floor_number"),
  hasElevator: boolean("has_elevator"),
  helpersNeeded: integer("helpers_needed"),
  estimatedWeightKg: integer("estimated_weight_kg"),
  // Promo codes
  promoCode: text("promo_code"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  arrivedAt: timestamp("arrived_at"),
  completedAt: timestamp("completed_at"),
  disputedAt: timestamp("disputed_at"),
  cancelledByDriverAt: timestamp("cancelled_by_driver_at"),
  startedAt: timestamp("started_at"),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messagesTable.$inferSelect;

export const savedAddressesTable = pgTable("saved_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  label: text("label").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SavedAddress = typeof savedAddressesTable.$inferSelect;

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PromoCode = typeof promoCodesTable.$inferSelect;
