import {
  pgTable,
  serial,
  integer,
  numeric,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";

// ─── DAC7 Reports ───────────────────────────────────────────────────────────

/**
 * Annual DAC7 reporting for carriers exceeding thresholds:
 * 30+ completed jobs OR 22,000+ SEK gross earnings in a calendar year
 */
export const dac7ReportsTable = pgTable("dac7_reports", {
  id: serial("id").primaryKey(),
  carrierId: integer("carrier_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  completedJobsCount: integer("completed_jobs_count").notNull().default(0),
  totalGrossEarningsSek: numeric("total_gross_earnings_sek", {
    precision: 12,
    scale: 2,
  }).notNull().default("0"),
  exceededJobThreshold: boolean("exceeded_job_threshold").notNull().default(false),
  exceededEarningsThreshold: boolean("exceeded_earnings_threshold").notNull().default(false),
  reportedToSkatteverket: boolean("reported_to_skatteverket").notNull().default(false),
  reportedAt: timestamp("reported_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Dac7Report = typeof dac7ReportsTable.$inferSelect;

// ─── Pricing Configuration ───────────────────────────────────────────────────

/**
 * Multi-city pricing configuration
 * Each city can have different base prices and platform fee percentages
 */
export const pricingConfigTable = pgTable("pricing_config", {
  id: serial("id").primaryKey(),
  city: text("city").notNull().unique(),
  basePriceMin: numeric("base_price_min", { precision: 10, scale: 2 }).notNull(),
  basePriceMax: numeric("base_price_max", { precision: 10, scale: 2 }).notNull(),
  platformFeePercentage: numeric("platform_fee_percentage", {
    precision: 5,
    scale: 2,
  }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PricingConfig = typeof pricingConfigTable.$inferSelect;
