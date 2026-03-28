import { pgTable, serial, text, boolean, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().$type<"customer" | "driver" | "both">(),
  city: text("city").notNull(),
  profilePhoto: text("profile_photo"),
  isAvailable: boolean("is_available").notNull().default(true),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  totalJobs: integer("total_jobs").notNull().default(0),
  vehicleDescription: text("vehicle_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
