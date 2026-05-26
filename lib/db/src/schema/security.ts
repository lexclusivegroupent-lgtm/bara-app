import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SecurityEventType =
  | "auth_failure"
  | "rate_limit_hit"
  | "admin_action"
  | "token_reuse_detected"
  | "suspicious_activity";

// ─── Refresh tokens ───────────────────────────────────────────────────────────

/**
 * Single-use refresh tokens with rotation.
 * If a `used = true` row is presented again, all tokens for that user are
 * revoked — this indicates the refresh token was stolen after a prior rotation.
 */
export const refreshTokensTable = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Security audit log ──────────────────────────────────────────────────────

/**
 * Append-only audit log for security-critical events.
 * Never update or delete rows — add a compensating event instead.
 */
export const securityLogsTable = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull().$type<SecurityEventType>(),
  ipAddress: text("ip_address"),
  userId: integer("user_id").references(() => usersTable.id),
  email: text("email"),
  endpoint: text("endpoint"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Type helpers ─────────────────────────────────────────────────────────────

export type RefreshToken = typeof refreshTokensTable.$inferSelect;
export type SecurityLog = typeof securityLogsTable.$inferSelect;
export type NewSecurityLog = typeof securityLogsTable.$inferInsert;
