import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const appealsTable = pgTable("appeals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(),
  explanation: text("explanation").notNull(),
  supportingInfo: text("supporting_info"),
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("pending").$type<"pending" | "reviewed" | "approved" | "rejected">(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export type Appeal = typeof appealsTable.$inferSelect;
export type InsertAppeal = typeof appealsTable.$inferInsert;
