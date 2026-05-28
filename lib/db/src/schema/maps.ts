import { pgTable, serial, varchar, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const mapsApiCallsTable = pgTable("maps_api_calls", {
  id: serial("id").primaryKey(),
  yearMonth: varchar("year_month", { length: 7 }).notNull(),
  callType: varchar("call_type", { length: 50 }).notNull(),
  callCount: integer("call_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  monthTypeUniq: unique("maps_api_calls_month_type_uniq").on(table.yearMonth, table.callType),
}));

export type MapsApiCall = typeof mapsApiCallsTable.$inferSelect;
