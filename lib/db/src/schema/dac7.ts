import { pgTable, serial, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// ⚖️ DAC7 EU directive — annual carrier earnings report for Skatteverket
export const dac7ReportsTable = pgTable("dac7_reports", {
  id: serial("id").primaryKey(),
  carrierId: integer("carrier_id").notNull().references(() => usersTable.id),
  year: integer("year").notNull(),
  totalJobs: integer("total_jobs").notNull().default(0),
  totalGrossEarnings: numeric("total_gross_earnings", { precision: 10, scale: 2 }).notNull().default("0"),
  totalPlatformFees: numeric("total_platform_fees", { precision: 10, scale: 2 }).notNull().default("0"),
  totalNetPaid: numeric("total_net_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  reportedToSkatteverket: boolean("reported_to_skatteverket").notNull().default(false),
  reportDate: timestamp("report_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Dac7Report = typeof dac7ReportsTable.$inferSelect;
