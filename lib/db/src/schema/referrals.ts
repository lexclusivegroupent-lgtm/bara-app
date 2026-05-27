import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";

// ─── Referral System ────────────────────────────────────────────────────────

/**
 * Referral codes for customers and carriers
 * Customer referral: give 50 SEK, get 50 SEK on first completed job
 * Carrier referral: 100 SEK bonus after referred carrier completes 5 jobs
 */
export const referralCodesTable = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().$type<"customer" | "carrier">(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  bonusAmount: numeric("bonus_amount", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReferralCode = typeof referralCodesTable.$inferSelect;

/**
 * Track referral usage and redemption
 */
export const referralUsageTable = pgTable("referral_usage", {
  id: serial("id").primaryKey(),
  referralCodeId: integer("referral_code_id")
    .notNull()
    .references(() => referralCodesTable.id, { onDelete: "cascade" }),
  referredUserId: integer("referred_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  claimedBy: integer("claimed_by")
    .notNull()
    .references(() => referralCodesTable.created_by, { onDelete: "cascade" }),
  jobsCompletedForCarrier: integer("jobs_completed_for_carrier").notNull().default(0),
  bonusClaimed: boolean("bonus_claimed").notNull().default(false),
  bonusClaimedAt: timestamp("bonus_claimed_at"),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReferralUsage = typeof referralUsageTable.$inferSelect;

/**
 * Track Blocket/Facebook Marketplace fast-flow integration
 * Stores saved addresses for quick job creation
 */
export const fastFlowAddressesTable = pgTable("fast_flow_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // "Home", "Work", or custom
  address: text("address").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  source: text("source").$type<"blocket" | "facebook" | "manual">().default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FastFlowAddress = typeof fastFlowAddressesTable.$inferSelect;
