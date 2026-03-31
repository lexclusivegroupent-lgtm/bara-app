import { pgTable, serial, integer, text, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => usersTable.id),
  driverId: integer("driver_id").references(() => usersTable.id),
  jobType: text("job_type").notNull().$type<"furniture_transport" | "bulky_delivery" | "junk_pickup">(),
  status: text("status").notNull().default("pending").$type<"pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled" | "disputed">(),
  pickupAddress: text("pickup_address"),
  dropoffAddress: text("dropoff_address"),
  homeAddress: text("home_address"),
  itemDescription: text("item_description").notNull(),
  preferredTime: text("preferred_time").notNull(),
  distanceKm: numeric("distance_km", { precision: 8, scale: 2 }),
  priceTotal: numeric("price_total", { precision: 10, scale: 2 }).notNull(),
  driverPayout: numeric("driver_payout", { precision: 10, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  customerPrice: numeric("customer_price", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").notNull().default("unpaid").$type<"unpaid" | "paid">(),
  city: text("city").notNull(),
  photosCustomer: text("photos_customer").array(),
  photosPickup: text("photos_pickup").array(),
  photosDropoff: text("photos_dropoff").array(),
  disputed: boolean("disputed").notNull().default(false),
  disputeReason: text("dispute_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  arrivedAt: timestamp("arrived_at"),
  completedAt: timestamp("completed_at"),
  disputedAt: timestamp("disputed_at"),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
