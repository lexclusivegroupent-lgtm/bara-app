import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const waitlistTable = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  // "customer" (default) = general launch waitlist signup.
  // "partner_interest" = a transport company asking to become a partner —
  // captured from the register screen's lightweight interest form instead
  // of self-serve individual driver signup. Admin follows up manually.
  type: text("type").notNull().default("customer"),
  companyName: text("company_name"),
  phone: text("phone"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
